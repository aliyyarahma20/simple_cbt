// ==========================================
// DATA CONTOH UNTUK HALAMAN SISWA
// Ganti dengan data dari API saat backend siap.
// ==========================================

export const siswaExam = {
  id: 1,
  subject: "Matematika",
  className: "X TKJ",
  type: "PAS",
  teacher: "Budi Santoso",
  date: "10 September 2025",
  time: "08.00 - 10.00 WIB",
  durationMinutes: 120,
  instructions: [
    "Pastikan koneksi internet stabil selama ujian berlangsung.",
    "Kerjakan seluruh soal dengan teliti.",
    "Jawaban tersimpan otomatis setiap kamu memilih pilihan.",
    "Periksa kembali jawaban sebelum mengumpulkan ujian.",
  ],
  // Pengaturan Exam Lock (sama dengan pengaturan di halaman Edit Ujian guru)
  lock: {
    tabSwitch: true,
    fullscreen: true,
    windowBlur: true,
    copyPaste: false,
    rightClick: false,
    violationLimit: 3,
    violationAction: "warning" as "warning" | "submit",
  },
};

export const classOptions = [
  "X TKJ",
  "X RPL",
  "XI TKJ",
  "XI RPL",
  "XII TKJ",
  "XII RPL",
];

export type SiswaQuestion = {
  id: number;
  text: string;
  options: string[];
};

export const siswaQuestions: SiswaQuestion[] = [
  {
    id: 1,
    text: "Hasil dari 2³ × 2² adalah ...",
    options: ["8", "16", "32", "64"],
  },
  {
    id: 2,
    text: "Nilai x yang memenuhi persamaan 3x + 6 = 21 adalah ...",
    options: ["3", "5", "7", "9"],
  },
  {
    id: 3,
    text: "Bentuk sederhana dari (a²)³ adalah ...",
    options: ["a⁵", "a⁶", "a⁸", "a⁹"],
  },
  {
    id: 4,
    text: "Akar-akar dari persamaan x² − 5x + 6 = 0 adalah ...",
    options: ["1 dan 6", "2 dan 3", "−2 dan −3", "−1 dan 6"],
  },
  {
    id: 5,
    text: "Jika f(x) = 2x + 3, maka nilai f(4) adalah ...",
    options: ["8", "9", "11", "14"],
  },
  {
    id: 6,
    text: "Gradien garis dengan persamaan y = 3x − 2 adalah ...",
    options: ["−2", "−3", "2", "3"],
  },
  {
    id: 7,
    text: "Nilai dari √144 adalah ...",
    options: ["10", "12", "14", "16"],
  },
  {
    id: 8,
    text: "25% dari 80 adalah ...",
    options: ["15", "20", "25", "30"],
  },
  {
    id: 9,
    text: "Jumlah besar sudut dalam sebuah segitiga adalah ...",
    options: ["90°", "180°", "270°", "360°"],
  },
  {
    id: 10,
    text: "Nilai dari log 100 (basis 10) adalah ...",
    options: ["1", "2", "10", "100"],
  },
];