"""Inti parser Simple-CBT. Dihasilkan dari notebook SimpleCBT_Bulk_Import_v2_DryRun.ipynb.
Jika logika parser diubah, ubah di notebook lalu hasilkan ulang, atau edit file ini langsung dan samakan keduanya.

BACAAN (wacana) dikaitkan ke soal lewat RENTANG NOMOR SOAL, bukan urutan baris:
  Word : [BACAAN 1-5] ... isi bacaan ... [SELESAI BACAAN]      (boleh di mana saja dalam [MULAI SOAL]..[SELESAI])
  Excel: baris Jenis = BACAAN, kolom No = "1-5", kolom Soal = isi bacaan
  Format lama tetap jalan: [DESKRIPSI] ... [SELESAI DESKRIPSI] (Word) dan baris BACAAN tanpa No (Excel)
  berlaku untuk soal-soal berikutnya sampai bacaan berikutnya / penutup."""

import re, os, io, json, glob, shutil, zipfile, uuid, difflib, base64, tempfile, datetime
from docx import Document
from docx.oxml.ns import qn
from openpyxl import load_workbook
from docx.text.paragraph import Paragraph
from docx.table import Table

_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
_VML = "urn:schemas-microsoft-com:vml"

RE_SOAL  = re.compile(r"^\s*(\d+)[\.\)]\s+(.*)")
RE_OPSI  = re.compile(r"^\s*([A-E])[\.\)]\s+(.*)")
RE_KUNCI = re.compile(r"^\s*(?:kunci|jawaban)\s*:\s*(.*)$", re.I)   # grup 1 = seluruh isi kunci, mis. "B" atau "A, C"
RE_MULAI   = re.compile(r"^\[MULAI SOAL\]$", re.I)
RE_SELESAI = re.compile(r"^\[SELESAI\]$", re.I)

# [BACAAN 1-5] / [BACAAN 7] / [BACAAN] (tanpa rentang = format berurutan lama)
RE_BACAAN_AWAL = re.compile(r"^\[BACAAN(?:\s+(.+?))?\]$", re.I)
RE_RENTANG = re.compile(r"^\s*(\d+)\s*(?:[-–—]|s/d|sd|sampai|hingga)\s*(\d+)\s*$", re.I)
RE_ANGKA   = re.compile(r"^\s*(\d+)(?:\.0+)?\s*$")
MAKS_RENTANG = 500   # batas wajar jumlah soal dalam satu bacaan (cegah salah ketik 1-99999)

PENUTUP_BACAAN = ("[SELESAI BACAAN]", "[BACAAN SELESAI]", "[SELESAI DESKRIPSI]", "[DESKRIPSI SELESAI]")
PENUTUP_LAIN = ("[SELESAI PG]", "[PG SELESAI]",
                "[SELESAI ESAI]", "[ESAI SELESAI]", "[SELESAI ESSAY]", "[ESSAY SELESAI]")


RE_PISAH_KUNCI = re.compile(r"[\s,;/&+]+|\bdan\b", re.I)

def huruf_kunci(raw):
    """Huruf kunci dari teks, urut & tanpa duplikat.
    'B' -> ['B'];  'A, C' / 'A,C' / 'A dan C' / 'A & C' / 'AC' -> ['A', 'C'];
    'B. Jakarta' -> ['B'] (diawali 'B.' / 'B)'); selain itu []."""
    s = str(raw or "").strip()
    if not s:
        return []
    token = [t.rstrip(".)") for t in RE_PISAH_KUNCI.split(s) if t and t.strip()]
    if token and all(re.fullmatch(r"[A-Ea-e]+", t) for t in token):
        return sorted({c.upper() for t in token for c in t})
    if m := re.match(r"^([A-Ea-e])[\.\)]\s", s + " "):
        return [m[1].upper()]
    return []

def kunci_ke_teks(huruf):
    """['A','C'] -> 'A,C'; kosong -> None."""
    return ",".join(huruf) if huruf else None

def kunci_ganda(kunci):
    """'A,C' -> ['A','C']; 'B' -> ['B']; None -> []."""
    return [k for k in str(kunci or "").split(",") if k]


def parse_rentang(raw):
    """'1-5' -> (1, 5); '3' atau 3 -> (3, 3); kosong / tidak valid -> None."""
    if raw is None:
        return None
    if isinstance(raw, (int, float)) and not isinstance(raw, bool):
        return (int(raw), int(raw)) if raw == int(raw) else None
    s = str(raw).strip()
    if m := RE_RENTANG.match(s):
        return int(m[1]), int(m[2])
    if m := RE_ANGKA.match(s):
        return int(m[1]), int(m[1])
    return None


class _Bacaan:
    """Penampung bacaan, dipakai bersama oleh parse_docx_ex dan parse_xlsx_ex."""
    def __init__(self):
        self.daftar, self.terbuka, self.n = [], None, 0

    def tambah(self, rentang, mentah, teks, rumus, gambar, posisi):
        """rentang & mentah sama-sama None = bacaan berurutan (format lama)."""
        berurutan = rentang is None and mentah is None
        if berurutan:
            if self.terbuka is not None:             # bacaan berurutan baru menutup yang lama
                self.terbuka["posisi_akhir"] = posisi
                self.terbuka = None
            if not teks and not gambar:              # bacaan berurutan kosong = penutup
                return None
        self.n += 1
        rec = {"id": f"B{self.n}", "urutan": self.n,
               "mulai": rentang[0] if rentang else None,
               "akhir": rentang[1] if rentang else None,
               "rentang_mentah": mentah, "teks": teks, "rumus": rumus, "gambar": gambar,
               "berurutan": berurutan, "posisi_mulai": posisi, "posisi_akhir": None}
        self.daftar.append(rec)
        if berurutan:
            self.terbuka = rec
        return rec

    def selesai(self, soal_list, warnings):
        """Ubah bacaan berurutan menjadi rentang nomor. Hasil: daftar bacaan final."""
        hasil = []
        for b in self.daftar:
            if b["berurutan"]:
                awal = b["posisi_mulai"]
                akhir = b["posisi_akhir"] if b["posisi_akhir"] is not None else len(soal_list)
                if awal >= akhir:
                    warnings.append("Ada bacaan yang tidak diikuti soal.")
                    continue
                b["mulai"], b["akhir"] = soal_list[awal]["no"], soal_list[akhir - 1]["no"]
            hasil.append(b)
        return hasil


