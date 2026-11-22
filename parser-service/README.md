# Simple-CBT Parser Service

Layanan kecil (FastAPI) yang membaca file soal `.docx` / `.xlsx`, mendeteksi mapel, kelas, jenis ujian, dan guru pemilik,
memvalidasi soal, lalu mengembalikan hasil + baris tabel siap-insert (belum menyentuh database).
Dipanggil dari **server** Next.js, bukan dari browser.

## Jalankan lokal
```bash
python -m venv .venv && source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                      # isi PARSER_API_KEY
export $(grep -v '^#' .env | xargs)                       # atau set manual di terminal
uvicorn app.main:app --reload --port 8000
pytest -q                                                 # 10 tes harus lolos
```
Dokumentasi interaktif: http://localhost:8000/docs

## Endpoint
| Endpoint | Fungsi |
|---|---|
| `GET /health` | cek hidup |
| `POST /parse` | satu file `.docx`/`.xlsx` |
| `POST /parse-batch` | satu `.zip` berisi banyak file (boleh berfolder, nama folder ikut dipakai untuk deteksi) |

Field form (keduanya): `file`, `mode` (`POKJA` atau `GURU`), `uploader_id` (id akun yang login),
`guru_list` (JSON `{"Nama Guru": "uuid"}` dari tabel users role guru), `include_rows`, `include_images`.
Header `X-API-Key` wajib bila `PARSER_API_KEY` diisi.

Hasil per file: `level` (GREEN / YELLOW / RED), `meta` (mapel, kelas, jenis, guru + tingkat keyakinan),
`warnings`, `errors`, `soal`, `images` (base64), dan `rows` (exams, import_batches, questions, question_options, question_files).

Gambar lewat kolom **GAMBAR** (nama file) hanya terbaca di `/parse-batch` karena file gambarnya harus ikut di ZIP.

## Contoh pemanggilan dari Next.js (BELUM DIUJI, sesuaikan dengan proyek)
```ts
// app/api/import/route.ts  (server-side saja)
const fd = new FormData();
fd.append("file", file);                                   // File dari request.formData()
fd.append("mode", "POKJA");
fd.append("uploader_id", user.id);
fd.append("guru_list", JSON.stringify(guruMap));           // { "Budi Santoso, S.Pd.": "uuid", ... }
const res = await fetch(`${process.env.PARSER_URL}/parse`, {
  method: "POST", headers: { "X-API-Key": process.env.PARSER_API_KEY! }, body: fd,
});
const hasil = await res.json();                            // lalu simpan hasil.rows ke Supabase (service role, server-side)
```

## Konfigurasi
- `ENUM_JSON`: samakan nilai enum dengan DB (`question_type`, `exam_status`, `import_status`, `exam_type`, `file_type_doc`, `file_type_img`). Nilai bawaan hanya tebakan.
- `MODE_DB_BARU=1`: ikut mengisi kolom usulan (subject_id, review_level, dst.). Biarkan 0 selama DB belum diubah.
- Kamus mapel, jurusan, dan alias jenis ujian ada di bagian atas `app/core.py` (`SUBJECT_ALIASES`, `JURUSAN`, `JENIS_ALIASES`).

## Catatan keamanan
- Jangan commit file soal ujian asli ke repo (lihat `.gitignore`). Tes membuat file uji sendiri.
- Layanan ini jangan dibuka ke publik tanpa `PARSER_API_KEY`. Panggil hanya dari server Next.js.
- Batas ukuran file dan ZIP bisa diatur lewat environment. ZIP diekstrak ke folder sementara yang dihapus setelah selesai.

## Keterbatasan saat ini
- Dokumen Word yang berantakan (penomoran otomatis, pecahan berupa gambar) belum terbaca; hasilnya RED.
- Rumus Word terbaca sebagai teks mentah, belum LaTeX. Rumus `$...$` di Excel hanya dicatat.
- `app/core.py` dihasilkan dari notebook `SimpleCBT_Bulk_Import_v2_DryRun.ipynb`. Jaga agar keduanya tidak menyimpang.
