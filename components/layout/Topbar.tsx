
"use client";

import { Bell } from "lucide-react";

type TopbarProps = {
  title: string;
  subtitle: string;
  onNotificationClick: () => void;
  userName?: string;
  userRole?: string;
};

export default function Topbar({
  title,
  subtitle,
  onNotificationClick,
  userName = "Budi Santoso",
  userRole = "Guru - SMKN 2 Garut",
}: TopbarProps) {
  const initials = userName
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="hidden lg:flex h-[88px] bg-[#15395D] text-white border-b border-white/10 items-center justify-between px-8 xl:px-12">

      <div>
        <h1 className="text-lg font-bold">
          {title}
        </h1>
        <p className="text-xs text-blue-200 mt-1">
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-5">

        <button
          onClick={onNotificationClick}
          aria-label="Notifikasi"
          className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition"
        >
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#F59E42] border-2 border-[#15395D]" />
        </button>

        <div className="h-9 w-px bg-white/20" />

        <div className="flex items-center gap-3">

          <div className="w-10 h-10 rounded-full bg-[#E3EDF9] text-[#15395D] flex items-center justify-center font-bold text-sm">
            {initials}
          </div>

          <div>
            <p className="text-sm font-semibold">
              {userName}
            </p>
            <p className="text-xs text-blue-200">
              {userRole}
            </p>
          </div>

        </div>

      </div>

    </header>
  );
}