def pasang_bacaan(soal_list, bacaan):
    """Hubungkan tiap bacaan ke soal yang nomornya ada di dalam rentang (bukan berdasarkan urutan baris).
    Setiap soal mendapat bacaan_id + salinan isi bacaan; soal pertama dalam grup ditandai bacaan_pertama."""
    for s in soal_list:
        s.update({"bacaan_id": None, "deskripsi": None, "deskripsi_rumus": [],
                  "deskripsi_gambar": [], "terkait_deskripsi": False, "bacaan_pertama": False})
    for b in bacaan:
        if b["mulai"] is None or b["akhir"] is None or b["mulai"] > b["akhir"]:
            continue
        anggota = [s for s in soal_list if b["mulai"] <= s["no"] <= b["akhir"] and s["bacaan_id"] is None]
        for i, s in enumerate(anggota):              # soal yang sudah punya bacaan (tumpang tindih) tidak ditimpa
            s["bacaan_id"] = b["id"]
            s["deskripsi"] = b["teks"] or None
            s["deskripsi_rumus"] = list(b["rumus"])
            s["deskripsi_gambar"] = list(b["gambar"])
            s["terkait_deskripsi"] = True
            s["bacaan_pertama"] = (i == 0)


def semua_paragraf(doc):
    """Paragraf dalam urutan dokumen, termasuk yang ada di dalam tabel."""
    def dari(elm, parent, seen):
        for ch in elm.iterchildren():
            if ch.tag == qn("w:p"):
                yield Paragraph(ch, parent)
            elif ch.tag == qn("w:tbl"):
                for row in Table(ch, parent).rows:
                    for cell in row.cells:
                        if id(cell._tc) in seen: continue      # sel gabungan muncul berulang
                        seen.add(id(cell._tc))
                        yield from dari(cell._tc, cell, seen)
    yield from dari(doc.element.body, doc, set())

def id_gambar(p_elm):
    """ID relasi gambar: DrawingML (a:blip) dan VML lama (v:imagedata)."""
    ids = list(p_elm.xpath(".//a:blip/@r:embed"))
    ids += [e.get("{%s}id" % _R) for e in p_elm.iter("{%s}imagedata" % _VML) if e.get("{%s}id" % _R)]
    return ids

def teks_dan_rumus(p):
    """Teks paragraf. Enter lunak (Shift+Enter) jadi baris baru; rumus (OMML) jadi {{rumusN}}."""
    parts, maths = [], []
    for ch in p._p.iterchildren():
        if ch.tag == qn("w:r"):
            for x in ch:
                if x.tag == qn("w:t"): parts.append(x.text or "")
                elif x.tag in (qn("w:br"), qn("w:cr")): parts.append("\n")
                elif x.tag == qn("w:tab"): parts.append(" ")
        elif ch.tag in (qn("m:oMath"), qn("m:oMathPara")):
            maths.append("".join(t.text or "" for t in ch.iter(qn("m:t"))))
            parts.append("{{rumus%d}}" % len(maths))
    return "".join(parts), maths

def _simpan_blob(doc, rid, img_dir, nama_dasar):
    part = doc.part.related_parts[rid]
    ext = os.path.splitext(str(part.partname))[1] or ".png"
    fname = f"{nama_dasar}{ext}"
    with open(os.path.join(img_dir, fname), "wb") as f:
        f.write(part.blob)
    return fname


def parse_docx_ex(path, img_dir):
    """
    Membaca DOCX dengan section [PG], [ESAI], dan bacaan:
      [BACAAN 1-5] ... [SELESAI BACAAN]   -> bacaan untuk soal nomor 1 sampai 5
      [DESKRIPSI] ... [SELESAI DESKRIPSI] -> format lama (berlaku untuk soal-soal berikutnya)
    Format lama tanpa section tetap dibaca sebagai PG.
    Hasil: (soal_list, warnings, bacaan)
    """
    doc = Document(path)
    os.makedirs(img_dir, exist_ok=True)

    soal_list, warnings = [], []
    kb = _Bacaan()
    cur = None
    aktif = False
    ada_penanda = False
    section = None        # jenis soal aktif: PG | ESAI | None
    buf = None            # bacaan yang sedang dibaca
    n_bacaan = 0          # penomoran nama file gambar bacaan

    def simpan_soal():
        nonlocal cur
        if cur is not None:
            soal_list.append(cur)
            cur = None

    def pakai_rumus(teks, maths, target):
        def ganti(m):
            k = int(m[1]) - 1
            if k < 0 or k >= len(maths):
                return m[0]
            target.setdefault("rumus", []).append(maths[k])
            return "{{rumus%d}}" % len(target["rumus"])
        return re.sub(r"\{\{rumus(\d+)\}\}", ganti, teks)

    def buka_bacaan(arg):
        nonlocal buf, n_bacaan
        n_bacaan += 1
        arg = (arg or "").strip()
        buf = {"no": n_bacaan, "rentang": parse_rentang(arg) if arg else None, "mentah": arg or None,
               "teks": [], "rumus": [], "gambar": [], "posisi": len(soal_list)}

    def tutup_bacaan(paksa=False):
        nonlocal buf
        if buf is None:
            return
        b, buf = buf, None
        if paksa:
            warnings.append(f"Bacaan {b['mentah'] or '(berurutan)'}: tidak ditutup dengan [SELESAI BACAAN].")
        kb.tambah(b["rentang"], b["mentah"], "\n".join(b["teks"]).strip(), b["rumus"], b["gambar"], b["posisi"])

    for p in semua_paragraf(doc):
        teks, maths = teks_dan_rumus(p)
        pPr = p._p.pPr
        if aktif and teks.strip() and pPr is not None and pPr.numPr is not None:
            warnings.append(
                f"'{teks.strip()[:30]}...' memakai penomoran otomatis Word; nomor/huruf tidak terbaca."
            )

        for raw_line in teks.split("\n"):
            line = raw_line.strip()
            if not line:
                continue

            upper = line.upper()

            if RE_MULAI.match(line):
                simpan_soal(); tutup_bacaan(True)
                aktif, ada_penanda, section = True, True, None
                continue

            if upper in ("[SELESAI]", "[SELESAI SOAL]"):
                simpan_soal(); tutup_bacaan(True)
                aktif, section = False, None
                continue

            if not aktif:
                continue

            # penutup bacaan dicek lebih dulu supaya "[BACAAN SELESAI]" tidak terbaca sebagai pembuka
            if upper in PENUTUP_BACAAN:
                if buf is None:
                    warnings.append(f"'{line}' tanpa pembuka [BACAAN ...]; diabaikan.")
                else:
                    tutup_bacaan()
                continue

            m_b = RE_BACAAN_AWAL.match(line)
            if m_b or upper == "[DESKRIPSI]":
                simpan_soal(); tutup_bacaan(True)
                buka_bacaan(m_b[1] if m_b else None)
                continue

            if upper in ("[PG]", "[ESAI]", "[ESSAY]"):
                simpan_soal(); tutup_bacaan(True)
                section = "PG" if upper == "[PG]" else "ESAI"
                continue

            if upper in PENUTUP_LAIN:
                simpan_soal(); tutup_bacaan(True)
                section = None
                continue

            if buf is not None:                       # isi bacaan
                buf["teks"].append(pakai_rumus(line, maths, {"rumus": buf["rumus"]}))
                continue

            m = RE_SOAL.match(line)
            if m:
                simpan_soal()
                jenis = section if section in ("PG", "ESAI") else "PG"
                cur = {"no": int(m[1]), "jenis": jenis, "soal": "", "opsi": {}, "kunci": None,
                       "gambar": [], "rumus": []}
                cur["soal"] = pakai_rumus(m[2], maths, cur)
                continue

            if cur is not None:
                if cur["jenis"] in ("PG", "PGK") and (mo := RE_OPSI.match(line)):
                    cur["opsi"][mo[1]] = pakai_rumus(mo[2], maths, cur)
                elif cur["jenis"] in ("PG", "PGK") and (mk := RE_KUNCI.match(line)):
                    huruf = huruf_kunci(mk[1])
                    cur["kunci"] = kunci_ke_teks(huruf)
                    cur["jenis"] = "PGK" if len(huruf) > 1 else "PG"     # kunci lebih dari satu = pilihan ganda kompleks
                elif cur["jenis"] == "ESAI" and RE_KUNCI.match(line):
                    warnings.append(f"No {cur['no']}: kunci pada soal esai diabaikan.")
                else:
                    cur["soal"] += ("\n" if cur["soal"] else "") + pakai_rumus(line, maths, cur)
            else:
                warnings.append(f"Konten di luar soal diabaikan: '{line[:40]}'")

        # Gambar pada paragraf masuk ke bacaan atau soal yang sedang aktif.
        image_ids = id_gambar(p._p)
        if image_ids:
            if buf is not None:
                for rid in image_ids:
                    buf["gambar"].append(_simpan_blob(doc, rid, img_dir, f"bacaan{buf['no']}_{len(buf['gambar'])+1}"))
            elif cur is not None:
                for rid in image_ids:
                    cur["gambar"].append(_simpan_blob(doc, rid, img_dir, f"soal{cur['no']}_{len(cur['gambar'])+1}"))

    simpan_soal()
    tutup_bacaan(True)

    if not ada_penanda:
        warnings.append("Penanda [MULAI SOAL] tidak ditemukan; gunakan Template_Soal_SimpleCBT.docx.")

    bacaan = kb.selesai(soal_list, warnings)
    pasang_bacaan(soal_list, bacaan)
    return soal_list, warnings, bacaan


