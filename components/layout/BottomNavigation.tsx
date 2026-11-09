
"use client";

import {
  Home,
  ClipboardList,
  Files,
  UserRound,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

type BottomNavigationProps = {
  activePage: string;
  onNavigate: (label: string) => void;
};

const navigation: {
  label: string;
  icon: LucideIcon;
}[] = [
  { label: "Beranda", icon: Home },
  { label: "Ujian", icon: ClipboardList },
  { label: "Soal", icon: Files },
  { label: "Profil", icon: UserRound },
];

export default function BottomNavigation({
  activePage,
  onNavigate,
}: BottomNavigationProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E7EEF6] px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]">

      <div className="max-w-[500px] mx-auto grid grid-cols-4">

        {navigation.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.label;

          return (
            <button
              key={item.label}
              onClick={() => onNavigate(item.label)}
              className="flex flex-col items-center gap-1.5 py-1"
            >

              <div
                className={`w-11 h-8 rounded-full flex items-center justify-center transition ${
                  active
                    ? "bg-[#EAF3FC] text-[#15395D]"
                    : "text-slate-400"
                }`}
              >
                <Icon
                  size={21}
                  strokeWidth={active ? 2.2 : 1.8}
                />
              </div>

              <span
                className={`text-[10px] ${
                  active
                    ? "text-[#15395D] font-medium"
                    : "text-slate-400"
                }`}
              >
                {item.label}
              </span>

            </button>
          );
        })}

      </div>

    </nav>
  );
}
