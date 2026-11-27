
"use client";

import { useState } from "react";

export default function MasukUjianPage() {
  const [token, setToken] = useState("");
  const [nama, setNama] = useState("");
  const [nis, setNis] = useState("");
  const [kelas, setKelas] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validasi token dan pembuatan sesi akan dilakukan oleh backend.
    alert("Form berhasil diisi. Validasi token akan dihubungkan ke backend.");
  };

  return (
    <main className="min-h-screen bg-[#F5F8FC] flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#E5EDF5] p-6 sm:p-8">
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-[#15395D]">
            Masuk Ujian
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Masukkan token ujian dan lengkapi identitas untuk melanjutkan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="token" className="block text-sm font-medium mb-2">
              Token Ujian
            </label>
            <input
              id="token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Masukkan token ujian"
              required
              className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-[#15395D]"
            />
          </div>

          <div>
            <label htmlFor="nama" className="block text-sm font-medium mb-2">
              Nama Lengkap
            </label>
            <input
              id="nama"
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Masukkan nama lengkap"
              required
              className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-[#15395D]"
            />
          </div>

          <div>
            <label htmlFor="nis" className="block text-sm font-medium mb-2">
              NIS
            </label>
            <input
              id="nis"
              type="text"
              value={nis}
              onChange={(e) => setNis(e.target.value)}
              placeholder="Masukkan NIS"
              required
              className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-[#15395D]"
            />
          </div>

          <div>
            <label htmlFor="kelas" className="block text-sm font-medium mb-2">
              Kelas
            </label>
            <input
              id="kelas"
              type="text"
              value={kelas}
              onChange={(e) => setKelas(e.target.value)}
              placeholder="Contoh: XII TKJ"
              required
              className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-[#15395D]"
            />
          </div>

          <button
            type="submit"
            className="w-full h-11 bg-[#15395D] text-white font-semibold rounded-xl hover:bg-[#1D4B78] transition"
          >
            Masuk Ujian
          </button>
        </form>
      </div>
    </main>
  );
}