def parse_docx(path, img_dir):
    """Kompatibel dengan versi lama: hanya (soal_list, warnings). Pakai parse_docx_ex untuk daftar bacaan."""
    soal, warn, _ = parse_docx_ex(path, img_dir)
    return soal, warn

def _n(t):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", str(t).lower())).strip()

def cari_header(ws, maks_baris=30):
    """Cari baris judul kolom (No / Jenis / Kunci / Soal / A-E / Gambar) -> (baris, {nama: kolom})."""
    for r in range(1, min(ws.max_row, maks_baris) + 1):
        peta = {}
        for c in ws[r]:
            if c.value in (None, ""): continue
            t = _n(c.value)
            if t in ("no", "nomor", "no soal"): peta["no"] = c.column
            elif t in ("jenis", "jenis soal", "tipe", "tipe soal"): peta["jenis"] = c.column
            elif t in ("soal", "pertanyaan"):   peta["soal"] = c.column
            elif "kunci" in t or t in ("jawaban", "jawaban benar"): peta["kunci"] = c.column
            elif t.startswith("gambar"):        peta["gambar"] = c.column
            elif t in ("a", "b", "c", "d", "e"): peta[t.upper()] = c.column
        if "soal" in peta and "kunci" in peta and sum(k in peta for k in "ABCD") >= 2:
            return r, peta
    return None, None


# Nilai kolom Jenis -> nama internal (sama dengan parse_docx: "PG", "ESAI"; plus "BACAAN")
JENIS_XLSX = {
    "PG": "PG", "PILIHAN GANDA": "PG",
    "PGK": "PGK", "PG KOMPLEKS": "PGK", "PILIHAN GANDA KOMPLEKS": "PGK", "MULTIPLE ANSWER": "PGK",
    "ESSAI": "ESAI", "ESAI": "ESAI", "ESSAY": "ESAI",
    "BACAAN": "BACAAN", "WACANA": "BACAAN", "DESKRIPSI": "BACAAN",
}

def normalisasi_jenis(raw):
    """Kosong -> PG (format Excel lama). Nilai tak dikenal dikembalikan apa adanya (huruf besar)
    supaya validasi() menandainya sebagai error."""
    if raw in (None, ""): return "PG"
    s = re.sub(r"\s+", " ", str(raw)).strip().upper()
    return JENIS_XLSX.get(s, s)

def cari_sheet_soal(wb):
    for ws in wb.worksheets:
        if ws.title.strip().lower() == "soal": return ws
    for ws in wb.worksheets:
        if cari_header(ws)[0]: return ws
    return wb.active

def baca_identitas_xlsx(ws, header_row):
    """Blok identitas di atas tabel: guru, kelas, mapel, jenis ujian, durasi + judul (jenis, tahun ajaran, semester)."""
    info, judul = {}, None
    for r in range(1, header_row):
        for c in ws[r]:
            if c.value in (None, ""): continue
            t = str(c.value).strip(); tn = _n(t)
            if   re.search(r"\b(guru|pengampu)\b", tn):        kunci = "guru"
            elif re.match(r"(soal )?kelas\b", tn):             kunci = "kelas"
            elif re.search(r"mata pelajaran|\bmapel\b", tn):   kunci = "mapel"
            elif re.match(r"jenis\b", tn):                     kunci = "jenis"
            elif re.search(r"\bdurasi\b", tn):                 kunci = "durasi"
            else:
                if judul is None and len(tn) > 10: judul = t
                continue
            val = t.split(":", 1)[1].strip() if ":" in t else ""
            if not val:                                         # nilai di sel sebelah kanan
                for c2 in ws[r]:
                    if c2.column > c.column and c2.value not in (None, ""): val = str(c2.value).strip(); break
            if kunci == "durasi":
                m = re.search(r"\d+", val); val = m[0] if m else ""
            if val and val not in ("-", "...", "…"): info[kunci] = val
    if judul:
        info["judul"] = judul
        if m := re.search(r"(\d{4})\s*[-/]\s*(\d{4})", judul): info["tahun_ajaran"] = f"{m[1]}-{m[2]}"
        if m := re.search(r"\b(ganjil|genap)\b", judul, re.I): info["semester"] = m[1].capitalize()
        info.setdefault("jenis", judul)      # jenis ujian dari judul bila tidak diisi eksplisit
    return info

