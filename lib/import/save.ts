import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { HasilSimpan, ParserFile, PratinjauFile, ItemPeriksa } from "./types";
import { isUuid, mimeDari } from "./util";

const BUCKET_GAMBAR = "question-images";

const JENIS_UJIAN = new Set([
  "DAILY",
  "PTS",
  "PAS",
  "OTHER",
]);

export function keRingkasan(f: ParserFile): PratinjauFile {
  return {
    file: f.file,
    level: f.level,
    jumlah_soal: f.jumlah_soal,
    mapel: f.meta?.mapel?.nilai ?? null,
    kelas: f.meta?.kelas?.nilai ?? null,
    jenis: f.meta?.jenis?.nilai ?? null,
    guru: f.meta?.guru?.nilai ?? null,
    catatan: [...(f.errors ?? []), ...(f.warnings ?? [])],
    ringkasan: f.ringkasan,
    butir: keButir(f),
  };
}

function tambahCatatan(exam: Record<string, any>, catatan: string) {
  exam.description = [exam.description, catatan].filter(Boolean).join(" ");
}

export async function simpanSatu(
  f: ParserFile,
  uploaderId: string,
  role: "POKJA" | "GURU",
  guruMap: Record<string, string>
): Promise<HasilSimpan> {
  if (!f.rows || f.jumlah_soal === 0) {
    return {
      file: f.file,
      status: "DILEWATI",
      alasan: "Tidak ada soal yang dapat disimpan.",
    };
  }

  const rows = structuredClone(f.rows);
  const exam = rows.exams?.[0];

  if (
    !exam ||
    !rows.import_batches?.[0] ||
    !Array.isArray(rows.questions) ||
    !Array.isArray(rows.question_options) ||
    !Array.isArray(rows.question_files)
  ) {
    return {
      file: f.file,
      status: "DITOLAK",
      alasan: "Struktur data hasil parser tidak lengkap.",
    };
  }

  // Bacaan: question_passages harus array (boleh kosong), passage_files opsional.
  const passages = rows.question_passages ?? [];
  const passageFiles = rows.passage_files ?? [];

  if (!Array.isArray(passages) || !Array.isArray(passageFiles)) {
    return {
      file: f.file,
      status: "DITOLAK",
      alasan: "Struktur bacaan hasil parser tidak valid.",
    };
  }

  // Tolak jika ada error validasi bacaan (rentang salah, nomor soal tidak ditemukan,
  // rentang tumpang tindih, isi bacaan kosong). Error lain (mis. kunci kosong)
  // tetap mengikuti alur lama. Untuk menolak SEMUA error, ganti filter menjadi f.errors.
  const errorBacaan = (f.errors ?? []).filter((e) => e.startsWith("Bacaan"));
  if (errorBacaan.length > 0) {
    return {
      file: f.file,
      status: "DITOLAK",
      alasan: `Bacaan bermasalah: ${errorBacaan[0]}`,
    };
  }

  // Setiap passage_id pada soal harus punya pasangan di question_passages,
  // dan setiap passage_id pada passage_files juga.
  const passageIds = new Set(passages.map((p) => p.id));
  const soalYatim = rows.questions.some(
    (q) => q.passage_id && !passageIds.has(q.passage_id)
  );
  const berkasYatim = passageFiles.some((b) => !passageIds.has(b.passage_id));

  if (soalYatim || berkasYatim) {
    return {
      file: f.file,
      status: "DITOLAK",
      alasan: "Relasi bacaan ke soal tidak konsisten.",
    };
  }

  if (!JENIS_UJIAN.has(String(exam.exam_type))) {
    return {
      file: f.file,
      status: "DITOLAK",
      alasan: "Jenis ujian tidak valid atau belum terdeteksi.",
    };
  }

  if (role === "GURU") {
    if (exam.exam_type !== "DAILY") {
      return {
        file: f.file,
        status: "DITOLAK",
        alasan: "Guru hanya dapat mengimpor ujian DAILY/kuis.",
      };
    }

    // Pemilik ujian guru selalu akun yang sedang login.
    exam.created_by = uploaderId;
  } else if (
    !isUuid(exam.created_by) ||
    !Object.values(guruMap).includes(exam.created_by)
  ) {
    // POKJA belum memilih guru yang valid.
    exam.created_by = uploaderId;
    tambahCatatan(exam, "[PEMILIK BELUM DIPILIH]");
  }

  // Identitas pengunggah selalu berasal dari session yang terverifikasi.
  rows.import_batches[0].uploaded_by = uploaderId;
  rows.import_batches[0].storage_path = null;

  const admin = createAdminClient();
  const uploadedPaths: string[] = [];

  try {
    // Gambar soal dan gambar bacaan diupload dengan cara yang sama.
    // Objek di dalam `rows` diubah langsung, sehingga storage_path ikut ter-update.
    const semuaGambar = [...rows.question_files, ...passageFiles];

    for (const berkas of semuaGambar) {
      const fileName = String(berkas.file_name ?? "");
      const baseName = fileName.split(/[\\/]/).pop() ?? "";

      if (!baseName || baseName === "." || baseName === "..") {
        throw new Error("Nama file gambar tidak valid.");
      }

      const base64 = f.images?.[fileName];

      if (!base64) {
        throw new Error(`Gambar ${baseName} tidak ditemukan pada hasil parser.`);
      }

      const path = `${exam.id}/${baseName}`;

      const { error } = await admin.storage
        .from(BUCKET_GAMBAR)
        .upload(path, Buffer.from(base64, "base64"), {
          contentType: mimeDari(baseName),
          upsert: false,
        });

      if (error) throw new Error(`Upload gambar gagal: ${error.message}`);

      uploadedPaths.push(path);
      berkas.storage_path = `${BUCKET_GAMBAR}/${path}`;
    }

    const { data, error } = await admin.rpc("import_exam_bundle", {
      p: rows,
    });

    if (error) throw new Error(`Penyimpanan database gagal: ${error.message}`);

    return {
      file: f.file,
      status: "TERSIMPAN",
      exam_id: data?.exam_id ?? exam.id,
      jumlah_soal: data?.questions ?? f.jumlah_soal,
    };
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const { error: cleanupError } = await admin.storage
        .from(BUCKET_GAMBAR)
        .remove(uploadedPaths);

      if (cleanupError) {
        console.error("Gagal membersihkan gambar sementara:", cleanupError);
      }
    }

    return {
      file: f.file,
      status: "DITOLAK",
      alasan: error instanceof Error ? error.message : "Terjadi kesalahan.",
    };
  }
}

