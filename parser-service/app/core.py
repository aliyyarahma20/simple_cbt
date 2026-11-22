"""Inti parser Simple-CBT. Dihasilkan dari notebook SimpleCBT_Bulk_Import_v2_DryRun.ipynb.
Jika logika parser diubah, ubah di notebook lalu hasilkan ulang, atau edit file ini langsung dan samakan keduanya."""

import re, os, io, json, glob, shutil, zipfile, uuid, difflib, base64, tempfile
from docx import Document
from docx.oxml.ns import qn
from openpyxl import load_workbook
from docx.text.paragraph import Paragraph
from docx.table import Table

_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
_VML = "urn:schemas-microsoft-com:vml"

RE_SOAL  = re.compile(r"^\s*(\d+)[\.\)]\s+(.*)")
RE_OPSI  = re.compile(r"^\s*([A-E])[\.\)]\s+(.*)")
RE_KUNCI = re.compile(r"^\s*(?:kunci|jawaban)\s*:\s*([A-Ea-e])?", re.I)
RE_MULAI   = re.compile(r"^\[MULAI SOAL\]$", re.I)
RE_SELESAI = re.compile(r"^\[SELESAI\]$", re.I)

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

def parse_docx(path, img_dir):
    """
    Membaca DOCX dengan section [PG], [ESAI], dan [DESKRIPSI].
    Format lama tanpa section tetap dibaca sebagai PG.
    Deskripsi ditempelkan pada soal pertama setelahnya; soal berikutnya
    ditandai terkait_deskripsi sampai deskripsi berikutnya.
    """
    doc = Document(path)
    os.makedirs(img_dir, exist_ok=True)

    soal_list, warnings = [], []
    cur = None
    aktif = False
    ada_penanda = False
    section = None
    desc_buffer = []
    desc_math = []
    desc_images = []
    pending_desc = None
    pending_desc_math = []
    pending_desc_images = []
    group_active = False
    desc_image_counter = 0

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

    def simpan_gambar(paragraph, tujuan, no_):
        hasil = []
        for rid in paragraph._p.xpath(".//a:blip/@r:embed"):
            part = doc.part.related_parts[rid]
            ext = os.path.splitext(str(part.partname))[1] or ".png"
            fname = f"{tujuan}{no_}_{len(hasil)+1}{ext}"
            with open(os.path.join(img_dir, fname), "wb") as f:
                f.write(part.blob)
            hasil.append(fname)
        return hasil

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
                simpan_soal()
                aktif, ada_penanda, section = True, True, None
                continue

            if upper in ("[SELESAI]", "[SELESAI SOAL]"):
                simpan_soal()
                aktif, section = False, None
                continue

            if not aktif:
                continue

            if upper in ("[PG]", "[ESAI]", "[ESSAY]", "[DESKRIPSI]"):
                simpan_soal()
                section = {
                    "[PG]": "PG",
                    "[ESAI]": "ESAI",
                    "[ESSAY]": "ESAI",
                    "[DESKRIPSI]": "DESKRIPSI",
                }[upper]
                if section == "DESKRIPSI":
                    desc_buffer, desc_math, desc_images = [], [], []
                continue

            if upper in (
                "[SELESAI PG]", "[PG SELESAI]",
                "[SELESAI ESAI]", "[ESAI SELESAI]", "[SELESAI ESSAY]", "[ESSAY SELESAI]",
                "[SELESAI DESKRIPSI]", "[DESKRIPSI SELESAI]",
            ):
                if section == "DESKRIPSI":
                    pending_desc = "\n".join(desc_buffer).strip()
                    pending_desc_math = list(desc_math)
                    pending_desc_images = list(desc_images)
                    if not pending_desc and not pending_desc_images:
                        warnings.append("Section [DESKRIPSI] kosong.")
                    group_active = bool(pending_desc or pending_desc_images)
                section = None
                continue

            if section == "DESKRIPSI":
                desc_buffer.append(pakai_rumus(line, maths, {"rumus": desc_math}))
                continue

            m = RE_SOAL.match(line)
            if m:
                simpan_soal()
                jenis = section if section in ("PG", "ESAI") else "PG"
                cur = {
                    "no": int(m[1]),
                    "jenis": jenis,
                    "soal": "",
                    "opsi": {},
                    "kunci": None,
                    "gambar": [],
                    "rumus": [],
                    "deskripsi": pending_desc,
                    "deskripsi_rumus": list(pending_desc_math),
                    "deskripsi_gambar": list(pending_desc_images),
                    "terkait_deskripsi": group_active,
                }
                pending_desc = None
                pending_desc_math = []
                pending_desc_images = []
                cur["soal"] = pakai_rumus(m[2], maths, cur)
                continue

            if cur is not None:
                if cur["jenis"] == "PG" and (mo := RE_OPSI.match(line)):
                    cur["opsi"][mo[1]] = pakai_rumus(mo[2], maths, cur)
                elif cur["jenis"] == "PG" and (mk := RE_KUNCI.match(line)):
                    cur["kunci"] = (mk[1] or "").upper() or None
                elif cur["jenis"] == "ESAI" and RE_KUNCI.match(line):
                    warnings.append(f"No {cur['no']}: kunci pada soal esai diabaikan.")
                else:
                    cur["soal"] += ("\n" if cur["soal"] else "") + pakai_rumus(line, maths, cur)
            else:
                warnings.append(f"Konten di luar soal diabaikan: '{line[:40]}'")

        # Gambar pada paragraf masuk ke deskripsi atau soal sesuai section aktif.
        image_ids = id_gambar(p._p)
        if image_ids:
            if section == "DESKRIPSI":
                for rid in image_ids:
                    desc_image_counter += 1
                    part = doc.part.related_parts[rid]
                    ext = os.path.splitext(str(part.partname))[1] or ".png"
                    fname = f"deskripsi_{desc_image_counter}{ext}"
                    with open(os.path.join(img_dir, fname), "wb") as f:
                        f.write(part.blob)
                    desc_images.append(fname)
            elif cur is not None:
                for rid in image_ids:
                    part = doc.part.related_parts[rid]
                    ext = os.path.splitext(str(part.partname))[1] or ".png"
                    fname = f"soal{cur['no']}_{len(cur['gambar'])+1}{ext}"
                    with open(os.path.join(img_dir, fname), "wb") as f:
                        f.write(part.blob)
                    cur["gambar"].append(fname)

    simpan_soal()

    if not ada_penanda:
        warnings.append("Penanda [MULAI SOAL] tidak ditemukan; gunakan Template_Soal_SimpleCBT.docx.")
    if pending_desc:
        warnings.append("Ada deskripsi yang tidak diikuti soal.")
    if any(s.get("terkait_deskripsi") for s in soal_list):
        warnings.append("Dokumen memiliki deskripsi: urutan soal harus dipertahankan dan pengacakan dinonaktifkan.")
    return soal_list, warnings

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
    "ESSAI": "ESAI", "ESAI": "ESAI", "ESSAY": "ESAI",
    "BACAAN": "BACAAN",
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

