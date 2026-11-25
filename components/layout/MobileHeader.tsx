"use client";

import { ArrowLeft, Bell, ShieldCheck } from "lucide-react";

import { getInitials } from "@/lib/utils";

type HomeHeaderProps = {
  variant: "home";
  userName: string;
  roleLabel: string;
  onNotificationClick: () => void;
};

type PageHeaderProps = {
  variant: "page";
  title: string;
  subtitle?: string;
  onBack: () => void;
};

type MobileHeaderProps = HomeHeaderProps | PageHeaderProps;

export default function MobileHeader(props: MobileHeaderProps) {
  // BERANDA: kartu sapaan pengguna
  if (props.variant === "home") {
    const { userName, roleLabel, onNotificationClick } = props;

    return (
      <div className="lg:hidden px-5 pt-5">
        <section className="bg-[#15395D] text-white rounded-[24px] p-5">

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={25} />

              <span className="text-xl font-bold tracking-tight">
                SIMPLE-CBT
              </span>
            </div>

            <button
              onClick={onNotificationClick}
              aria-label="Notifikasi"
              className="relative w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"
            >
              <Bell size={19} />

              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F59E42] rounded-full border border-[#15395D]" />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-5">
            <div className="w-11 h-11 rounded-full bg-[#E3EDF9] text-[#15395D] flex items-center justify-center font-bold text-sm shrink-0">
              {getInitials(userName)}
            </div>

            <div className="min-w-0">
              <p className="text-lg font-medium truncate">
                Halo, {userName}
              </p>

              <p className="text-xs text-blue-200 mt-1">
                {roleLabel}
              </p>
            </div>
          </div>

        </section>
      </div>
    );
  }

  // HALAMAN LAIN: tombol kembali + judul + subtitle
  const { title, subtitle, onBack } = props;

  return (
    <header className="lg:hidden bg-[#15395D] text-white px-5 pt-6 pb-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Kembali"
          className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
        >
          <ArrowLeft size={21} />
        </button>

        <div className="min-w-0">
          <h1 className="text-lg font-bold">{title}</h1>

          {subtitle && (
            <p className="text-xs text-blue-200 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  );
}