def normalisasi_kunci(raw, opsi):
    """Terima 'B', 'b', 'B.', 'B. Jakarta', atau teks jawaban yang sama dengan salah satu opsi."""
    if raw is None or str(raw).strip() == "": return None
    s = str(raw).strip()
    if len(huruf := huruf_kunci(s)) > 1: return ",".join(huruf)      # kunci ganda: 'A, C' -> 'A,C'
    if m := re.fullmatch(r"([A-Ea-e])[\.\)]?", s): return m[1].upper()
    if m := re.match(r"^([A-Ea-e])[\.\)]\s+\S", s): return m[1].upper()
    if _n(s):
        cocok = [k for k, v in opsi.items() if _n(v) == _n(s)]
        if len(cocok) == 1: return cocok[0]
    return s                                    # biarkan apa adanya; validasi akan menandai

def cari_file_gambar(nama, folder):
    """Cari file gambar (tanpa peduli huruf besar/kecil) di folder file soal, atau subfolder gambar/images."""
    for d in (folder, os.path.join(folder, "gambar"), os.path.join(folder, "images"),
              os.path.join(folder, "Gambar"), os.path.join(folder, "Images")):
        if os.path.isdir(d):
            for f in os.listdir(d):
                if f.lower() == nama.strip().strip('"').lower(): return os.path.join(d, f)
    return None

def parse_xlsx_ex(path, img_dir):
    """
    Kolom 'Jenis' (opsional): PG | ESSAI | BACAAN.
      - tanpa kolom Jenis / sel kosong  -> PG (kompatibel dengan format lama)
      - BACAAN: teks di kolom Soal adalah isi bacaan, BUKAN soal.
          * kolom No berisi rentang ("1-5", "7") -> bacaan untuk soal dengan nomor tersebut,
            letak barisnya bebas (boleh di atas, di tengah, atau di bawah).
          * kolom No kosong -> format lama: berlaku untuk soal-soal berikutnya sampai ada BACAAN baru
            atau baris BACAAN kosong (penutup).
      - ESSAI : tanpa opsi dan tanpa kunci.
    Hasil: (soal_list, warnings, bacaan)
    """
    wb = load_workbook(path)
    ws = cari_sheet_soal(wb)
    hr, kol = cari_header(ws)
    warnings = []
    if not hr:
        hr, kol = 1, {"no": 1, "soal": 2, "A": 3, "B": 4, "C": 5, "D": 6, "E": 7, "kunci": 8}
        warnings.append("Judul kolom tidak dikenali; memakai urutan bawaan (No, Soal, A-E, Kunci).")
    os.makedirs(img_dir, exist_ok=True)

    img_by_row = {}
    for img in ws._images:
        img_by_row.setdefault(img.anchor._from.row + 1, []).append((img._data(), (img.format or "png").lower()))

    def ambil_gambar(r, nama_fn, label):
        """Gambar tempel di baris + gambar lewat kolom nama file."""
        hasil = []
        for blob, ext in img_by_row.get(r, []):
            fname = nama_fn(len(hasil) + 1, "." + ext)
            with open(os.path.join(img_dir, fname), "wb") as f: f.write(blob)
            hasil.append(fname)
        if "gambar" in kol:
            v = ws.cell(r, kol["gambar"]).value
            if v not in (None, ""):
                for nama in [x for x in re.split(r"[;,\n]", str(v)) if x.strip()]:
                    src = cari_file_gambar(nama, os.path.dirname(path))
                    if not src:
                        warnings.append(f"{label}: gambar '{nama.strip()}' tidak ditemukan di folder yang sama"); continue
                    fname = nama_fn(len(hasil) + 1, os.path.splitext(src)[1].lower())
                    shutil.copyfile(src, os.path.join(img_dir, fname)); hasil.append(fname)
        return hasil

    out = []
    kb = _Bacaan()

    for r in range(hr + 1, min(ws.max_row, hr + 2000) + 1):
        g = lambda k: ws.cell(r, kol[k]).value if k in kol else None
        jenis = normalisasi_jenis(g("jenis"))
        teks = "" if g("soal") is None else str(g("soal")).strip()

        # ---------- BACAAN: bukan soal ----------
        if jenis == "BACAAN":
            gambar_b = ambil_gambar(r, lambda i, e, _r=r: f"bacaan_baris{_r}_{i}{e}", f"Baris {r} (BACAAN)")
            raw_no = g("no")
            mentah = None if raw_no in (None, "") else str(raw_no).strip()
            rentang = parse_rentang(raw_no) if mentah else None
            if mentah and rentang is None and isinstance(raw_no, (datetime.date, datetime.datetime)):
                warnings.append(f"Baris {r} (BACAAN): kolom No terbaca Excel sebagai tanggal ('{mentah}'). "
                                f"Ubah format sel kolom No menjadi Teks, lalu ketik ulang rentangnya (mis. 1-5).")
            kb.tambah(rentang, mentah, teks, re.findall(r"\$([^$]+)\$", teks), gambar_b, len(out))
            continue

        if not teks: continue                       # baris kosong diabaikan

        # ---------- PG / ESAI ----------
        try:    no = int(g("no"))
        except (TypeError, ValueError): no = len(out) + 1

        if jenis == "ESAI":
            opsi, kunci = {}, None
            if g("kunci") not in (None, ""):
                warnings.append(f"No {no}: kunci pada soal esai diabaikan.")
            if any(g(k) not in (None, "") for k in "ABCDE"):
                warnings.append(f"No {no}: opsi pada soal esai diabaikan.")
            teks_semua = teks
        else:   # PG (jenis tak dikenal juga lewat sini; validasi() yang menandai errornya)
            opsi  = {k: str(g(k)).strip() for k in "ABCDE" if g(k) not in (None, "")}
            kunci = normalisasi_kunci(g("kunci"), opsi)
            if jenis == "PG" and kunci and "," in kunci:
                jenis = "PGK"                       # PG dengan kunci lebih dari satu = pilihan ganda kompleks
            teks_semua = teks + " " + " ".join(opsi.values())

        gambar = ambil_gambar(r, lambda i, e, _no=no: f"soal{_no}_{i}{e}", f"No {no}")

        out.append({
            "no": no, "jenis": jenis, "soal": teks, "opsi": opsi, "kunci": kunci,
            "gambar": gambar, "rumus": re.findall(r"\$([^$]+)\$", teks_semua),   # rumus ditulis $...$
        })

    bacaan = kb.selesai(out, warnings)
    pasang_bacaan(out, bacaan)
    return out, warnings, bacaan


