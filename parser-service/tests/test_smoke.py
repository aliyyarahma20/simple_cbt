"""Tes asap: membuat file uji sendiri (tanpa soal ujian asli) lalu memanggil API."""
import io, json, os, zipfile
import pytest
from docx import Document
from fastapi.testclient import TestClient
from openpyxl import Workbook

os.environ.pop("PARSER_API_KEY", None)
from app.main import app          # noqa: E402

client = TestClient(app)
GURU = json.dumps({"Budi Santoso, S.Pd.": "uuid-budi", "Siti Aminah, M.Pd.": "uuid-siti", "Budi Hartono, S.Kom.": "uuid-hartono"})


def docx_bytes(baris):
    d = Document()
    for t in baris: d.add_paragraph(t)
    b = io.BytesIO(); d.save(b); return b.getvalue()


def xlsx_bytes(kunci_kosong=False):
    wb = Workbook(); ws = wb.active; ws.title = "SOAL"
    ws["A2"] = "TEMPLATE SOAL ASAS GANJIL T.P. 2026-2027"
    ws["B4"], ws["C4"] = "Nama Guru Pengampu :", "Siti Aminah, M.Pd."
    ws["B5"], ws["C5"] = "Soal Kelas :", "XI DKV 2"
    ws["B6"], ws["C6"] = "Mata Pelajaran :", "PKN"
    for j, h in enumerate(["No.", "KUNCI JAWABAN", "SOAL", "A", "B", "C", "D", "E"], 1): ws.cell(9, j, h)
    ws.append([1, None if kunci_kosong else "b", "Sila ke-3 adalah ...", "Ketuhanan", "Persatuan", "Keadilan", None, None])
    ws.append([2, "Persatuan", "Sila ke-3 dalam Pancasila ...", "Ketuhanan", "Persatuan", "Keadilan", None, None])
    b = io.BytesIO(); wb.save(b); return b.getvalue()


DOCX_OK = docx_bytes(["[INFO]", "Guru: Budi Santoso, S.Pd.", "Kelas: X DPIB 1", "Mapel: MTK", "Jenis: ASTS", "Durasi: 60", "[/INFO]",
                      "[MULAI SOAL]", "1. 2 + 2 = ...", "A. 3", "B. 4", "Kunci: B", "2. 3 x 3 = ...", "A. 6", "B. 9", "Kunci: B", "[SELESAI]"])


def test_health():
    assert client.get("/health").json()["status"] == "ok"


def test_parse_docx_hijau():
    r = client.post("/parse", files={"file": ("a.docx", DOCX_OK)}, data={"guru_list": GURU, "uploader_id": "uuid-pokja"})
    j = r.json(); assert r.status_code == 200
    assert j["level"] == "GREEN" and j["jumlah_soal"] == 2
    assert j["meta"]["mapel"]["nilai"] == "Matematika" and j["meta"]["jenis"]["nilai"] == "PTS"
    ex = j["rows"]["exams"][0]
    assert ex["created_by"] == "uuid-budi" and ex["duration_minutes"] == 60            # pemilik = guru, bukan pengunggah
    assert j["rows"]["import_batches"][0]["uploaded_by"] == "uuid-pokja"


def test_parse_xlsx_template_sekolah_kunci_beragam():
    j = client.post("/parse", files={"file": ("x.xlsx", xlsx_bytes())}, data={"guru_list": GURU}).json()
    assert [s["kunci"] for s in j["soal"]] == ["B", "B"]                               # 'b' dan teks jawaban dipetakan ke huruf
    assert j["meta"]["guru"]["nilai"] == "Siti Aminah, M.Pd." and j["meta"]["kelas"]["nilai"] == "XI DKV 2"


def test_kunci_kosong_kuning():
    j = client.post("/parse", files={"file": ("x.xlsx", xlsx_bytes(kunci_kosong=True))}, data={"guru_list": GURU}).json()
    assert j["level"] == "YELLOW" and any("kunci" in e for e in j["errors"])


def test_file_tanpa_soal_merah():
    j = client.post("/parse", files={"file": ("b.docx", docx_bytes(["halo", "tidak ada soal"]))}, data={"guru_list": GURU}).json()
    assert j["level"] == "RED" and j["jumlah_soal"] == 0


def test_guru_ambigu_tidak_ditebak():
    d = docx_bytes(["[MULAI SOAL]", "1. a?", "A. x", "B. y", "Kunci: A", "[SELESAI]"])
    j = client.post("/parse", files={"file": ("Pak Budi - Informatika XII-DKV-2 kuis.docx", d)}, data={"guru_list": GURU}).json()
    assert j["meta"]["guru"]["nilai"] is None and j["level"] == "YELLOW"
    assert j["rows"]["exams"][0]["created_by"] == "<PILIH_GURU_PEMILIK>"


def test_mode_guru_pemilik_akun_login():
    j = client.post("/parse", files={"file": ("a.docx", DOCX_OK)}, data={"mode": "GURU", "uploader_id": "uuid-login"}).json()
    assert j["rows"]["exams"][0]["created_by"] == "uuid-login"


def test_batch_zip_dua_guru_mapel_sama():
    d = docx_bytes(["[MULAI SOAL]", "1. a?", "A. x", "B. y", "Kunci: A", "[SELESAI]"])
    b = io.BytesIO()
    with zipfile.ZipFile(b, "w") as z:
        z.writestr("Budi Santoso/Bahasa Inggris/X-DPIB-1_PTS.docx", d)
        z.writestr("Siti Aminah/Bahasa Inggris/X-DPIB-1_PTS.docx", d)
        z.writestr("__MACOSX/x.docx", d); z.writestr("~$tmp.docx", d)
    j = client.post("/parse-batch", files={"file": ("u.zip", b.getvalue())}, data={"guru_list": GURU}).json()
    assert j["total_file"] == 2 and j["ringkasan"]["GREEN"] == 2                       # file sampah diabaikan
    pemilik = {f["rows"]["exams"][0]["created_by"] for f in j["files"]}
    assert pemilik == {"uuid-budi", "uuid-siti"}


def test_ekstensi_dan_zip_rusak_ditolak():
    assert client.post("/parse", files={"file": ("a.pdf", b"x")}).status_code == 400
    assert client.post("/parse-batch", files={"file": ("u.zip", b"bukan zip")}).status_code == 400


def test_api_key(monkeypatch):
    import app.main as m
    monkeypatch.setattr(m, "API_KEY", "rahasia")
    assert client.post("/parse", files={"file": ("a.docx", DOCX_OK)}).status_code == 401
    assert client.post("/parse", files={"file": ("a.docx", DOCX_OK)}, headers={"X-API-Key": "rahasia"}).status_code == 200
