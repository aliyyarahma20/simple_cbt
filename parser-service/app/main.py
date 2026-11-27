"""Layanan parser Simple-CBT. Dipanggil dari server Next.js (bukan dari browser)."""
import hmac, json, os, shutil, tempfile, uuid, zipfile
from typing import Optional
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from . import core

app = FastAPI(title="Simple-CBT Parser Service", version="0.1.0")

API_KEY = os.environ.get("PARSER_API_KEY")                  # kosong = tanpa autentikasi (hanya untuk lokal)
MAX_FILE_MB = int(os.environ.get("MAX_FILE_MB", "20"))
MAX_ZIP_FILES = int(os.environ.get("MAX_ZIP_FILES", "500"))
MAX_UNZIPPED_MB = int(os.environ.get("MAX_UNZIPPED_MB", "200"))
EXT_OK = (".docx", ".xlsx")


def _cek_key(x_api_key: Optional[str]):
    if API_KEY and not hmac.compare_digest(x_api_key or "", API_KEY):
        raise HTTPException(401, "API key tidak valid")


def _baca_upload(file: UploadFile) -> bytes:
    isi = file.file.read()
    if len(isi) > MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(413, f"File lebih dari {MAX_FILE_MB} MB")
    return isi


def _guru(guru_list: str) -> dict:
    try:
        d = json.loads(guru_list or "{}")
        assert isinstance(d, dict)
        return d
    except Exception:
        raise HTTPException(400, 'guru_list harus JSON objek {"Nama Guru": "uuid"}')


@app.get("/health")
def health():
    return {"status": "ok", "versi": app.version}


@app.post("/parse")
def parse(file: UploadFile = File(...), mode: str = Form("POKJA"), uploader_id: str = Form("<UUID_AKUN_LOGIN>"),
          guru_list: str = Form("{}"), include_rows: bool = Form(True), include_images: bool = Form(True),
          x_api_key: Optional[str] = Header(default=None)):
    """Satu file .docx/.xlsx. Gambar lewat kolom nama file hanya bisa dipakai di /parse-batch (ZIP)."""
    _cek_key(x_api_key)
    nama = os.path.basename(file.filename or "")
    if not nama.lower().endswith(EXT_OK):
        raise HTTPException(400, "Hanya .docx atau .xlsx")
    isi, gurus = _baca_upload(file), _guru(guru_list)
    with tempfile.TemporaryDirectory() as d:
        path = os.path.join(d, nama)
        with open(path, "wb") as f: f.write(isi)
        return core.proses_file(path, nama, gurus, mode, uploader_id, img_dir=os.path.join(d, "_img"),
                                sertakan_rows=include_rows, sertakan_gambar=include_images)


@app.post("/parse-batch")
def parse_batch(file: UploadFile = File(...), mode: str = Form("POKJA"), uploader_id: str = Form("<UUID_AKUN_LOGIN>"),
                guru_list: str = Form("{}"), include_rows: bool = Form(True), include_images: bool = Form(True),
                x_api_key: Optional[str] = Header(default=None)):
    """Satu ZIP berisi banyak file (boleh berfolder). Nama folder ikut dipakai untuk mendeteksi guru, mapel, kelas."""
    _cek_key(x_api_key)
    if not (file.filename or "").lower().endswith(".zip"):
        raise HTTPException(400, "Unggah berkas .zip")
    isi, gurus = _baca_upload(file), _guru(guru_list)
    job_id = str(uuid.uuid4())
    with tempfile.TemporaryDirectory() as d:
        zpath = os.path.join(d, "u.zip")
        with open(zpath, "wb") as f: f.write(isi)

        hasil = []
        try:
            with zipfile.ZipFile(zpath) as z:
                infos = z.infolist()
                if len(infos) > MAX_ZIP_FILES or sum(i.file_size for i in infos) > MAX_UNZIPPED_MB * 1024 * 1024:
                    raise HTTPException(413, "ZIP terlalu besar (batas jumlah file atau ukuran setelah diekstrak)")

                root = os.path.join(d, "x")
                z.extractall(root)

                for p in core.kumpulkan_file(root):
                    rel = os.path.relpath(p, root).replace(os.sep, "/")
                    hasil.append(core.proses_file(
                        p, rel, gurus, mode, uploader_id,
                        img_dir=os.path.join(d, "_img", uuid.uuid4().hex),
                        job_id=job_id,
                        sertakan_rows=include_rows,
                        sertakan_gambar=include_images
                    ))
        except zipfile.BadZipFile:
            raise HTTPException(400, "ZIP rusak")

    ringkas = {"GREEN": 0, "YELLOW": 0, "RED": 0}
    for h in hasil: ringkas[h["level"]] += 1
    return {"job_id": job_id, "total_file": len(hasil), "ringkasan": ringkas, "files": hasil}
