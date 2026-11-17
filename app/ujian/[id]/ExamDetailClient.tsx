
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Clock3,
  Users,
  FileText,
  PencilLine,
  MoreVertical,
  Play,
  Square,
  ClipboardList,
  GraduationCap,
  Timer,
  CheckCircle2,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import BottomNavigation from "@/components/layout/BottomNavigation";
import StatusBadge from "@/components/shared/StatusBadge";

type ExamStatus =
  | "Berlangsung"
  | "Menunggu"
  | "Terjadwal"
  | "Selesai";

type ExamDetail = {
  id: number;
  subject: string;
  className: string;
  type: string;
  date: string;
  time: string;
  duration: number;
  totalQuestions: number;
  totalParticipants: number;
  status: ExamStatus;
  description: string;
  instructions: string[];
};

type ExamDetailClientProps = {
  id: string;
};

const examDetails: ExamDetail[] = [
  {
    id: 1,
    subject: "Matematika",
    className: "X TKJ",
    type: "PAS",
    date: "10 September 2025",
    time: "08.00 - 10.00 WIB",
    duration: 120,
    totalQuestions: 40,
    totalParticipants: 32,
    status: "Berlangsung",
    description:
      "Penilaian Akhir Semester mata pelajaran Matematika untuk kelas X TKJ.",
    instructions: [
      "Pastikan koneksi internet stabil selama ujian berlangsung.",
      "Kerjakan seluruh soal dengan teliti.",
      "Dilarang membuka tab atau aplikasi lain selama ujian.",
      "Pastikan jawaban sudah diperiksa sebelum mengakhiri ujian.",
    ],
  },
  {
    id: 2,
    subject: "Bahasa Indonesia",
    className: "X RPL",
    type: "Ulangan Harian",
    date: "10 September 2025",
    time: "10.30 - 12.30 WIB",
    duration: 120,
    totalQuestions: 30,
    totalParticipants: 36,
    status: "Menunggu",
    description:
      "Ulangan Harian Bahasa Indonesia untuk kelas X RPL.",
    instructions: [
      "Pastikan koneksi internet stabil selama ujian berlangsung.",
      "Baca setiap soal dengan teliti.",
      "Kerjakan soal secara mandiri.",
      "Periksa kembali jawaban sebelum mengakhiri ujian.",
    ],
  },
  {
    id: 3,
    subject: "Pemrograman Dasar",
    className: "XI",
    type: "PAT",
    date: "11 September 2025",
    time: "13.00 - 15.00 WIB",
    duration: 120,
    totalQuestions: 40,
    totalParticipants: 34,
    status: "Terjadwal",
    description:
      "Penilaian Akhir Tahun mata pelajaran Pemrograman Dasar untuk kelas XI.",
    instructions: [
      "Pastikan perangkat dapat digunakan dengan baik.",
      "Baca soal sebelum menentukan jawaban.",
      "Dilarang bekerja sama selama ujian.",
      "Periksa kembali jawaban sebelum dikumpulkan.",
    ],
  },
  {
    id: 4,
    subject: "Fisika",
    className: "X",
    type: "Ulangan Harian",
    date: "12 September 2025",
    time: "08.00 - 10.00 WIB",
    duration: 120,
    totalQuestions: 25,
    totalParticipants: 35,
    status: "Terjadwal",
    description:
      "Ulangan Harian mata pelajaran Fisika untuk kelas X.",
    instructions: [
      "Pastikan koneksi internet stabil.",
      "Kerjakan soal secara mandiri.",
      "Periksa kembali jawaban sebelum dikumpulkan.",
    ],
  },
];