def parse_xlsx(path, img_dir):
    """Kompatibel dengan versi lama: hanya (soal_list, warnings). Pakai parse_xlsx_ex untuk daftar bacaan."""
    soal, warn, _ = parse_xlsx_ex(path, img_dir)
    return soal, warn


def _ringkas_nomor(nomor, maks=10):
    s = ", ".join(map(str, nomor[:maks]))
    return s + (" ..." if len(nomor) > maks else "")

def validasi_bacaan(soal_list, bacaan):
    """Periksa rentang bacaan: format, nomor soal yang tidak ada, tumpang tindih, isi kosong."""
    errs, valid = [], []
    nomor = {s["no"] for s in soal_list}
    for b in bacaan:
        label = "Bacaan " + (b.get("rentang_mentah") or f"{b['mulai']}-{b['akhir']}")
        if b["mulai"] is None or b["akhir"] is None:
            errs.append(f"{label}: rentang nomor tidak valid (tulis seperti 1-5)")
            continue
        if b["mulai"] > b["akhir"]:
            errs.append(f"{label}: rentang terbalik (awal lebih besar dari akhir)")
            continue
        if b["akhir"] - b["mulai"] + 1 > MAKS_RENTANG:
            errs.append(f"{label}: rentang terlalu besar (maksimal {MAKS_RENTANG} soal)")
            continue
        if not (b.get("teks") or "").strip() and not b.get("gambar"):
            errs.append(f"{label}: isi bacaan kosong")
        hilang = [n for n in range(b["mulai"], b["akhir"] + 1) if n not in nomor]
        if hilang:
            errs.append(f"{label}: nomor soal {_ringkas_nomor(hilang)} tidak ditemukan")
        valid.append((b["mulai"], b["akhir"], label))
    valid.sort()
    for i in range(len(valid)):
        for j in range(i + 1, len(valid)):
            a, c = valid[i], valid[j]
            if c[0] > a[1]:
                break                                  # terurut: sisanya pasti tidak beririsan dengan a
            errs.append(f"{a[2]} dan {c[2]}: rentang tumpang tindih (nomor {c[0]}-{min(a[1], c[1])})")
    return errs

def validasi(soal_list, bacaan=None):
    """Validasi berbeda untuk PG dan ESAI; bacaan divalidasi lewat rentangnya (bukan item soal)."""
    errs, seen = [], set()
    for s in soal_list:
        n = s["no"]
        jenis = str(s.get("jenis", "PG")).upper()

        if n in seen:
            errs.append(f"No {n}: nomor duplikat")
        seen.add(n)

        if jenis not in ("PG", "PGK", "ESAI"):
            errs.append(f"No {n}: jenis soal '{jenis}' tidak dikenali")
            continue

        if not str(s.get("soal") or "").strip():
            errs.append(f"No {n}: teks soal kosong")

        if jenis in ("PG", "PGK"):
            opsi = s.get("opsi") or {}
            kunci = s.get("kunci")
            if len(opsi) < 2:
                errs.append(f"No {n}: opsi kurang dari 2")
            if not kunci:
                errs.append(f"No {n}: kunci jawaban belum diisi")
            elif jenis == "PGK":
                huruf = kunci_ganda(kunci)
                if len(huruf) < 2:
                    errs.append(f"No {n}: soal PGK butuh minimal 2 kunci")
                errs += [f"No {n}: kunci '{h}' tidak ada di opsi" for h in huruf if h not in opsi]
            elif kunci not in opsi:
                errs.append(f"No {n}: kunci '{kunci}' tidak ada di opsi")
        elif jenis == "ESAI":
            # Esai tidak memerlukan opsi maupun kunci jawaban.
            continue

    errs += validasi_bacaan(soal_list, bacaan or [])
    return errs



import difflib, uuid

# ---- Nilai enum DB: SESUAIKAN dengan isi enum di Supabase ----
ENUM = {
    "question_type": "MULTIPLE_CHOICE",
    "question_type_esai": "ESSAY",   # SESUAIKAN dengan label enum question_type untuk esai di Supabase
    "question_type_pgk":  "MULTIPLE_ANSWER",   # pilihan ganda kompleks; tambahkan ke enum: alter type question_type add value 'MULTIPLE_ANSWER';
    "exam_status":   "DRAFT",
    "import_status": "PENDING",
    "file_type_doc": {"docx": "DOCX", "xlsx": "XLSX"},
    "file_type_img": "IMAGE",
    "exam_type": {
        "PAS": "PAS",
        "UAS": "PAS",

        "PTS": "PTS",
        "UTS": "PTS",

        "ULANGAN HARIAN": "DAILY",
        "UH": "DAILY",
        "KUIS": "DAILY",
        "QUIZ": "DAILY",
        "DAILY": "DAILY",

        "LAINNYA": "OTHER",
        "OTHER": "OTHER"
    }
}
MODE_DB_BARU = False   # False = hanya kolom yang SUDAH ADA di DB; True = ikut kolom usulan (subject_id, review_level, dst.)

# ---- Kamus mapel (nantinya = tabel subjects + subject_aliases) ----
SUBJECT_ALIASES = {
    "Matematika":       ["matematika", "mtk", "mat", "math"],
    "Bahasa Indonesia": ["bahasa indonesia", "b indonesia", "bindo", "b indo", "bhs indonesia", "indonesia"],
    "Bahasa Inggris":   ["bahasa inggris", "b inggris", "bing", "bhs inggris", "english", "inggris"],
    "Informatika":      ["informatika", "tik"],
    "Bahasa Jepang":    ["bahasa jepang", "b jepang", "bjepang", "nihongo", "jepang"],
    "IPA":              ["ipa", "fisika", "kimia", "biologi"],
    "PKN":              ["pkn", "ppkn", "pancasila"],
    "PAI":              ["pai", "pendidikan agama", "agama"],
    "Sejarah":          ["sejarah", "sejarah indonesia"],
    "Seni Budaya":      ["seni budaya"],
    "PJOK":             ["pjok", "penjaskes", "olahraga"],
    "Bahasa Sunda":     ["bahasa sunda", "b sunda", "sunda"],
}
JURUSAN = {   # kode: [alias]. Ganti kode LOGISTIK / FARMASI dengan singkatan yang dipakai sekolah
    "DPIB":     ["dpib", "desain pemodelan dan informasi bangunan"],
    "AV":       ["av", "teknik audio video", "audio video"],
    "GP":       ["gp", "geologi pertambangan"],
    "TITL":     ["titl", "teknik instalasi tenaga listrik"],
    "OTOMOTIF": ["otomotif", "tkr", "teknik kendaraan ringan"],
    "DKV":      ["dkv", "desain komunikasi visual"],
    "BC":       ["bc", "broadcasting", "penyiaran"],
    "ELIN":     ["elin", "elektronika industri"],
    "LOGISTIK": ["logistik", "teknik industri logistik"],
    "FARMASI":  ["farmasi", "farmasi industri"],
}
SUBJECT_KATEGORI = {"Matematika": "UMUM", "Bahasa Indonesia": "UMUM", "Bahasa Inggris": "UMUM", "Bahasa Jepang": "UMUM",
                    "Informatika": "UMUM", "PKN": "UMUM", "PAI": "UMUM", "Sejarah": "UMUM", "Seni Budaya": "UMUM",
                    "PJOK": "UMUM", "Bahasa Sunda": "UMUM", "IPA": "UMUM"}   # selain ini dianggap kejuruan / belum dikategorikan
