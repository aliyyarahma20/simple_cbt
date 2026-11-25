"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  Clock3,
  FileText,
  ShieldAlert,
  Timer,
} from "lucide-react";

import SiswaStepLayout, {
  SiswaLoading,
} from "@/components/siswa/SiswaStepLayout";
import {
  updateSiswaSession,
  useSiswaGuard,
} from "@/lib/siswa-session";
import { siswaExam, siswaQuestions } from "@/lib/siswa-mock";

export default function KonfirmasiPage() {
  const router = useRouter();
  const session = useSiswaGuard("konfirmasi");

  const [agreed, setAgreed] = useState(false);

  if (!session) return <SiswaLoading />;

  const { lock } = siswaExam;

  const lockRules = [
    lock.fullscreen && "Ujian wajib dikerjakan dalam mode layar penuh.",
    lock.tabSwitch && "Dilarang berpindah tab atau membuka aplikasi lain.",
    lock.windowBlur && "Jendela ujian harus tetap aktif sepanjang waktu.",
    lock.copyPaste && "Menyalin dan menempel dinonaktifkan.",
    lock.rightClick && "Klik kanan dinonaktifkan.",
  ].filter(Boolean) as string[];

  const infoItems = [
    { label: "Tanggal", value: siswaExam.date, icon: CalendarDays },
    { label: "Waktu", value: siswaExam.time, icon: Clock3 },
    {
      label: "Durasi",
      value: `${siswaExam.durationMinutes} menit`,
      icon: Timer,
    },
    {
      label: "Jumlah Soal",
      value: `${siswaQuestions.length} soal`,
      icon: FileText,
    },
  ];

  const handleStart = () => {
    if (!agreed) return;

    // Harus dipanggil langsung dari klik pengguna.
    // Tidak semua browser mendukung (mis. iPhone), jadi hasilnya diabaikan.
    if (lock.fullscreen) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }

    updateSiswaSession(() => ({ startedAt: Date.now() }));

    router.push("/siswa/ujian");
  };

  return (
    <SiswaStepLayout
      step={3}
      title="Konfirmasi Ujian"
      description="Periksa informasi ujian dan baca instruksi sebelum memulai."
      maxWidth="max-w-[640px]"
    >
      {/* EXAM HEADER */}
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EAF3FC] text-[#2677C7]">
          <BookOpen size={24} />
        </div>

        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-[#F2F6FB] px-3 py-1 text-[10px] font-medium text-slate-500">
            {siswaExam.type}
          </span>

          <h2 className="mt-1.5 text-lg font-bold">
            {siswaExam.subject}
          </h2>

          <p className="text-sm text-slate-500">
            Kelas {siswaExam.className} • {siswaExam.teacher}
          </p>
        </div>
      </div>

      {/* EXAM INFO */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {infoItems.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-xl border border-[#E5EDF5] p-3"
            >
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Icon size={14} />
                {item.label}
              </div>

              <p className="mt-1.5 text-sm font-semibold">
                {item.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* PESERTA */}
      <div className="mt-5 rounded-xl bg-[#F2F6FB] p-4">
        <p className="text-xs text-slate-400">Peserta</p>

        <p className="mt-1 text-sm font-bold">{session.name}</p>

        <p className="mt-0.5 text-xs text-slate-500">
          Kelas {session.className} • Token {session.token}
        </p>
      </div>

      {/* INSTRUKSI */}
      <div className="mt-6">
        <h3 className="text-sm font-bold">Instruksi Ujian</h3>

        <ol className="mt-3 space-y-3">
          {siswaExam.instructions.map((item, index) => (
            <li key={item} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EAF3FC] text-xs font-semibold text-[#2677C7]">
                {index + 1}
              </span>

              <p className="pt-0.5 text-sm leading-relaxed text-slate-500">
                {item}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* EXAM LOCK */}
      {lockRules.length > 0 && (
        <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center gap-2 text-orange-700">
            <ShieldAlert size={18} />
            <h3 className="text-sm font-bold">Exam Lock Aktif</h3>
          </div>

          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-orange-800">
            {lockRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}

            <li>
              Pelanggaran dicatat dan dilaporkan ke pengawas. Batas
              pelanggaran: {lock.violationLimit} kali.
            </li>
          </ul>
        </div>
      )}

      {/* PERSETUJUAN */}
      <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#15395D]"
        />
        Saya telah membaca dan memahami instruksi ujian.
      </label>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => router.push("/siswa/biodata")}
          className="h-[52px] sm:flex-1 rounded-xl border border-[#DCE6F0] bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          Ubah Biodata
        </button>

        <button
          type="button"
          onClick={handleStart}
          disabled={!agreed}
          className="h-[52px] sm:flex-1 rounded-xl bg-[#15395D] hover:bg-[#102E4C] text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Mulai Ujian
        </button>
      </div>
    </SiswaStepLayout>
  );
}