export default function ExamDetailClient({
  id,
}: ExamDetailClientProps) {
  const router = useRouter();

  const [showActions, setShowActions] = useState(false);

  const examId = Number(id);
  const exam = examDetails.find((item) => item.id === examId);

  const handleNavigation = (label: string) => {
    const routes: Record<string, string> = {
      Beranda: "/dashboard",
      Ujian: "/ujian",
      Soal: "/soal",
      Profil: "/profil",
    };

    if (routes[label]) {
      router.push(routes[label]);
    }
  };

 const handleEdit = () => {
    if (!exam) return;

    router.push(`/ujian/${exam.id}/edit`);
  };

  const handleExamAction = () => {
    if (!exam) return;

    if (exam.status === "Berlangsung") {
      alert("Fitur mengakhiri ujian akan dikembangkan selanjutnya.");
    } else if (
      exam.status === "Menunggu" ||
      exam.status === "Terjadwal"
    ) {
      alert("Fitur memulai ujian akan dikembangkan selanjutnya.");
    } else {
      alert("Fitur hasil ujian akan dikembangkan selanjutnya.");
    }
  };

  if (!exam) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F8FC] px-5">
        <div className="max-w-sm text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-[#15395D]">
            <BookOpen size={30} />
          </div>

          <h1 className="mt-5 text-xl font-bold text-[#15395D]">
            Ujian tidak ditemukan
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Data ujian yang kamu cari tidak tersedia.
          </p>

          <button
            onClick={() => router.push("/ujian")}
            className="mt-5 rounded-xl bg-[#15395D] px-5 py-3 text-sm font-medium text-white"
          >
            Kembali ke Daftar Ujian
          </button>
        </div>
      </main>
    );
  }

  const actionLabel =
    exam.status === "Berlangsung"
      ? "Akhiri Ujian"
      : exam.status === "Selesai"
        ? "Lihat Hasil Ujian"
        : "Mulai Ujian";

  const ActionIcon =
    exam.status === "Berlangsung"
      ? Square
      : exam.status === "Selesai"
        ? ClipboardList
        : Play;

  return (
    <main className="min-h-screen bg-[#F5F8FC] text-[#15395D]">
      <div className="min-h-screen flex">
        {/* SIDEBAR DESKTOP */}
          <Sidebar
            activePage="Ujian"
            onNavigate={handleNavigation}
            onAction={(label) =>
              alert(`Fitur ${label} akan dikembangkan selanjutnya.`)
            }
            userName="Budi Santoso"
            userRole="Guru"
          />

          {/* MAIN CONTENT */}
          <div className="flex-1 min-w-0 lg:ml-[250px]">
          {/* TOPBAR DESKTOP */}
          <div className="hidden lg:block">
            <Topbar
                title="Detail Ujian"
                subtitle="Informasi dan pengelolaan ujian"
                onNotificationClick={() =>
                  alert("Belum ada notifikasi baru.")
                }
                userName="Budi Santoso"
                userRole="Guru - SMKN 2 Garut"
              />
          </div>

          {/* HEADER MOBILE */}
          <header className="bg-[#15395D] px-5 pb-5 pt-6 text-white lg:hidden">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/ujian")}
                aria-label="Kembali"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
              >
                <ArrowLeft size={21} />
              </button>

              <div>
                <h1 className="text-lg font-bold">Detail Ujian</h1>
                <p className="mt-1 text-xs text-blue-200">
                  Informasi dan pengelolaan ujian
                </p>
              </div>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <section className="px-5 lg:px-8 xl:px-12 pt-6 lg:pt-9 pb-28 lg:pb-12 max-w-[1450px] mx-auto space-y-5">
            {/* BREADCRUMB */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <button
                onClick={() => router.push("/ujian")}
                className="hover:text-[#15395D]"
              >
                Daftar Ujian
              </button>
              <span>/</span>
              <span className="font-medium text-[#15395D]">
                Detail Ujian
              </span>
            </div>

            {/* EXAM HEADER CARD */}
            <section className="rounded-[20px] border border-[#E5EDF5] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EAF3FC] text-[#2677C7]">
                    <BookOpen size={24} />
                  </div>

                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={exam.status} />
                      <span className="rounded-full bg-[#F2F6FB] px-3 py-1 text-[10px] font-medium text-slate-500">
                        {exam.type}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-[#15395D] sm:text-2xl">
                      {exam.subject}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Kelas {exam.className}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 sm:shrink-0">
                  <button
                    onClick={handleEdit}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#DCE6F0] bg-white px-4 py-3 text-sm font-medium text-[#15395D] transition hover:bg-[#F5F8FC] sm:flex-none"
                  >
                    <PencilLine size={16} />
                    Edit Ujian
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setShowActions(!showActions)}
                      aria-label="Tindakan lainnya"
                      className="flex h-full items-center justify-center rounded-xl border border-[#DCE6F0] px-3 text-[#15395D] hover:bg-[#F5F8FC]"
                    >
                      <MoreVertical size={19} />
                    </button>

                    {showActions && (
                      <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                        <button
                          onClick={() => {
                            setShowActions(false);
                            alert("Fitur duplikasi ujian akan dikembangkan.");
                          }}
                          className="w-full px-4 py-3 text-left text-sm text-gray-600 hover:bg-gray-50"
                        >
                          Duplikasi Ujian
                        </button>

                        <button
                          onClick={() => {
                            setShowActions(false);
                            alert("Fitur hapus ujian akan dikembangkan.");
                          }}
                          className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          Hapus Ujian
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-[#EEF2F7] pt-5">
                <p className="text-sm leading-relaxed text-slate-500">
                  {exam.description}
                </p>
              </div>
            </section>

            {/* EXAM SUMMARY */}
            <section>
              <h3 className="mb-3 text-base font-bold text-[#15395D]">
                Ringkasan Ujian
              </h3>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  {
                    label: "Kelas",
                    value: exam.className,
                    icon: GraduationCap,
                  },
                  {
                    label: "Durasi",
                    value: `${exam.duration} Menit`,
                    icon: Timer,
                  },
                  {
                    label: "Jumlah Soal",
                    value: `${exam.totalQuestions} Soal`,
                    icon: FileText,
                  },
                  {
                    label: "Peserta",
                    value: `${exam.totalParticipants} Siswa`,
                    icon: Users,
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-[#E5EDF5] bg-white p-4 shadow-sm"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF3FC] text-[#2677C7]">
                        <Icon size={18} />
                      </div>

                      <p className="mt-3 text-xs text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#15395D] sm:text-base">
                        {item.value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* SCHEDULE INFORMATION */}
            <section className="rounded-[20px] border border-[#E5EDF5] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-2">
                <CalendarDays size={19} className="text-[#2677C7]" />
                <h3 className="font-bold text-[#15395D]">
                  Jadwal Pelaksanaan
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-400">Tanggal Ujian</p>
                  <div className="mt-2 flex items-center gap-2 text-sm font-medium text-[#15395D]">
                    <CalendarDays size={17} className="text-slate-400" />
                    {exam.date}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Waktu Pelaksanaan
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-sm font-medium text-[#15395D]">
                    <Clock3 size={17} className="text-slate-400" />
                    {exam.time}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Durasi Pengerjaan
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-sm font-medium text-[#15395D]">
                    <Timer size={17} className="text-slate-400" />
                    {exam.duration} menit
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Jumlah Soal</p>
                  <div className="mt-2 flex items-center gap-2 text-sm font-medium text-[#15395D]">
                    <FileText size={17} className="text-slate-400" />
                    {exam.totalQuestions} soal
                  </div>
                </div>
              </div>
            </section>

            {/* EXAM INSTRUCTIONS */}
            <section className="rounded-[20px] border border-[#E5EDF5] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <ClipboardList size={19} className="text-[#2677C7]" />
                <h3 className="font-bold text-[#15395D]">
                  Instruksi Ujian
                </h3>
              </div>

              <div className="space-y-3">
                {exam.instructions.map((instruction, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EAF3FC] text-xs font-semibold text-[#2677C7]">
                      {index + 1}
                    </div>

                    <p className="pt-0.5 text-sm leading-relaxed text-slate-500">
                      {instruction}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* MAIN EXAM ACTION */}
            <section className="rounded-[20px] border border-[#E5EDF5] bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:p-6">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={19} className="text-[#21965F]" />
                  <h3 className="font-bold text-[#15395D]">
                    Tindakan Ujian
                  </h3>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {exam.status === "Berlangsung"
                    ? "Ujian sedang berlangsung. Kamu dapat memantau peserta atau mengakhiri pelaksanaan ujian."
                    : exam.status === "Selesai"
                      ? "Ujian telah selesai. Lihat hasil pelaksanaan ujian."
                      : "Periksa kembali informasi ujian sebelum memulai pelaksanaannya."}
                </p>
              </div>

              <div className="mt-5 flex w-full flex-col gap-2 sm:mt-0 sm:w-auto">
                {exam.status === "Berlangsung" && (
                  <button
                    onClick={() =>
                      router.push(`/ujian/${exam.id}/pemantauan`)
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#15395D] bg-white px-5 py-3 text-sm font-semibold text-[#15395D] transition hover:bg-[#F0F5FA] sm:w-auto"
                  >
                    <Users size={17} />
                    Pantau Ujian
                  </button>
                )}

                <button
                  onClick={handleExamAction}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition sm:w-auto ${
                    exam.status === "Berlangsung"
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-[#15395D] hover:bg-[#102F4D]"
                  }`}
                >
                  <ActionIcon size={17} />
                  {actionLabel}
                </button>
              </div>
            </section>

            {/* BACK BUTTON */}
            <button
              onClick={() => router.push("/ujian")}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#15395D]"
            >
              <ArrowLeft size={17} />
              Kembali ke Daftar Ujian
            </button>
          </section>
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="lg:hidden">
        <BottomNavigation
          activePage="Ujian"
          onNavigate={handleNavigation}
        />
      </div>
    </main>
  );
}