JENIS_ALIASES = {
    "PAS":  ["pas", "uas", "asas", "penilaian akhir semester", "ujian akhir semester", "asesmen sumatif akhir semester"],
    "PTS":  ["pts", "uts", "asts", "penilaian tengah semester", "ujian tengah semester", "asesmen sumatif tengah semester"],
    "KUIS": ["kuis", "quiz", "ulangan harian", "uh"],
}

def norm(t):
    return re.sub(r"\s+", " ", re.sub(r"[._\-/\\]+", " ", str(t).lower())).strip()

def deteksi_mapel(teks):
    t = " " + norm(teks) + " "
    best = None
    for nama, aliases in SUBJECT_ALIASES.items():
        for a in aliases:
            if f" {norm(a)} " in t and (best is None or len(a) > len(best[1])):
                best = (nama, a)
    if best: return best[0], 1.0
    flat = {norm(a): n for n, al in SUBJECT_ALIASES.items() for a in al if " " not in norm(a) and len(norm(a)) >= 4}
    for w in [w for w in norm(teks).split() if len(w) >= 4 and not w.isdigit()]:
        m = difflib.get_close_matches(w, list(flat), n=1, cutoff=0.8)
        if m: return flat[m[0]], 0.6          # mirip saja -> kuning
    return None, 0.0

def deteksi_kelas(teks):
    """Hasil: 'X DPIB 2' (jurusan spesifik) | 'X SEMUA' (mapel umum / folder Umum) | 'X' (tingkat saja)."""
    t = norm(teks)
    kode_tunggal = {norm(a): k for k, al in JURUSAN.items() for a in al if " " not in norm(a)}
    alt = "|".join(sorted(map(re.escape, kode_tunggal), key=len, reverse=True))
    m = re.search(rf"(?<![a-z0-9])(xii|xi|x)\s*({alt})\s*(\d)?(?![a-z0-9])", t)        # X-DPIB-2, XIotomotif1
    if m: return " ".join(p for p in (m[1].upper(), kode_tunggal[m[2]], m[3]) if p), 1.0
    tk = re.search(r"(?<![a-z0-9])(xii|xi|x)(?![a-z0-9])", t)
    if not tk: return None, 0.0
    tingkat = tk[1].upper()
    tt = " " + t + " "
    for kode, al in JURUSAN.items():                                                     # nama panjang jurusan
        if any(f" {norm(a)} " in tt for a in al): return f"{tingkat} {kode}", 1.0
    if " umum " in tt or " semua jurusan " in tt: return f"{tingkat} SEMUA", 1.0
    return tingkat, 0.6

def deteksi_jenis(teks):
    t = " " + norm(teks) + " "
    for nama, aliases in JENIS_ALIASES.items():
        if any(f" {norm(a)} " in t for a in aliases): return nama, 1.0
    return None, 0.0

# ================= PEMILIK UJIAN (GURU) =================
MODE_UPLOAD  = "POKJA"          # "POKJA" = upload atas nama guru lain | "GURU" = guru upload untuk dirinya sendiri
UUID_LOGIN   = "<UUID_AKUN_LOGIN>"   # akun yang sedang upload (POKJA atau guru) -> import_batches.uploaded_by

# Pengganti tabel users (nama -> id). Di aplikasi nyata ini diambil dari tabel users role guru.
DAFTAR_GURU = {
    "Budi Santoso, S.Pd.":  "<UUID Budi Santoso>",
    "Siti Aminah, M.Pd.":   "<UUID Siti Aminah>",
    "Budi Hartono, S.Kom.": "<UUID Budi Hartono>",
}
GELAR = {"drs","dra","dr","prof","pak","bu","bapak","ibu","s","m","pd","kom","t","si","e","spd","mpd","skom","mt","msi","gr","h","hj","se","st","ssi"}

def norm_nama(t):
    return " ".join(w for w in re.sub(r"[^\w\s]", " ", norm(t)).split() if w not in GELAR)

def deteksi_guru(rel, daftar, mentah=False):
    """Hasil: (nama, keyakinan, [peringatan]). 1.0 = nama lengkap cocok; 0.6 = mirip / hanya nama depan (kuning)."""
    bagian = [norm_nama(rel)] if mentah else [norm_nama(x) for x in os.path.splitext(rel)[0].replace("\\", "/").split("/")]
    kamus = {g: norm_nama(g) for g in daftar}
    for b in bagian:                                           # 1) nama lengkap sebagai potongan folder/nama file
        for g, n in kamus.items():
            if n and f" {n} " in f" {b} ": return g, 1.0, []
    for b in bagian:                                           # 2) mirip (salah ketik)
        if len(b) >= 5:
            m = difflib.get_close_matches(b, list(kamus.values()), n=1, cutoff=0.85)
            if m: return [g for g, n in kamus.items() if n == m[0]][0], 0.6, [f"guru: nama mirip '{m[0]}', mohon konfirmasi"]
    tokens = set(" ".join(bagian).split())                     # 3) hanya nama depan
    cocok = [g for g, n in kamus.items() if n and n.split()[0] in tokens]
    if len(cocok) == 1: return cocok[0], 0.6, [f"guru: hanya nama depan cocok ({cocok[0]}), mohon konfirmasi"]
    if len(cocok) > 1:  return None, 0.0, [f"guru: nama depan ambigu ({' / '.join(cocok)})"]
    return None, 0.0, []


def baca_info(path):
    """Blok [INFO] di Word, atau sheet 'Info' di Excel. Kosong kalau tidak ada."""
    info = {}
    if path.endswith(".docx"):
        aktif = False
        for p in Document(path).paragraphs:
            t = p.text.strip()
            if t.upper() == "[INFO]": aktif = True; continue
            if t.upper() == "[/INFO]": break
            if aktif and ":" in t:
                k, v = t.split(":", 1); info[k.strip().lower()] = v.strip()
    else:
        wb = load_workbook(path)
        if "Info" in wb.sheetnames:
            for r in wb["Info"].iter_rows(values_only=True):
                if r[0] and r[1] is not None: info[str(r[0]).strip().lower()] = str(r[1]).strip()
        ws = cari_sheet_soal(wb)                       # identitas di blok atas tabel (template sekolah)
        hr, _ = cari_header(ws)
        if hr:
            for k, v in baca_identitas_xlsx(ws, hr).items(): info.setdefault(k, v)
    return info

