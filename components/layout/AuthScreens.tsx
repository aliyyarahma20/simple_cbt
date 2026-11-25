import { ShieldCheck } from "lucide-react";

export function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F5F8FC] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#E3EDF9] border-t-[#15395D] rounded-full animate-spin mx-auto" />

        <p className="mt-4 text-sm font-medium text-[#15395D]">
          Memuat aplikasi...
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Memeriksa sesi pengguna
        </p>
      </div>
    </div>
  );
}

type AuthErrorScreenProps = {
  message: string;
  onRetry: () => void;
  onBackToLogin: () => void;
};

export function AuthErrorScreen({
  message,
  onRetry,
  onBackToLogin,
}: AuthErrorScreenProps) {
  return (
    <div className="min-h-screen bg-[#F5F8FC] flex items-center justify-center px-5">
      <div className="w-full max-w-md bg-white border border-[#E5EDF5] rounded-2xl p-7 text-center shadow-sm">
        <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
          <ShieldCheck size={28} />
        </div>

        <h1 className="text-lg font-bold text-[#15395D] mt-4">
          Gagal Memuat Aplikasi
        </h1>

        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          {message || "Data pengguna tidak ditemukan."}
        </p>

        <button
          onClick={onRetry}
          className="w-full mt-6 bg-[#15395D] hover:bg-[#1D4B78] text-white font-medium text-sm py-3 rounded-xl transition"
        >
          Coba Lagi
        </button>

        <button
          onClick={onBackToLogin}
          className="w-full mt-3 text-sm text-slate-500 hover:text-[#15395D] font-medium"
        >
          Kembali ke Login
        </button>
      </div>
    </div>
  );
}
