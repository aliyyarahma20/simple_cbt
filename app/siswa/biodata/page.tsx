"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound, GraduationCap } from "lucide-react";

import SiswaStepLayout, {
  SiswaLoading,
} from "@/components/siswa/SiswaStepLayout";
import {
  clearSiswaSession,
  updateSiswaSession,
  useSiswaGuard,
} from "@/lib/siswa-session";
import { classOptions } from "@/lib/siswa-mock";

export default function BiodataPage() {
  const session = useSiswaGuard("biodata");

  if (!session) return <SiswaLoading />;

  return (
    <BiodataForm
      token={session.token}
      initialName={session.name}
      initialClass={session.className}
    />
  );
}

type BiodataFormProps = {
  token: string;
  initialName: string;
  initialClass: string;
};

function BiodataForm({
  token,
  initialName,
  initialClass,
}: BiodataFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [className, setClassName] = useState(initialClass);
  const [error, setError] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (trimmedName.length < 3) {
      setError("Nama lengkap minimal 3 karakter.");
      return;
    }

    if (!className) {
      setError("Pilih kelas terlebih dahulu.");
      return;
    }

    updateSiswaSession(() => ({
      name: trimmedName,
      className,
    }));

    router.push("/siswa/konfirmasi");
  };

  const handleBack = () => {
    clearSiswaSession();
    router.replace("/");
  };

  return (
    <SiswaStepLayout
      step={2}
      title="Isi Biodata"
      description="Lengkapi data dirimu sebelum mengikuti ujian."
    >
      <div className="mb-5 flex items-center justify-between rounded-xl bg-[#F2F6FB] px-4 py-3">
        <span className="text-xs text-slate-500">Token ujian</span>
        <span className="text-sm font-bold tracking-wider">{token}</span>
      </div>

      <form onSubmit={handleSubmit} noValidate>

        {/* NAMA */}
        <div className="mb-5">
          <label
            htmlFor="nama"
            className="block text-sm font-semibold mb-2"
          >
            Nama Lengkap
          </label>

          <div className="relative">
            <UserRound
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="nama"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="Masukkan nama lengkap"
              autoComplete="name"
              className="w-full h-[54px] pl-11 pr-4 rounded-xl border border-slate-200 bg-[#F8FAFD] text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#15395D] focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
        </div>

        {/* KELAS */}
        <div className="mb-5">
          <label
            htmlFor="kelas"
            className="block text-sm font-semibold mb-2"
          >
            Kelas
          </label>

          <div className="relative">
            <GraduationCap
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />

            <select
              id="kelas"
              value={className}
              onChange={(e) => {
                setClassName(e.target.value);
                setError("");
              }}
              className="w-full h-[54px] pl-11 pr-4 rounded-xl border border-slate-200 bg-[#F8FAFD] text-sm text-slate-700 outline-none focus:border-[#15395D] focus:ring-2 focus:ring-blue-100 transition"
            >
              <option value="">Pilih kelas</option>

              {classOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600"
          >
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleBack}
            className="h-[52px] sm:flex-1 rounded-xl border border-[#DCE6F0] bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Kembali
          </button>

          <button
            type="submit"
            className="h-[52px] sm:flex-1 rounded-xl bg-[#15395D] hover:bg-[#102E4C] text-sm font-semibold text-white transition"
          >
            Lanjutkan
          </button>
        </div>

      </form>
    </SiswaStepLayout>
  );
}