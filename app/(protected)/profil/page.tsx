"use client";

import { Mail, School, ShieldCheck, LogOut } from "lucide-react";

import { useAuth } from "@/components/providers/AuthProvider";
import { getInitials } from "@/lib/utils";

export default function ProfilePage() {
  const { user, roleLabel, logout, isLoggingOut } = useAuth();

  // Saat auth masih loading, layar loading AppShell menutupi halaman ini.
  if (!user) return null;

  const infoItems = [
    { label: "Email", value: user.email, icon: Mail },
    { label: "Peran", value: roleLabel, icon: ShieldCheck },
    { label: "Sekolah", value: "SMKN 2 Garut", icon: School },
  ];

  return (
    <div className="px-5 lg:px-8 xl:px-12 pt-6 lg:pt-9 pb-28 lg:pb-12 max-w-[1450px] mx-auto">
      <div className="max-w-2xl space-y-5">

        {/* KARTU PROFIL */}
        <section className="rounded-[20px] border border-[#E5EDF5] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#E3EDF9] text-xl font-bold text-[#15395D]">
              {getInitials(user.full_name)}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-[#15395D] sm:text-xl">
                {user.full_name}
              </h2>
              <span className="mt-1.5 inline-flex rounded-full bg-[#EAF3FC] px-3 py-1 text-xs font-medium text-[#2677C7]">
                {roleLabel}
              </span>
            </div>
          </div>
        </section>

        {/* INFORMASI AKUN */}
        <section className="rounded-[20px] border border-[#E5EDF5] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 font-bold text-[#15395D]">Informasi Akun</h3>

          <div className="divide-y divide-[#EEF2F7]">
            {infoItems.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF3FC] text-[#2677C7]">
                    <Icon size={18} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">{item.label}</p>
                    <p className="truncate text-sm font-medium text-[#15395D]">
                      {item.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* LOGOUT (hanya mobile, desktop memakai tombol di Sidebar) */}
        <button
          onClick={logout}
          disabled={isLoggingOut}
          className="lg:hidden flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3.5 text-sm font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut size={18} />
          {isLoggingOut ? "Keluar..." : "Keluar"}
        </button>

      </div>
    </div>
  );
}