def deteksi_metadata(rel, info):
    teks = os.path.splitext(rel)[0]
    meta, warn = {}, []
    for f, fn in (("mapel", deteksi_mapel), ("kelas", deteksi_kelas), ("jenis", deteksi_jenis)):
        p_val, p_conf = fn(teks)
        i_val, _ = fn(info[f]) if info.get(f) else (None, 0)
        if info.get(f) and not i_val:
            warn.append(f"{f}: nilai di info '{info[f]}' tidak dikenali")
        if i_val:                                   # info di file menang atas nama file/folder
            meta[f] = {"nilai": i_val, "conf": 1.0, "sumber": "info"}
            if p_val and not (i_val.startswith(p_val) or p_val.startswith(i_val)): warn.append(f"{f}: info '{i_val}' beda dengan nama file/folder '{p_val}'")
        elif p_val: meta[f] = {"nilai": p_val, "conf": p_conf, "sumber": "path"}
        else:       meta[f] = {"nilai": None, "conf": 0.0, "sumber": None}
    return meta, warn

def tentukan_level(n_soal, errs, meta, warn):
    if n_soal == 0: return "RED"
    if errs or warn or any(m["conf"] < 0.9 for m in meta.values()): return "YELLOW"
    return "GREEN"

def to_rows(paket, meta, info, level, warn, job_id, uploaded_by="<UUID_AKUN_LOGIN>", owner=None):
    """paket = {"sumber": ..., "soal": [...], "bacaan": [...]}.
    Satu bacaan -> satu baris question_passages; setiap soal dalam rentangnya mendapat questions.passage_id."""
    exam_id, batch_id = str(uuid.uuid4()), str(uuid.uuid4())
    soal = paket["soal"]; bacaan = paket.get("bacaan") or []
    errs = validasi(soal, bacaan)
    gagal = {int(m[1]) for e in errs if (m := re.match(r"No (\d+):", e))}
    base = os.path.basename(paket["sumber"]); ext = os.path.splitext(base)[1][1:].lower()
    mp, kl, jn = (meta[k]["nilai"] for k in ("mapel", "kelas", "jenis"))
    judul = " - ".join(x for x in (mp, jn, kl) if x) or os.path.splitext(base)[0]
    dur = int(info["durasi"]) if str(info.get("durasi", "")).isdigit() else None

    exam = {"id": exam_id, "title": judul,
            "description": f"Mapel: {mp or '-'} ({SUBJECT_KATEGORI.get(mp, '-')}); Kelas: {kl or '-'}; TA: {info.get('tahun_ajaran', '-')} {info.get('semester', '')}; Sumber: {paket['sumber']}",
            "exam_type": ENUM["exam_type"].get(jn), "start_at": None, "end_at": None,
            "duration_minutes": dur, "status": ENUM["exam_status"], "created_by": owner or "<PILIH_GURU_PEMILIK>"}
    batch = {"id": batch_id, "exam_id": exam_id, "uploaded_by": uploaded_by, "file_name": base,
             "file_type": ENUM["file_type_doc"].get(ext), "storage_path": f"imports/{batch_id}/{base}",
             "status": ENUM["import_status"], "total_questions": len(soal),
             "success_count": len(soal) - len(gagal), "failed_count": len(gagal),
             "error_message": "; ".join(errs) or None}
    if MODE_DB_BARU:
        exam["subject_id"] = mp          # nanti diganti id dari tabel subjects
        batch.update({"job_id": job_id, "source_path": paket["sumber"], "detected": meta,
                      "warnings": warn, "review_level": level})
    rows = {
        "exams": [exam],
        "import_batches": [batch],
        "question_passages": [],
        "questions": [],
        "question_options": [],
        "question_files": []
    }

    # ---- bacaan: satu record per bacaan yang benar-benar punya soal ----
    dipakai = {s.get("bacaan_id") for s in soal if s.get("bacaan_id")}
    passage_ids = {}
    for no, b in enumerate(sorted((b for b in bacaan if b["id"] in dipakai), key=lambda b: (b["mulai"], b["akhir"])), 1):
        pid = str(uuid.uuid4())
        passage_ids[b["id"]] = pid
        rows["question_passages"].append({
            "id": pid, "exam_id": exam_id, "passage_number": no, "passage_text": b["teks"],
            "start_question_number": b["mulai"], "end_question_number": b["akhir"],
        })
        for fn_ in b["gambar"]:      # tabel passage_files hanya muncul bila ada gambar bacaan
            rows.setdefault("passage_files", []).append({
                "id": str(uuid.uuid4()), "passage_id": pid, "file_type": ENUM["file_type_img"],
                "file_name": fn_, "storage_path": f"passages/{exam_id}/{fn_}"})

    for s in soal:
        qid = str(uuid.uuid4())
        q = {"id": qid, "exam_id": exam_id, "import_batch_id": batch_id, "question_number": s["no"],
             "question_type": {"ESAI": ENUM["question_type_esai"], "PGK": ENUM["question_type_pgk"]}.get(
                 str(s.get("jenis", "PG")).upper(), ENUM["question_type"]),
             "question_text": s["soal"],
             "correct_answer": s["kunci"], "points": 1,
             "passage_id": passage_ids.get(s.get("bacaan_id"))}
        if MODE_DB_BARU: q.update({"needs_review": s["no"] in gagal, "import_warnings": [e for e in errs if e.startswith(f"No {s['no']}:")]})
        rows["questions"].append(q)
        for lab, txt in s["opsi"].items():
            rows["question_options"].append({"id": str(uuid.uuid4()), "question_id": qid, "option_label": lab, "option_text": txt})
        for fn_ in s["gambar"]:
            rows["question_files"].append({"id": str(uuid.uuid4()), "question_id": qid, "file_type": ENUM["file_type_img"],
                                           "file_name": fn_, "storage_path": f"questions/{exam_id}/{fn_}"})
    return rows

