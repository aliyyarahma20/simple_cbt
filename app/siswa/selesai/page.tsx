"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { SiswaLoading } from "@/components/siswa/SiswaStepLayout";
import { clearSiswaSession, useSiswaGuard } from "@/lib/siswa-session";
import { siswaExam, siswaQuestions } from "@/lib/siswa-mock";

export default function FinishedPage() {
  const router = useRouter();
  const session = useSiswaGuard("selesai");

  if (!session) return <SiswaLoading />;

  const answeredCount = siswaQuestions.filter(
    (item) => session.answers[item.id] !== undefined
  ).length;

  const submittedAt = session.finishedAt
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(session.finishedAt))
    : "-";

  const rows = [
    { label: "Nama", value: session.name },
    { label: "Kelas", value: session.className },
    {
      label: "Ujian",
      value: `${siswaExam.subject} - ${siswaExam.type}`,
    },
    {
      label: "Soal terjawab",
      value: `${answeredCount} dari ${siswaQuestions.length}`,
    },
    { label: "Dikumpulkan", value: submittedAt },
  ];

  const handleBackToHome = () => {
    clearSiswaSession();
    router.replace("/");
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-[460px] rounded-[24px] border border-[#E5EDF5] bg-white p-6 text-center shadow-[0_15px_50px_rgba(21,57,93,0.06)] sm:p-8">

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F7F0] text-[#21965F]">
          <CheckCircle2 size={36} />
        </div>

        <h1 className="mt-5 text-xl font-bold sm:text-2xl">
          Ujian Selesai
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Jawabanmu berhasil dikumpulkan. Terima kasih sudah
          mengerjakan ujian dengan jujur.
        </p>

        <dl className="mt-6 divide-y divide-[#EEF2F7] rounded-xl bg-[#F8FAFD] px-4 text-left">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 py-3 text-sm"
            >
              <dt className="text-slate-400">{row.label}</dt>
              <dd className="text-right font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>

        <button
          onClick={handleBackToHome}
          className="mt-6 h-[52px] w-full rounded-xl bg-[#15395D] text-sm font-semibold text-white transition hover:bg-[#102E4C]"
        >
          Kembali ke Halaman Utama
        </button>

      </section>
    </main>
  );
}