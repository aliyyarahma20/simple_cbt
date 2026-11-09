
"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  FilePenLine,
  Upload,
  ChartNoAxesCombined,
  SlidersHorizontal,
  Calculator,
  BookOpen,
  Users,
  Clock3,
  ChevronRight,
  PencilLine,
  Sparkles,
  ShieldCheck,
  X,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import BottomNavigation from "@/components/layout/BottomNavigation";

type Exam = {
  id: number;
  subject: string;
  className: string;
  time: string;
  status: "Berlangsung" | "Menunggu";
  type: "math" | "language";
};

const exams: Exam[] = [
  {
    id: 1,
    subject: "Matematika",
    className: "X RPL 1",
    time: "08.00 – 09.30 WIB",
    status: "Berlangsung",
    type: "math",
  },
  {
    id: 2,
    subject: "Bahasa Indonesia",
    className: "XI TKJ 2",
    time: "10.00 – 11.30 WIB",
    status: "Menunggu",
    type: "language",
  },
  {
    id: 3,
    subject: "Pemrograman Web",
    className: "XII RPL 1",
    time: "13.00 – 14.30 WIB",
    status: "Menunggu",
    type: "language",
  },
];

const quickActions = [
  {
    label: "Kelola Soal",
    icon: FilePenLine,
    color: "blue",
    description: "Buat dan kelola bank soal",
  },
  {
    label: "Impor Massal",
    icon: Upload,
    color: "blue",
    description: "Impor soal sekaligus",
  },
  {
    label: "Hasil Ujian",
    icon: ChartNoAxesCombined,
    color: "orange",
    description: "Lihat hasil dan nilai ujian",
  },
  {
    label: "Pengaturan",
    icon: SlidersHorizontal,
    color: "blue",
    description: "Atur preferensi akun",
  },
];

const subscribe = () => () => {};

const getClientDate = () => {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
};

const getServerDate = () => "";

