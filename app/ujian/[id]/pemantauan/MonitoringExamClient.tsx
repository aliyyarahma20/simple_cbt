
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Users,
  UserCheck,
  Clock3,
  AlertTriangle,
  ShieldCheck,
  Eye,
  RefreshCw,
  X,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import BottomNavigation from "@/components/layout/BottomNavigation";

type MonitoringExamClientProps = {
  id: string;
};

type ParticipantStatus = "Mengerjakan" | "Selesai" | "Belum Mulai";

type Participant = {
  id: number;
  name: string;
  nis: string;
  className: string;
  startedAt: string;
  status: ParticipantStatus;
  violations: number;
  lastActivity: string;
};

const initialParticipants: Participant[] = [
  {
    id: 1,
    name: "Ahmad Fauzan",
    nis: "2025001",
    className: "X TKJ",
    startedAt: "08:00",
    status: "Mengerjakan",
    violations: 0,
    lastActivity: "08:25",
  },
  {
    id: 2,
    name: "Siti Nurhaliza",
    nis: "2025002",
    className: "X TKJ",
    startedAt: "08:02",
    status: "Mengerjakan",
    violations: 2,
    lastActivity: "08:24",
  },
  {
    id: 3,
    name: "Muhammad Rizky",
    nis: "2025003",
    className: "X TKJ",
    startedAt: "08:01",
    status: "Selesai",
    violations: 1,
    lastActivity: "08:20",
  },
  {
    id: 4,
    name: "Dinda Putri",
    nis: "2025004",
    className: "X TKJ",
    startedAt: "-",
    status: "Belum Mulai",
    violations: 0,
    lastActivity: "-",
  },
  {
    id: 5,
    name: "Fajar Ramadhan",
    nis: "2025005",
    className: "X TKJ",
    startedAt: "08:03",
    status: "Mengerjakan",
    violations: 4,
    lastActivity: "08:26",
  },
  {
    id: 6,
    name: "Nabila Zahra",
    nis: "2025006",
    className: "X TKJ",
    startedAt: "08:04",
    status: "Mengerjakan",
    violations: 1,
    lastActivity: "08:23",
  },
  {
    id: 7,
    name: "Rafi Alfarizi",
    nis: "2025007",
    className: "X TKJ",
    startedAt: "08:05",
    status: "Selesai",
    violations: 0,
    lastActivity: "08:19",
  },
  {
    id: 8,
    name: "Putri Amelia",
    nis: "2025008",
    className: "X TKJ",
    startedAt: "08:06",
    status: "Mengerjakan",
    violations: 3,
    lastActivity: "08:27",
  },
];

const statusStyles: Record<ParticipantStatus, string> = {
  Mengerjakan: "bg-blue-50 text-blue-600",
  Selesai: "bg-green-50 text-green-600",
  "Belum Mulai": "bg-slate-100 text-slate-500",
};

