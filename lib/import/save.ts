import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { HasilSimpan, ParserFile, PratinjauFile } from "./types";
import { isUuid, mimeDari } from "./util";

const BUCKET_GAMBAR = "question-images";

const JENIS_UJIAN = new Set([
  "DAILY",
  "UTS",
  "UAS",
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
    for (const questionFile of rows.question_files) {
      const fileName = String(questionFile.file_name ?? "");
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
      questionFile.storage_path = `${BUCKET_GAMBAR}/${path}`;
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
