
"use client";

import {
  ShieldCheck,
  Home,
  ClipboardList,
  Files,
  UserRound,
  FilePenLine,
  Upload,
  ChartNoAxesCombined,
  SlidersHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type SidebarProps = {
  activePage: string;
  onNavigate: (label: string) => void;
  onAction?: (label: string) => void;
  userName?: string;
  userRole?: string;
};

const navigation: { label: string; icon: LucideIcon }[] = [
  { label: "Beranda", icon: Home },
  { label: "Ujian", icon: ClipboardList },
  { label: "Soal", icon: Files },
  { label: "Profil", icon: UserRound },
];

const quickActions: { label: string; icon: LucideIcon }[] = [
  { label: "Kelola Soal", icon: FilePenLine },
  { label: "Impor Massal", icon: Upload },
  { label: "Hasil Ujian", icon: ChartNoAxesCombined },
  { label: "Pengaturan", icon: SlidersHorizontal },
];

export default function Sidebar({
  activePage,
  onNavigate,
  onAction,
  userName = "Budi Santoso",
  userRole = "Guru",
}: SidebarProps) {
  const initials = userName
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="hidden lg:flex w-[250px] shrink-0 bg-white border-r border-slate-100 flex-col fixed inset-y-0 left-0 z-30">

      {/* LOGO */}
      <div className="h-[88px] shrink-0 bg-[#15395D] text-white flex items-center px-7 gap-3 border-b border-white/10">
        <ShieldCheck size={32} strokeWidth={1.8} />
        <span className="text-xl font-bold tracking-tight">
          SIMPLE-CBT
        </span>
      </div>

      {/* NAVIGATION */}
      <div className="px-5 py-8 flex-1 overflow-y-auto">

        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-4">
          Menu Utama
        </p>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.label;

            return (
              <button
                key={item.label}
                onClick={() => onNavigate(item.label)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                  active
                    ? "bg-[#EAF2FC] text-[#15395D]"
                    : "text-slate-500 hover:bg-slate-50 hover:text-[#15395D]"
                }`}
              >
                <Icon size={19} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 my-7" />

        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-4">
          Akses Cepat
        </p>

        <div className="space-y-2">
          {quickActions.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                onClick={() =>
                  onAction?.(item.label)
                }
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-500 hover:bg-slate-50 hover:text-[#15395D] transition"
              >
                <Icon size={19} />
                {item.label}
              </button>
            );
          })}
        </div>

      </div>

      {/* USER PROFILE */}
      <div className="p-5 border-t border-slate-100">
        <div className="flex items-center gap-3">

          <div className="w-10 h-10 rounded-full bg-[#E3EDF9] text-[#15395D] flex items-center justify-center font-bold text-sm shrink-0">
            {initials}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              {userName}
            </p>
            <p className="text-xs text-slate-400">
              {userRole}
            </p>
          </div>

        </div>
      </div>

    </aside>
  );
}