export default function MonitoringExamClient({
  id,
}: MonitoringExamClientProps) {
  const router = useRouter();

  const [participants] = useState(initialParticipants);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Semua");
  const [selectedParticipant, setSelectedParticipant] =
    useState<Participant | null>(null);

  const examInfo = {
    subject: "Matematika",
    className: "X TKJ",
    type: "PAS",
    date: "10 September 2025",
    time: "08.00 - 10.00 WIB",
  };

  const totalParticipants = participants.length;

  const workingCount = participants.filter(
    (item) => item.status === "Mengerjakan"
  ).length;

  const completedCount = participants.filter(
    (item) => item.status === "Selesai"
  ).length;

  const notStartedCount = participants.filter(
    (item) => item.status === "Belum Mulai"
  ).length;

  const totalViolations = participants.reduce(
    (total, item) => total + item.violations,
    0
  );

  const filteredParticipants = useMemo(() => {
    return participants.filter((participant) => {
      const matchesSearch =
        participant.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        participant.nis.includes(searchQuery);

      const matchesStatus =
        activeFilter === "Semua" ||
        participant.status === activeFilter;

      return matchesSearch && matchesStatus;
    });
  }, [participants, searchQuery, activeFilter]);

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

  const handleReset = () => {
    setSearchQuery("");
    setActiveFilter("Semua");
  };

  return (
    <main className="min-h-screen bg-[#F5F8FC] text-[#15395D]">
      <div className="min-h-screen flex">
        {/* SIDEBAR */}
        <Sidebar
          activePage="Ujian"
          onNavigate={handleNavigation}
          onAction={(label) =>
            alert(`Fitur ${label} akan dikembangkan selanjutnya.`)
          }
          userName="Budi Santoso"
          userRole="Guru"
        />

        {/* MAIN CONTENT */}
        <div className="flex-1 min-w-0 lg:ml-[250px]">
          {/* DESKTOP TOPBAR */}
          <Topbar
            title="Pemantauan Ujian"
            subtitle="Pantau aktivitas dan pelanggaran peserta ujian"
            onNotificationClick={() =>
              alert("Belum ada notifikasi baru.")
            }
            userName="Budi Santoso"
            userRole="Guru - SMKN 2 Garut"
          />

          {/* MOBILE HEADER */}
          <header className="lg:hidden bg-[#15395D] text-white px-5 pt-14 pb-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/ujian/${id}`)}
                aria-label="Kembali"
                className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
              >
                <ArrowLeft size={21} />
              </button>

              <div>
                <h1 className="text-lg font-bold">
                  Pemantauan Ujian
                </h1>
                <p className="text-xs text-blue-200 mt-1">
                  {examInfo.subject} - Kelas {examInfo.className}
                </p>
              </div>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <section className="px-5 lg:px-8 xl:px-12 pt-6 lg:pt-9 pb-28 lg:pb-12 max-w-[1450px] mx-auto space-y-5">
            {/* BREADCRUMB */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <button
                onClick={() => router.push("/ujian")}
                className="hover:text-[#15395D]"
              >
                Daftar Ujian
              </button>
              <span>/</span>
              <button
                onClick={() => router.push(`/ujian/${id}`)}
                className="hover:text-[#15395D]"
              >
                Detail Ujian
              </button>
              <span>/</span>
              <span className="font-medium text-[#15395D]">
                Pemantauan Ujian
              </span>
            </div>

            {/* EXAM INFORMATION */}
            <section className="bg-white border border-[#E5EDF5] rounded-[16px] p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold">
                      {examInfo.subject}
                    </h2>
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-semibold text-green-600">
                      Berlangsung
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    Kelas {examInfo.className} • {examInfo.type}
                  </p>

                  <p className="text-xs text-slate-400 mt-2">
                    {examInfo.date} • {examInfo.time}
                  </p>
                </div>

                <button
                  onClick={() => router.push(`/ujian/${id}`)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DCE6F0] px-4 py-2.5 text-xs font-medium hover:bg-[#F5F8FC] transition"
                >
                  <ArrowLeft size={15} />
                  Detail Ujian
                </button>
              </div>
            </section>

            {/* SUMMARY CARDS */}
            <section>
              <h3 className="font-bold text-sm mb-3">
                Ringkasan Peserta
              </h3>

              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="bg-white border border-[#E5EDF5] rounded-2xl p-4 shadow-sm">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users size={18} />
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    Total Peserta
                  </p>
                  <p className="text-xl font-bold mt-1">
                    {totalParticipants}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Siswa terdaftar
                  </p>
                </div>

                <div className="bg-white border border-[#E5EDF5] rounded-2xl p-4 shadow-sm">
                  <div className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                    <UserCheck size={18} />
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    Sedang Mengerjakan
                  </p>
                  <p className="text-xl font-bold mt-1">
                    {workingCount}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Peserta aktif
                  </p>
                </div>

                <div className="bg-white border border-[#E5EDF5] rounded-2xl p-4 shadow-sm">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Clock3 size={18} />
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    Belum Selesai
                  </p>
                  <p className="text-xl font-bold mt-1">
                    {notStartedCount + workingCount}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {notStartedCount} belum mulai
                  </p>
                </div>

                <div className="bg-white border border-[#E5EDF5] rounded-2xl p-4 shadow-sm">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                    <AlertTriangle size={18} />
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    Total Pelanggaran
                  </p>
                  <p className="text-xl font-bold mt-1">
                    {totalViolations}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Seluruh peserta
                  </p>
                </div>
              </div>
            </section>

            {/* PARTICIPANT LIST */}
            <section className="bg-white border border-[#E5EDF5] rounded-[20px] p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    Daftar Peserta
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Informasi pengerjaan dan aktivitas peserta ujian.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Monitoring aktif
                </div>
              </div>

              {/* SEARCH */}
              <div className="relative mb-4">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama siswa atau NIS..."
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E5EDF5] bg-white text-sm outline-none focus:border-[#15395D]"
                />
              </div>

              {/* STATUS FILTER */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {[
                  "Semua",
                  "Mengerjakan",
                  "Selesai",
                  "Belum Mulai",
                ].map((status) => (
                  <button
                    key={status}
                    onClick={() => setActiveFilter(status)}
                    className={`shrink-0 rounded-full border px-3 py-2 text-xs transition ${
                      activeFilter === status
                        ? "bg-[#15395D] border-[#15395D] text-white"
                        : "bg-white border-[#E5EDF5] text-slate-500 hover:border-[#15395D]"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mt-4 mb-3">
                <p className="text-xs text-slate-500">
                  {filteredParticipants.length} peserta
                </p>

                {(searchQuery || activeFilter !== "Semua") && (
                  <button
                    onClick={handleReset}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Reset filter
                  </button>
                )}
              </div>

              {/* DESKTOP TABLE */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-y border-[#EEF2F7] text-xs text-slate-400">
                      <th className="px-3 py-4 font-medium">Peserta</th>
                      <th className="px-3 py-4 font-medium">NIS</th>
                      <th className="px-3 py-4 font-medium">Mulai Ujian</th>
                      <th className="px-3 py-4 font-medium">Status</th>
                      <th className="px-3 py-4 font-medium">Pelanggaran</th>
                      <th className="px-3 py-4 font-medium">Aktivitas Terakhir</th>
                      <th className="px-3 py-4 font-medium text-center">Detail</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredParticipants.map((participant) => (
                      <tr
                        key={participant.id}
                        className="border-b border-[#EEF2F7] last:border-0 hover:bg-[#FAFCFE]"
                      >
                        <td className="px-3 py-4">
                          <p className="text-sm font-semibold">
                            {participant.name}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Kelas {participant.className}
                          </p>
                        </td>

                        <td className="px-3 py-4 text-sm text-slate-500">
                          {participant.nis}
                        </td>

                        <td className="px-3 py-4 text-sm text-slate-500">
                          {participant.startedAt}
                        </td>

                        <td className="px-3 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${statusStyles[participant.status]}`}
                          >
                            {participant.status}
                          </span>
                        </td>

                        <td className="px-3 py-4">
                          <span
                            className={`inline-flex items-center gap-1 text-sm font-semibold ${
                              participant.violations > 0
                                ? "text-orange-600"
                                : "text-green-600"
                            }`}
                          >
                            {participant.violations > 0 && (
                              <AlertTriangle size={14} />
                            )}
                            {participant.violations} kali
                          </span>
                        </td>

                        <td className="px-3 py-4 text-sm text-slate-500">
                          {participant.lastActivity}
                        </td>

                        <td className="px-3 py-4 text-center">
                          <button
                            onClick={() =>
                              setSelectedParticipant(participant)
                            }
                            aria-label="Lihat detail peserta"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#2677C7] hover:bg-blue-50"
                          >
                            <Eye size={17} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE PARTICIPANT CARDS */}
              <div className="md:hidden space-y-3">
                {filteredParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className="rounded-xl border border-[#E5EDF5] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {participant.name}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          NIS {participant.nis} • {participant.className}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${statusStyles[participant.status]}`}
                      >
                        {participant.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div>
                        <p className="text-[10px] text-slate-400">
                          Mulai Ujian
                        </p>
                        <p className="text-xs font-medium mt-1">
                          {participant.startedAt}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] text-slate-400">
                          Aktivitas Terakhir
                        </p>
                        <p className="text-xs font-medium mt-1">
                          {participant.lastActivity}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-[#EEF2F7] flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400">
                          Jumlah Pelanggaran
                        </p>
                        <p
                          className={`mt-1 text-sm font-bold ${
                            participant.violations > 0
                              ? "text-orange-600"
                              : "text-green-600"
                          }`}
                        >
                          {participant.violations} kali
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          setSelectedParticipant(participant)
                        }
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-[#2677C7] hover:bg-blue-50"
                      >
                        <Eye size={15} />
                        Detail
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* EMPTY STATE */}
              {filteredParticipants.length === 0 && (
                <div className="py-12 text-center">
                  <Users
                    size={30}
                    className="mx-auto text-slate-300"
                  />
                  <p className="mt-3 text-sm font-semibold">
                    Peserta tidak ditemukan
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Coba gunakan kata kunci atau filter yang berbeda.
                  </p>
                  <button
                    onClick={handleReset}
                    className="mt-3 text-xs font-medium text-blue-600"
                  >
                    Reset pencarian
                  </button>
                </div>
              )}
            </section>

            {/* EXAM LOCK INFORMATION */}
            <section className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <ShieldCheck
                size={19}
                className="mt-0.5 shrink-0 text-blue-600"
              />
              <div>
                <p className="text-sm font-semibold text-[#15395D]">
                  Monitoring Exam Lock
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Jumlah pelanggaran ditampilkan berdasarkan aktivitas
                  yang terdeteksi oleh sistem Exam Lock. Detail jenis
                  pelanggaran dapat dilihat pada informasi masing-masing
                  peserta.
                </p>
              </div>
            </section>

            {/* BACK BUTTON */}
            <button
              onClick={() => router.push(`/ujian/${id}`)}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#15395D]"
            >
              <ArrowLeft size={17} />
              Kembali ke Detail Ujian
            </button>
          </section>
        </div>
      </div>

      {/* PARTICIPANT DETAIL MODAL */}
      {selectedParticipant && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setSelectedParticipant(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#15395D]">
                  Detail Peserta
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Informasi aktivitas siswa selama ujian.
                </p>
              </div>

              <button
                onClick={() => setSelectedParticipant(null)}
                aria-label="Tutup detail"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-[#F5F8FC] p-4">
              <p className="text-sm font-bold">
                {selectedParticipant.name}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                NIS {selectedParticipant.nis} • Kelas{" "}
                {selectedParticipant.className}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#E5EDF5] p-3">
                <p className="text-xs text-slate-400">Status</p>
                <p className="mt-2 text-sm font-semibold">
                  {selectedParticipant.status}
                </p>
              </div>

              <div className="rounded-xl border border-[#E5EDF5] p-3">
                <p className="text-xs text-slate-400">
                  Jumlah Pelanggaran
                </p>
                <p className="mt-2 text-sm font-bold text-orange-600">
                  {selectedParticipant.violations} kali
                </p>
              </div>

              <div className="rounded-xl border border-[#E5EDF5] p-3">
                <p className="text-xs text-slate-400">Mulai Ujian</p>
                <p className="mt-2 text-sm font-semibold">
                  {selectedParticipant.startedAt}
                </p>
              </div>

              <div className="rounded-xl border border-[#E5EDF5] p-3">
                <p className="text-xs text-slate-400">
                  Aktivitas Terakhir
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {selectedParticipant.lastActivity}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              Rincian jenis dan waktu pelanggaran akan ditampilkan
              setelah integrasi dengan log Exam Lock.
            </p>

            <button
              onClick={() => setSelectedParticipant(null)}
              className="mt-5 w-full rounded-xl bg-[#15395D] px-4 py-3 text-sm font-semibold text-white hover:bg-[#102F4D]"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="lg:hidden">
        <BottomNavigation
          activePage="Ujian"
          onNavigate={handleNavigation}
        />
      </div>
    </main>
  );
}