def cek_integritas(semua_rows):
    masalah, qids, nomor = [], set(), set()
    for r in semua_rows:
        pids = {p["id"] for p in r.get("question_passages", [])}
        for q in r["questions"]:
            qids.add(q["id"])
            if (q["exam_id"], q["question_number"]) in nomor: masalah.append(f"nomor ganda di exam {q['exam_id'][:8]}: {q['question_number']}")
            nomor.add((q["exam_id"], q["question_number"]))
            labels = {o["option_label"] for o in r["question_options"] if o["question_id"] == q["id"]}
            if q["correct_answer"] and not set(kunci_ganda(q["correct_answer"])) <= labels: masalah.append(f"kunci {q['correct_answer']} tidak ada di opsi (soal {q['question_number']})")
            if q.get("passage_id") and q["passage_id"] not in pids: masalah.append(f"passage_id tidak ditemukan (soal {q['question_number']})")
        for t in ("question_options", "question_files"):
            masalah += [f"{t} yatim: {x['id'][:8]}" for x in r[t] if x["question_id"] not in qids]
        terpakai = {q.get("passage_id") for q in r["questions"]}
        masalah += [f"bacaan {p['passage_number']} tidak punya soal" for p in r.get("question_passages", []) if p["id"] not in terpakai]
    return masalah

# ================= KONFIGURASI DARI LINGKUNGAN =================
if os.environ.get("ENUM_JSON"):                       # contoh: {"question_type":"MCQ","exam_status":"DRAFT"}
    ENUM.update(json.loads(os.environ["ENUM_JSON"]))
MODE_DB_BARU = os.environ.get("MODE_DB_BARU", "0") == "1"


# ============================================================================
# Ringkasan untuk halaman pratinjau Simple-CBT
# ============================================================================

def ringkasan_soal(data):
    """Ringkasan hasil parsing untuk halaman pratinjau. Bacaan dihitung SEKALI per bacaan (bukan per soal)."""

    jenis = lambda s: str(s.get("jenis", "PG")).upper()
    n = lambda s, k: len(s.get(k) or [])

    grup = {}
    for s in data:
        bid = s.get("bacaan_id")
        if not bid:
            continue
        g = grup.setdefault(bid, {
            "id": bid, "mulai_no": s["no"], "akhir_no": s["no"], "jumlah_soal": 0,
            "cuplikan": (s.get("deskripsi") or "(hanya gambar/rumus)")[:80],
            "gambar": n(s, "deskripsi_gambar"), "rumus": n(s, "deskripsi_rumus"),
        })
        g["mulai_no"] = min(g["mulai_no"], s["no"])
        g["akhir_no"] = max(g["akhir_no"], s["no"])
        g["jumlah_soal"] += 1
    bacaan = sorted(grup.values(), key=lambda g: g["mulai_no"])

    pg = sum(1 for s in data if jenis(s) == "PG")
    pgk = sum(1 for s in data if jenis(s) == "PGK")
    esai = sum(1 for s in data if jenis(s) == "ESAI")

    g_s = sum(n(s, "gambar") for s in data)
    g_b = sum(b["gambar"] for b in bacaan)

    r_s = sum(n(s, "rumus") for s in data)
    r_b = sum(b["rumus"] for b in bacaan)

    return {
        "jumlah_pg": pg,
        "jumlah_pgk": pgk,
        "jumlah_esai": esai,
        "jumlah_lain": len(data) - pg - pgk - esai,

        "jumlah_gambar": g_s + g_b,
        "gambar_soal": g_s,
        "gambar_bacaan": g_b,

        "jumlah_rumus": r_s + r_b,
        "rumus_soal": r_s,
        "rumus_bacaan": r_b,

        "jumlah_bacaan": len(bacaan),
        "bacaan": bacaan,
    }

# ================= PROSES SATU FILE =================
def proses_file(path, rel, daftar_guru, mode="POKJA", uploader_id="<UUID_AKUN_LOGIN>",
                img_dir=None, job_id=None, sertakan_rows=True, sertakan_gambar=True):
    """Baca satu file soal -> hasil deteksi, validasi, level (GREEN/YELLOW/RED), dan baris tabel (dry-run)."""
    img_dir = img_dir or tempfile.mkdtemp(prefix="img_"); os.makedirs(img_dir, exist_ok=True)
    job_id = job_id or str(uuid.uuid4())
    hasil = {"file": rel, "level": "RED", "jumlah_soal": 0, "meta": {}, "info": {}, "warnings": [], "errors": [], "soal": [], "bacaan": []}
    try:
        parser = parse_docx_ex if path.lower().endswith(".docx") else parse_xlsx_ex
        data, parse_warn, bacaan = parser(path, img_dir)
        info = baca_info(path)
    except Exception as e:                                   # satu file rusak tidak boleh menjatuhkan layanan
        hasil["errors"] = [f"Gagal dibaca: {type(e).__name__}: {e}"]
        return hasil

    meta, warn = deteksi_metadata(rel, info)
    warn = warn + list(parse_warn)
    if str(mode).upper() == "GURU":
        owner = uploader_id
        meta["guru"] = {"nilai": "(akun yang login)", "conf": 1.0, "sumber": "login"}
    else:
        g, gconf, gwarn = None, 0.0, []
        if info.get("guru"):                                 # 1) nama guru di dalam file
            g, gconf, gwarn = deteksi_guru(info["guru"], daftar_guru, mentah=True)
            if not g: gwarn = gwarn + [f"guru di file '{info['guru']}' tidak ada di daftar guru"]
        if not g:                                            # 2) cadangan: nama folder / file
            g2, c2, w2 = deteksi_guru(rel, daftar_guru)
            if g2 or not gwarn: g, gconf, gwarn = g2, c2, w2
        owner = daftar_guru.get(g) if g else None
        meta["guru"] = {"nilai": g, "conf": gconf, "sumber": "path" if g else None}
        warn += gwarn
        if not g: warn.append("pemilik (guru) belum terdeteksi: pilih manual di inbox")

    errs = validasi(data, bacaan)
    if not data:
        errs = ["Tidak ada soal terbaca (format tidak sesuai template?)"] + errs

    # Bacaan -> question_passages + questions.passage_id. Esai -> questions (tanpa opsi, tanpa kunci).
    level = tentukan_level(len(data), errs, meta, warn)
    hasil.update({"level": level, "jumlah_soal": len(data), "meta": meta, "info": info,
                  "warnings": warn, "errors": errs, "soal": data, "bacaan": bacaan,
                  "ringkasan": ringkasan_soal(data)})
    if sertakan_rows and data:
        hasil["rows"] = to_rows({"sumber": rel, "soal": data, "bacaan": bacaan}, meta, info, level, warn, job_id,
                                uploaded_by=uploader_id, owner=owner)
    if sertakan_gambar:
        hasil["images"] = {f: base64.b64encode(open(os.path.join(img_dir, f), "rb").read()).decode()
                           for f in os.listdir(img_dir)}
    return hasil


def kumpulkan_file(folder):
    """Semua .docx/.xlsx di folder (rekursif), tanpa file sementara Office."""
    out = []
    for ext in ("docx", "xlsx"):
        for f in glob.glob(f"{folder}/**/*.{ext}", recursive=True):
            if not os.path.basename(f).startswith("~$") and "__MACOSX" not in f: out.append(f)
    return sorted(out)