export default function DashboardPage() {
  const router = useRouter();

  const [showNotifications, setShowNotifications] = useState(false);

  const today = useSyncExternalStore(
    subscribe,
    getClientDate,
    getServerDate
  );

  const handleNavigation = (label: string) => {
    const routes: Record<string, string> = {
      Beranda: "/dashboard",
      Ujian: "/ujian",
      Soal: "/soal",
      Profil: "/profil",
    };

    if (routes[label]) {
      router.push(routes[label]);
    } else {
      alert(`Halaman ${label} akan dikembangkan selanjutnya.`);
    }
  };

  const handleAction = (label: string) => {
    alert(`Fitur ${label} akan dikembangkan selanjutnya.`);
  };

  return (
    <main className="min-h-screen bg-[#F5F8FC] text-[#15395D]">

      <div className="min-h-screen flex">

        {/* REUSABLE SIDEBAR */}
        <Sidebar
          activePage="Beranda"
          onNavigate={handleNavigation}
          onAction={handleAction}
          userName="Budi Santoso"
          userRole="Guru"
        />

        {/* MAIN CONTENT */}
        <div className="flex-1 min-w-0 lg:ml-[250px]">

          {/* REUSABLE DESKTOP TOPBAR */}
          <Topbar
            title="Beranda"
            subtitle="Selamat datang di Simple-CBT"
            onNotificationClick={() =>
              setShowNotifications(!showNotifications)
            }
            userName="Budi Santoso"
            userRole="Guru - SMKN 2 Garut"
          />

          {/* MOBILE HEADER */}
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
                  onClick={() =>
                    setShowNotifications(!showNotifications)
                  }
                  aria-label="Notifikasi"
                  className="relative w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"
                >
                  <Bell size={19} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F59E42] rounded-full border border-[#15395D]" />
                </button>

              </div>

              <div className="flex items-center gap-3 mt-5">

                <div className="w-11 h-11 rounded-full bg-[#E3EDF9] text-[#15395D] flex items-center justify-center font-bold text-sm shrink-0">
                  BS
                </div>

                <div>
                  <p className="text-lg font-medium">
                    Halo, Budi Santoso
                  </p>
                  <p className="text-xs text-blue-200 mt-1">
                    Guru - SMKN 2 Garut
                  </p>
                </div>

              </div>

            </section>

          </div>

          {/* NOTIFICATION PANEL */}
          {showNotifications && (
            <div className="mx-5 lg:mx-8 mt-3 bg-white rounded-2xl border border-slate-100 shadow-lg p-4 relative z-20">

              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm">
                  Notifikasi
                </p>

                <button
                  onClick={() => setShowNotifications(false)}
                  aria-label="Tutup notifikasi"
                >
                  <X size={17} />
                </button>
              </div>

              <p className="text-sm text-slate-500">
                Belum ada notifikasi baru.
              </p>

            </div>
          )}

          {/* DASHBOARD CONTENT */}
          <div className="px-5 lg:px-8 xl:px-12 pt-4 lg:pt-8 pb-28 lg:pb-10 max-w-[1450px] mx-auto">

            {/* WELCOME BANNER */}
            <section className="bg-white border border-[#E7EEF6] rounded-[22px] p-5 sm:p-6 lg:p-8 shadow-[0_6px_20px_rgba(21,57,93,0.04)]">

              <div className="flex items-center justify-between gap-3">

                <div className="max-w-[420px]">

                  <h2 className="text-xl sm:text-2xl font-bold leading-tight">
                    Ujian tertata,
                    <br />
                    mengajar lebih
                    <br className="sm:hidden" />
                    tenang.
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-400 mt-3 leading-relaxed">
                    Ada 3 ujian hari ini. Pantau semuanya dalam satu tempat.
                  </p>

                  <button
                    onClick={() => handleNavigation("Ujian")}
                    className="mt-4 inline-flex items-center gap-2 bg-[#F28B3C] hover:bg-[#E97829] text-white text-xs sm:text-sm font-medium px-4 py-3 rounded-xl transition"
                  >
                    Lihat Semua Ujian
                    <ChevronRight size={17} />
                  </button>

                </div>

                {/* BANNER ILLUSTRATION */}
                <div className="w-[115px] sm:w-[150px] lg:w-[190px] h-[130px] sm:h-[150px] lg:h-[170px] shrink-0 relative flex items-center justify-center">

                  <div className="w-[82px] h-[105px] sm:w-[100px] sm:h-[125px] lg:w-[120px] lg:h-[145px] bg-[#EAF3FC] border-[4px] border-[#244A70] rounded-[13px] rotate-[-7deg] flex items-center justify-center relative shadow-sm">

                    <div className="absolute -top-2 w-7 h-3 bg-[#C5E0F5] rounded-md border-2 border-[#244A70]" />

                    <div className="w-full px-3 space-y-3">
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="flex items-center gap-2">
                          <span className="text-[#3793D3] font-bold text-lg leading-none">
                            ✓
                          </span>
                          <div className="h-[3px] bg-[#244A70] rounded-full flex-1" />
                        </div>
                      ))}
                    </div>

                  </div>

                  <div className="absolute bottom-5 right-2 rotate-[15deg] text-[#F28B3C]">
                    <PencilLine size={30} />
                  </div>

                  <Sparkles className="absolute top-4 right-0 text-[#F28B3C]" size={18} />
                  <Sparkles className="absolute bottom-4 left-1 text-[#F28B3C]" size={13} />

                </div>

              </div>

            </section>

            {/* QUICK ACTIONS */}
            <section className="grid grid-cols-4 gap-2 sm:gap-5 lg:gap-6 mt-5 lg:mt-7">

              {quickActions.map((action) => {
                const Icon = action.icon;
                const orange = action.color === "orange";

                return (
                  <button
                    key={action.label}
                    onClick={() => handleAction(action.label)}
                    className="flex flex-col items-center gap-2 group"
                  >

                    <div className={`w-[54px] h-[54px] sm:w-[64px] sm:h-[64px] lg:w-[76px] lg:h-[76px] rounded-[20px] flex items-center justify-center transition group-hover:scale-105 ${
                      orange
                        ? "bg-[#FFF1E4] text-[#E97829]"
                        : "bg-[#EAF3FC] text-[#2677C7]"
                    }`}>
                      <Icon size={23} className="sm:w-7 sm:h-7" strokeWidth={1.8} />
                    </div>

                    <span className="text-[10px] sm:text-xs lg:text-sm font-medium text-[#15395D] text-center">
                      {action.label}
                    </span>

                  </button>
                );
              })}

            </section>

            {/* EXAM SCHEDULE */}
            <section className="mt-8 lg:mt-10">

              <div className="flex items-center justify-between mb-1">

                <h2 className="text-base sm:text-lg font-bold">
                  Jadwal Ujian Hari Ini
                </h2>

                <button
                  onClick={() => handleNavigation("Ujian")}
                  className="text-xs sm:text-sm font-medium text-blue-600 hover:underline"
                >
                  3 ujian
                </button>

              </div>

              <p className="text-[11px] sm:text-xs text-slate-400 mb-4 capitalize">
                {today}
              </p>

              {/* EXAM LIST */}
              <div className="space-y-3">

                {exams.map((exam) => {
                  const ongoing = exam.status === "Berlangsung";

                  return (
                    <button
                      key={exam.id}
                      onClick={() => handleAction(`Detail ${exam.subject}`)}
                      className="w-full bg-white border border-[#E5EDF5] rounded-[15px] p-3 sm:p-4 flex items-center gap-3 text-left hover:border-[#B9D1EA] hover:shadow-sm transition"
                    >

                      {/* SUBJECT ICON */}
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#F2F6FB] text-[#15395D] flex items-center justify-center shrink-0">
                        {exam.type === "math" ? (
                          <Calculator size={20} />
                        ) : (
                          <BookOpen size={20} />
                        )}
                      </div>

                      {/* EXAM INFORMATION */}
                      <div className="flex-1 min-w-0">

                        <div className="flex items-center flex-wrap gap-2">
                          <h3 className="text-xs sm:text-sm font-medium truncate">
                            {exam.subject}
                          </h3>

                          <span className={`text-[9px] sm:text-[10px] font-semibold px-2 py-1 rounded-full ${
                            ongoing
                              ? "bg-[#E8F7F0] text-[#21965F]"
                              : "bg-[#FFF2E6] text-[#D97706]"
                          }`}>
                            {exam.status}
                          </span>
                        </div>

                        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-3 text-[10px] sm:text-xs text-slate-400">

                          <span className="flex items-center gap-1">
                            <Users size={14} />
                            {exam.className}
                          </span>

                          <span className="flex items-center gap-1">
                            <Clock3 size={14} />
                            {exam.time}
                          </span>

                        </div>

                      </div>

                      <ChevronRight size={18} className="text-slate-400 shrink-0" />

                    </button>
                  );
                })}

              </div>

              {/* VIEW ALL */}
              <button
                onClick={() => handleNavigation("Ujian")}
                className="w-full mt-4 py-3 text-sm font-semibold text-[#15395D] border border-[#E5EDF5] bg-white rounded-xl hover:bg-slate-50 transition"
              >
                Lihat Semua Ujian
              </button>

            </section>

          </div>

        </div>

      </div>

      {/* REUSABLE MOBILE BOTTOM NAVIGATION */}
      <BottomNavigation
        activePage="Beranda"
        onNavigate={handleNavigation}
      />

    </main>
  );
}
