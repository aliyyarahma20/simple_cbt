
"use client";

import { useState } from "react";
import {
  ShieldCheck,
  UserRound,
  LockKeyhole,
  Eye,
  EyeOff,
} from "lucide-react";

type UserRole = "Guru" | "Siswa";

export default function LoginPage() {
  const [role, setRole] = useState<UserRole>("Guru");
  const [showPassword, setShowPassword] = useState(false);

  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setIdentity("");
    setPassword("");
    setToken("");
    setShowPassword(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (role === "Guru") {
      console.log("Login Guru:", { identity, password });
      alert("Login belum terhubung dengan backend.");
    } else {
      console.log("Token Ujian:", token);
      alert("Validasi token belum terhubung dengan backend.");
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F8FC] flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10 lg:py-12">

      {/* MAIN CONTAINER */}
      <div className="w-full max-w-[1100px] grid grid-cols-1 md:grid-cols-2 bg-white rounded-[28px] md:rounded-[32px] overflow-hidden shadow-[0_15px_50px_rgba(21,57,93,0.08)]">

        {/* LEFT PANEL - BRANDING */}
        <section className="relative bg-[#15395D] text-white text-center flex flex-col items-center justify-center px-6 pt-10 pb-28 md:py-16 md:px-10 md:min-h-[650px]">

          {/* Logo */}
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck size={32} strokeWidth={1.8} />

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              SIMPLE-CBT
            </h1>
          </div>

          {/* Accent */}
          <div className="w-8 h-[3px] bg-[#F59E42] rounded-full mt-7 mb-5" />

          {/* Greeting */}
          <h2 className="text-2xl md:text-3xl lg:text-[34px] font-bold">
            Selamat Datang!
          </h2>

          <p className="text-sm md:text-base text-blue-100 mt-3 leading-relaxed max-w-[320px]">
            Masuk ke platform ujian online SMKN 2 Garut
          </p>

          {/* Desktop Additional Branding */}
          <div className="hidden md:block mt-14 max-w-[310px]">
            <div className="flex justify-center mb-5">
              <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
                <ShieldCheck size={44} strokeWidth={1.3} />
              </div>
            </div>

            <p className="text-sm text-blue-100 leading-relaxed">
              Sistem ujian berbasis komputer untuk mendukung
              pelaksanaan evaluasi pembelajaran yang lebih
              terstruktur dan aman.
            </p>
          </div>

          {/* Mobile Accent Decoration */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 hidden md:block">
            <div className="flex gap-2">
              <span className="w-2 h-2 rounded-full bg-white/80" />
              <span className="w-2 h-2 rounded-full bg-white/30" />
              <span className="w-2 h-2 rounded-full bg-white/30" />
            </div>
          </div>

        </section>

        {/* RIGHT PANEL - LOGIN FORM */}
        <section className="-mt-8 md:mt-0 relative bg-white rounded-t-[28px] md:rounded-none px-6 py-8 sm:px-10 md:px-10 lg:px-14 md:flex md:flex-col md:justify-center">

          <div className="w-full max-w-[390px] mx-auto">

            {/* Form Heading */}
            <div className="mb-7">
              <h2 className="text-xl md:text-2xl font-bold text-[#15395D]">
                {role === "Guru" ? "Masuk ke Akun" : "Masuk Ujian"}
              </h2>

              <p className="text-sm text-slate-400 mt-2">
                {role === "Guru"
                  ? "Silakan masuk menggunakan akun Anda."
                  : "Masukkan token untuk mengikuti ujian."}
              </p>
            </div>

            <form onSubmit={handleSubmit}>

              {/* ROLE SELECTOR */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#F0F4F8] rounded-xl mb-7">

                {(["Guru", "Siswa"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleRoleChange(item)}
                    aria-pressed={role === item}
                    className={`py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      role === item
                        ? "bg-[#15395D] text-white shadow-sm"
                        : "text-slate-500 hover:text-[#15395D]"
                    }`}
                  >
                    {item}
                  </button>
                ))}

              </div>

              {/* GURU FORM */}
              {role === "Guru" ? (
                <div className="animate-in fade-in duration-300">

                  {/* EMAIL / NIP */}
                  <div className="mb-5">

                    <label className="block text-sm font-semibold text-[#15395D] mb-2">
                      Email / NIP
                    </label>

                    <div className="relative">

                      <UserRound
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        type="text"
                        required
                        value={identity}
                        onChange={(e) => setIdentity(e.target.value)}
                        placeholder="Masukkan NIP atau Email"
                        autoComplete="username"
                        className="w-full h-[54px] pl-11 pr-4 rounded-xl border border-slate-200 bg-[#F8FAFD] text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#15395D] focus:ring-2 focus:ring-blue-100 transition"
                      />

                    </div>
                  </div>

                  {/* PASSWORD */}
                  <div className="mb-4">

                    <label className="block text-sm font-semibold text-[#15395D] mb-2">
                      Kata Sandi
                    </label>

                    <div className="relative">

                      <LockKeyhole
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Masukkan kata sandi"
                        autoComplete="current-password"
                        className="w-full h-[54px] pl-11 pr-12 rounded-xl border border-slate-200 bg-[#F8FAFD] text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#15395D] focus:ring-2 focus:ring-blue-100 transition"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword
                            ? "Sembunyikan kata sandi"
                            : "Tampilkan kata sandi"
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#15395D] transition"
                      >
                        {showPassword ? (
                          <EyeOff size={19} />
                        ) : (
                          <Eye size={19} />
                        )}
                      </button>

                    </div>
                  </div>

                  {/* FORGOT PASSWORD */}
                  <div className="flex justify-end mb-7">
                    <button
                      type="button"
                      onClick={() =>
                        alert("Silakan hubungi Admin Sekolah untuk bantuan kata sandi.")
                      }
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      Lupa Kata Sandi?
                    </button>
                  </div>

                </div>

              ) : (

                /* SISWA FORM */
                <div className="animate-in fade-in duration-300">

                  <div className="mb-7">

                    <label className="block text-sm font-semibold text-[#15395D] mb-2">
                      Token Ujian
                    </label>

                    <div className="relative">

                      <LockKeyhole
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        type="text"
                        required
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Masukkan token ujian"
                        autoComplete="off"
                        className="w-full h-[54px] pl-11 pr-4 rounded-xl border border-slate-200 bg-[#F8FAFD] text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#15395D] focus:ring-2 focus:ring-blue-100 transition uppercase"
                      />

                    </div>

                    <p className="text-xs text-slate-400 mt-2">
                      Masukkan token yang diberikan oleh guru atau POKJA.
                    </p>

                  </div>

                </div>

              )}

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                className="w-full h-[54px] bg-[#15395D] hover:bg-[#102E4C] active:scale-[0.99] text-white font-semibold rounded-xl transition-all duration-200"
              >
                {role === "Guru" ? "Masuk" : "Lanjutkan"}
              </button>

            </form>

            {/* FOOTER */}
            <footer className="text-center mt-8 text-sm">

              <p className="text-slate-400 mb-1">
                Butuh bantuan?
              </p>

              <button
                type="button"
                onClick={() =>
                  alert("Silakan hubungi Admin Sekolah.")
                }
                className="text-[#15395D] font-medium underline underline-offset-2 hover:text-blue-700"
              >
                Hubungi Admin Sekolah
              </button>

            </footer>

          </div>

        </section>

      </div>

    </main>
  );
}
