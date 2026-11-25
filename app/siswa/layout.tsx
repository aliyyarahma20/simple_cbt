import type { ReactNode } from "react";

// Halaman siswa tidak memakai AppShell/AuthProvider (siswa tidak login
// sebagai guru). Alur dijaga oleh useSiswaGuard() di tiap halaman.
export default function SiswaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F8FC] text-[#15395D]">
      {children}
    </div>
  );
}