type Baris = Record<string, any>;

const MAKS_GAMBAR_B64 = 400_000; // gambar lebih besar dari ini tidak ikut dikirim

// Butir pemeriksaan disusun dari hasil parser (f.soal dan f.bacaan), bukan dari f.rows:
// rows hanya dibuat saat simpan, jadi pada pratinjau butir akan kosong; dan nama kolom DB
// tidak perlu ditebak. Jenis soal (PG / PGK / ESAI) dan kunci sudah jelas dari parser.
export function keButir(f: ParserFile): ItemPeriksa[] {
  const soal = [...((f.soal ?? []) as Baris[])].sort(
    (a, b) => Number(a.no ?? 0) - Number(b.no ?? 0)
  );
  const bacaan = (f.bacaan ?? []) as Baris[];
  if (soal.length === 0) return [];

  const pesan = [...(f.errors ?? []), ...(f.warnings ?? [])];

  const gambar = (nama: unknown): string[] =>
    (Array.isArray(nama) ? nama : [])
      .map((n) => {
        const fileName = String(n ?? "");
        const b64 = f.images?.[fileName];
        if (!b64 || b64.length > MAKS_GAMBAR_B64) return null;
        const base = fileName.split(/[\\/]/).pop() ?? fileName;
        return `data:${mimeDari(base)};base64,${b64}`;
      })
      .filter((x): x is string => !!x);

  // Label sama dengan yang dipakai pesan validasi parser, mis. "Bacaan 1-5".
  const labelBacaan = (b: Baris) => `Bacaan ${b.rentang_mentah || `${b.mulai}-${b.akhir}`}`;

  const hasil: ItemPeriksa[] = [];
  const sudahTampil = new Set<string>();

  soal.forEach((s, i) => {
    const no = Number(s.no ?? i + 1);
    const b = s.bacaan_id ? bacaan.find((x) => x.id === s.bacaan_id) : undefined;

    // Bacaan muncul sekali, tepat sebelum soal pertama dalam rentangnya.
    if (b && !sudahTampil.has(b.id)) {
      sudahTampil.add(b.id);
      const label = labelBacaan(b);
      hasil.push({
        id: `b-${b.id}`,
        tipe: "bacaan",
        teks: String(b.teks ?? ""),
        gambar: gambar(b.gambar),
        rumus: b.rumus?.length ? b.rumus : undefined,
        no_mulai: Number(b.mulai ?? no),
        jumlah_soal: soal.filter((x) => x.bacaan_id === b.id).length,
        peringatan: pesan.filter(
          (m) =>
            m.includes(`${label}:`) ||
            m.includes(`${label} dan `) ||
            m.includes(` dan ${label}:`)
        ),
      });
    }

    const jenisMentah = String(s.jenis ?? "PG").toUpperCase();
    const jenis: "PG" | "PGK" | "ESAI" | "LAIN" =
      jenisMentah === "PG" || jenisMentah === "PGK" || jenisMentah === "ESAI"
        ? jenisMentah
        : "LAIN";

    // Kunci: "B" untuk PG, "A,C" untuk PGK. Opsi yang termasuk kunci ditandai benar.
    const kunciHuruf = String(s.kunci ?? "")
      .split(",")
      .map((k) => k.trim().toUpperCase())
      .filter(Boolean);

    const opsi = Object.entries((s.opsi ?? {}) as Record<string, unknown>)
      .map(([label, teks]) => ({
        label,
        teks: String(teks ?? ""),
        benar: jenis !== "ESAI" && kunciHuruf.includes(label.toUpperCase()),
      }))
      .sort((x, y) => x.label.localeCompare(y.label));

    // Pesan untuk soal ini, mis. "No 4: kunci 'E' tidak ada di opsi" (tidak menyamai "No 41").
    const polaNo = new RegExp(`^(?:Soal|No)\\s+${no}(?!\\d)`, "i");

    hasil.push({
      id: `s-${no}-${i}`,
      tipe: "soal",
      no,
      jenis,
      teks: String(s.soal ?? ""),
      gambar: gambar(s.gambar),
      rumus: s.rumus?.length ? s.rumus : undefined,
      opsi: opsi.length ? opsi : undefined,
      kunci: s.kunci ?? undefined,
      bacaan_no: b ? Number(b.mulai) : undefined,
      peringatan: pesan.filter((m) => polaNo.test(m)),
    });
  });

  return hasil;
}