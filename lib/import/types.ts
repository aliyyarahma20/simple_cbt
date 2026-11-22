export type Level = "GREEN" | "YELLOW" | "RED";

export interface MetaItem {
  nilai: string | null;
  conf: number;
  sumber: string | null;
}

export interface ImportRows {
  exams: Record<string, any>[];
  import_batches: Record<string, any>[];
  questions: Record<string, any>[];
  question_options: Record<string, any>[];
  question_files: Record<string, any>[];
}

export interface RingkasanSoal {
  jumlah_pg: number;
  jumlah_esai: number;
  jumlah_lain: number;
  jumlah_gambar: number;
  gambar_soal: number;
  gambar_bacaan: number;
  jumlah_rumus: number;
  rumus_soal: number;
  rumus_bacaan: number;
  jumlah_bacaan: number;
  bacaan: {
    mulai_no: number;
    cuplikan: string;
    gambar: number;
    rumus: number;
  }[];
  acak_diizinkan: boolean;
}

export interface ParserFile {
  file: string;
  level: Level;
  jumlah_soal: number;
  meta: Record<"mapel" | "kelas" | "jenis" | "guru", MetaItem | undefined>;
  info: Record<string, string>;
  warnings: string[];
  errors: string[];
  soal?: unknown[];
  images?: Record<string, string>;
  rows?: ImportRows;
  ringkasan?: RingkasanSoal;
}

export interface ParserBatch {
  job_id: string;
  total_file: number;
  ringkasan: Record<Level, number>;
  files: ParserFile[];
}

export interface PratinjauFile {
  file: string;
  level: Level;
  jumlah_soal: number;
  mapel: string | null;
  kelas: string | null;
  jenis: string | null;
  guru: string | null;
  ringkasan?: RingkasanSoal;
  catatan: string[];
}

export interface HasilSimpan {
  file: string;
  status: "TERSIMPAN" | "DITOLAK" | "DILEWATI";
  alasan?: string;
  exam_id?: string;
  jumlah_soal?: number;
}