def parse_xlsx(path, img_dir):
    """
    Kolom 'Jenis' (opsional): PG | ESSAI | BACAAN.
      - tanpa kolom Jenis / sel kosong  -> PG (kompatibel dengan format lama)
      - BACAAN: teks di kolom Soal disimpan sebagai bacaan aktif, BUKAN soal.
                Berlaku untuk soal-soal berikutnya sampai ada BACAAN baru
                atau baris BACAAN dengan Soal kosong (penutup).
      - ESSAI : tanpa opsi dan tanpa kunci.
    Keluaran mengikuti struktur parse_docx (deskripsi, deskripsi_rumus,
    deskripsi_gambar, terkait_deskripsi).
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

    desc_counter = 0

    def nama_desc(i, ext):
        nonlocal desc_counter
        desc_counter += 1
        return f"deskripsi_{desc_counter}{ext}"

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
    pending = None          # bacaan yang belum dipasang ke soal pertama
    group_active = False    # ada bacaan aktif -> soal ditandai terkait_deskripsi

    for r in range(hr + 1, min(ws.max_row, hr + 2000) + 1):
        g = lambda k: ws.cell(r, kol[k]).value if k in kol else None
        jenis = normalisasi_jenis(g("jenis"))
        teks = "" if g("soal") is None else str(g("soal")).strip()

        # ---------- BACAAN: bukan soal ----------
        if jenis == "BACAAN":
            gambar_b = ambil_gambar(r, nama_desc, f"Baris {r} (BACAAN)")
            if pending is not None:
                warnings.append("Ada bacaan yang tidak diikuti soal.")
            if not teks and not gambar_b:          # BACAAN kosong = penutup bacaan aktif
                pending, group_active = None, False
                continue
            pending = {"teks": teks, "rumus": re.findall(r"\$([^$]+)\$", teks), "gambar": gambar_b}
            group_active = True
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
            teks_semua = teks + " " + " ".join(opsi.values())

        gambar = ambil_gambar(r, lambda i, e, _no=no: f"soal{_no}_{i}{e}", f"No {no}")

        d, pending = pending, None
        out.append({
            "no": no, "jenis": jenis, "soal": teks, "opsi": opsi, "kunci": kunci,
            "gambar": gambar, "rumus": re.findall(r"\$([^$]+)\$", teks_semua),   # rumus ditulis $...$
            "deskripsi": d["teks"] if d else None,
            "deskripsi_rumus": d["rumus"] if d else [],
            "deskripsi_gambar": d["gambar"] if d else [],
            "terkait_deskripsi": group_active,
        })

    if pending is not None:
        warnings.append("Ada bacaan yang tidak diikuti soal.")
    if any(s["terkait_deskripsi"] for s in out):
        warnings.append("Dokumen memiliki bacaan: urutan soal harus dipertahankan dan pengacakan dinonaktifkan.")
    return out, warnings

def validasi(soal_list):
    """Validasi berbeda untuk PG dan ESAI; blok deskripsi bukan item soal."""
    errs, seen = [], set()
    for s in soal_list:
        n = s["no"]
        jenis = str(s.get("jenis", "PG")).upper()

        if n in seen:
            errs.append(f"No {n}: nomor duplikat")
        seen.add(n)

        if jenis not in ("PG", "ESAI"):
            errs.append(f"No {n}: jenis soal '{jenis}' tidak dikenali")
            continue

        if not str(s.get("soal") or "").strip():
            errs.append(f"No {n}: teks soal kosong")

        if jenis == "PG":
            opsi = s.get("opsi") or {}
            kunci = s.get("kunci")
            if len(opsi) < 2:
                errs.append(f"No {n}: opsi kurang dari 2")
            if not kunci:
                errs.append(f"No {n}: kunci jawaban belum diisi")
            elif kunci not in opsi:
                errs.append(f"No {n}: kunci '{kunci}' tidak ada di opsi")
        elif jenis == "ESAI":
            # Esai tidak memerlukan opsi maupun kunci jawaban.
            continue

    return errs



import difflib, uuid

# ---- Nilai enum DB: SESUAIKAN dengan isi enum di Supabase ----
ENUM = {
    "question_type": "MULTIPLE_CHOICE",
    "exam_status":   "DRAFT",
    "import_status": "PENDING",
    "file_type_doc": {"docx": "DOCX", "xlsx": "XLSX"},
    "file_type_img": "IMAGE",
    "exam_type":     {"PAS": "PAS", "PTS": "PTS", "KUIS": "QUIZ"},
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
    exam_id, batch_id = str(uuid.uuid4()), str(uuid.uuid4())
    soal = paket["soal"]; errs = validasi(soal)
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
    rows = {"exams": [exam], "import_batches": [batch], "questions": [], "question_options": [], "question_files": []}
    for s in soal:
        qid = str(uuid.uuid4())
        q = {"id": qid, "exam_id": exam_id, "import_batch_id": batch_id, "question_number": s["no"],
             "question_type": ENUM["question_type"], "question_text": s["soal"],
             "correct_answer": s["kunci"], "points": 1}
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
        for q in r["questions"]:
            qids.add(q["id"])
            if (q["exam_id"], q["question_number"]) in nomor: masalah.append(f"nomor ganda di exam {q['exam_id'][:8]}: {q['question_number']}")
            nomor.add((q["exam_id"], q["question_number"]))
            labels = {o["option_label"] for o in r["question_options"] if o["question_id"] == q["id"]}
            if q["correct_answer"] and q["correct_answer"] not in labels: masalah.append(f"kunci {q['correct_answer']} tidak ada di opsi (soal {q['question_number']})")
        for t in ("question_options", "question_files"):
            masalah += [f"{t} yatim: {x['id'][:8]}" for x in r[t] if x["question_id"] not in qids]
    return masalah

# ================= KONFIGURASI DARI LINGKUNGAN =================
if os.environ.get("ENUM_JSON"):                       # contoh: {"question_type":"MCQ","exam_status":"DRAFT"}
    ENUM.update(json.loads(os.environ["ENUM_JSON"]))
MODE_DB_BARU = os.environ.get("MODE_DB_BARU", "0") == "1"


# ============================================================================
# TAMBAHAN untuk parser Simple-CBT (taruh di atas proses_file)
# ============================================================================

def ringkasan_soal(data):
    """Ringkasan hasil parsing untuk halaman pratinjau."""

    jenis = lambda s: str(s.get("jenis", "PG")).upper()
    n = lambda s, k: len(s.get(k) or [])

    bacaan = []

    for s in data:
        if (
            s.get("deskripsi")
            or s.get("deskripsi_gambar")
            or s.get("deskripsi_rumus")
        ):
            bacaan.append({
                "mulai_no": s["no"],
                "cuplikan": (
                    s.get("deskripsi") or "(hanya gambar/rumus)"
                )[:80],
                "gambar": n(s, "deskripsi_gambar"),
                "rumus": n(s, "deskripsi_rumus"),
            })

    pg = sum(1 for s in data if jenis(s) == "PG")
    esai = sum(1 for s in data if jenis(s) == "ESAI")

    g_s = sum(n(s, "gambar") for s in data)
    g_b = sum(n(s, "deskripsi_gambar") for s in data)

    r_s = sum(n(s, "rumus") for s in data)
    r_b = sum(n(s, "deskripsi_rumus") for s in data)

    return {
        "jumlah_pg": pg,
        "jumlah_esai": esai,
        "jumlah_lain": len(data) - pg - esai,

        "jumlah_gambar": g_s + g_b,
        "gambar_soal": g_s,
        "gambar_bacaan": g_b,

        "jumlah_rumus": r_s + r_b,
        "rumus_soal": r_s,
        "rumus_bacaan": r_b,

        "jumlah_bacaan": len(bacaan),
        "bacaan": bacaan,

        "acak_diizinkan": len(bacaan) == 0,
    }

# Di proses_file, pada hasil.update({...}) tambahkan satu baris:
#     "ringkasan": ringkasan_soal(data),

# ================= PROSES SATU FILE =================
def proses_file(path, rel, daftar_guru, mode="POKJA", uploader_id="<UUID_AKUN_LOGIN>",
                img_dir=None, job_id=None, sertakan_rows=True, sertakan_gambar=True):
    """Baca satu file soal -> hasil deteksi, validasi, level (GREEN/YELLOW/RED), dan baris tabel (dry-run)."""
    img_dir = img_dir or tempfile.mkdtemp(prefix="img_"); os.makedirs(img_dir, exist_ok=True)
    job_id = job_id or str(uuid.uuid4())
    hasil = {"file": rel, "level": "RED", "jumlah_soal": 0, "meta": {}, "info": {}, "warnings": [], "errors": [], "soal": []}
    try:
        data, parse_warn = (parse_docx if path.lower().endswith(".docx") else parse_xlsx)(path, img_dir)
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

    errs = validasi(data)
    if not data:
        errs = ["Tidak ada soal terbaca (format tidak sesuai template?)"] + errs

    # Konversi rows DB lama hanya aman untuk PG tanpa deskripsi.
    # Untuk ESAI/deskripsi, tahan dulu sampai tahap perubahan skema DB.
    rows_aman = all(
        str(s.get("jenis", "PG")).upper() == "PG"
        and not s.get("terkait_deskripsi")
        and not s.get("deskripsi")
        for s in data
    )
    if sertakan_rows and data and not rows_aman:
        warn.append("Rows DB belum dibuat: parser sudah membaca ESAI/deskripsi, tetapi pemetaan DB dikerjakan pada tahap berikutnya.")

    level = tentukan_level(len(data), errs, meta, warn)
    hasil.update({"level": level, "jumlah_soal": len(data), "meta": meta, "info": info,
                  "warnings": warn, "errors": errs, "soal": data,
                  "ringkasan": ringkasan_soal(data), "acak_diizinkan": not any(s.get("terkait_deskripsi") for s in data)})
    if sertakan_rows and data and rows_aman:
        hasil["rows"] = to_rows({"sumber": rel, "soal": data}, meta, info, level, warn, job_id,
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
