
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronRight,
  CalendarDays,
  SlidersHorizontal,
} from "lucide-react";

import SearchInput from "@/components/shared/SearchInput";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";

type ExamStatus =
  | "Berlangsung"
  | "Menunggu"
  | "Terjadwal"
  | "Selesai";

type Exam = {
  id: number;
  subject: string;
  className: string;
  type: string;
  date: string;
  time: string;
  status: ExamStatus;
};

const exams: Exam[] = [
  {
    id: 1,
    subject: "Matematika",
    className: "X TKJ",
    type: "PAS",
    date: "10 Sep 2025",
    time: "08:00 - 10:00",
    status: "Berlangsung",
  },
  {
    id: 2,
    subject: "Bahasa Indonesia",
    className: "X RPL",
    type: "Ulangan Harian",
    date: "10 Sep 2025",
    time: "10:30 - 12:30",
    status: "Menunggu",
  },
  {
    id: 3,
    subject: "Pemrograman Dasar",
    className: "XI",
    type: "PAT",
    date: "11 Sep 2025",
    time: "13:00 - 15:00",
    status: "Terjadwal",
  },
  {
    id: 4,
    subject: "Fisika",
    className: "X",
    type: "Ulangan Harian",
    date: "12 Sep 2025",
    time: "08:00 - 10:00",
    status: "Terjadwal",
  },
];

const statusFilters = [
  "Semua",
  "Berlangsung",
  "Terjadwal",
  "Selesai",
] as const;

const statusStyles: Record<ExamStatus, string> = {
  Berlangsung: "bg-[#E8F7F0] text-[#21965F]",
  Menunggu: "bg-[#FFF2E6] text-[#D97706]",
  Terjadwal: "bg-[#EAF3FF] text-[#2878D0]",
  Selesai: "bg-slate-100 text-slate-500",
};

export default function ExamListPage() {
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [selectedClass, setSelectedClass] = useState("Semua Kelas");

  // FILTER EXAM DATA
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchesSearch =
        exam.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.type.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        activeFilter === "Semua" ||
        (activeFilter === "Berlangsung" &&
          exam.status === "Berlangsung") ||
        (activeFilter === "Terjadwal" &&
          (exam.status === "Terjadwal" ||
            exam.status === "Menunggu")) ||
        exam.status === activeFilter;

      const matchesClass =
        selectedClass === "Semua Kelas" ||
        exam.className === selectedClass;

      return matchesSearch && matchesStatus && matchesClass;
    });
  }, [searchQuery, activeFilter, selectedClass]);

  // RESET FILTER
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedClass("Semua Kelas");
    setActiveFilter("Semua");
  };

  return (
    <section className="px-5 lg:px-8 xl:px-12 pt-6 lg:pt-9 pb-28 lg:pb-12 max-w-[1450px] mx-auto">

        {/* SEARCH AND FILTER */}
        <div className="flex gap-2.5">

          <div className="relative flex-1">

            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari nama ujian atau mata pelajaran..."
            />

          </div>

          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`h-[48px] px-4 flex items-center justify-center gap-2 bg-white border rounded-[14px] text-sm font-medium transition ${
              showFilter
                ? "border-[#15395D] text-[#15395D]"
                : "border-[#E5EDF5] hover:border-slate-300"
            }`}
          >
            <SlidersHorizontal size={18} />
            Filter
          </button>

        </div>

        {/* ADVANCED FILTER */}
        {showFilter && (
          <div className="mt-3 p-4 bg-white border border-[#E5EDF5] rounded-2xl shadow-sm">

            <div className="flex justify-between items-center mb-3">

              <p className="text-sm font-semibold">
                Filter Kelas
              </p>

              <button
                onClick={resetFilters}
                className="text-xs text-blue-600"
              >
                Reset Filter
              </button>

            </div>

            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full h-11 px-3 bg-[#F8FAFD] border border-slate-200 rounded-xl text-sm outline-none focus:border-[#15395D]"
            >
              <option>Semua Kelas</option>
              <option>X TKJ</option>
              <option>X RPL</option>
              <option>XI</option>
              <option>X</option>
            </select>

          </div>
        )}

        {/* STATUS FILTER */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 pb-1 scrollbar-hide">

          {statusFilters.map((status) => (
            <button
              key={status}
              onClick={() => setActiveFilter(status)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm border transition ${
                activeFilter === status
                  ? "bg-[#15395D] border-[#15395D] text-white"
                  : "bg-white border-[#E5EDF5] text-slate-500 hover:border-[#15395D]"
              }`}
            >
              {status}
            </button>
          ))}

        </div>

        {/* EXAM COUNT */}
        <div className="flex justify-between items-center mt-6 mb-3">

          <p className="text-xs sm:text-sm text-slate-500">
            {filteredExams.length} ujian
          </p>

          {(searchQuery ||
            selectedClass !== "Semua Kelas" ||
            activeFilter !== "Semua") && (
            <button
              onClick={resetFilters}
              className="text-xs text-blue-600 hover:underline"
            >
              Hapus filter
            </button>
          )}

        </div>

        {/* EXAM CARDS */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 lg:gap-4">

          {filteredExams.map((exam) => (

            <button
              key={exam.id}
              onClick={() => router.push(`/ujian/${exam.id}`)}
              className="w-full text-left bg-white border border-[#E5EDF5] rounded-[16px] p-4 sm:p-5 hover:border-[#B9D1EA] hover:shadow-md transition-all duration-200 group"
            >

              <div className="flex items-start justify-between gap-3">

                <div className="min-w-0 flex-1">

                  <h3 className="text-sm sm:text-base font-semibold text-[#15395D]">
                    {exam.subject} - Kelas {exam.className}
                  </h3>

                  <p className="text-xs text-slate-500 mt-1.5">
                    {exam.type}
                  </p>

                </div>

                <ChevronRight
                  size={20}
                  className="text-slate-400 shrink-0 mt-1 group-hover:text-[#15395D] transition"
                />

              </div>

              <div className="flex items-center gap-2 mt-2.5 text-xs text-slate-500">

                <CalendarDays size={16} className="shrink-0" />

                <span>
                  {exam.date} • {exam.time}
                </span>

              </div>

              <div className="mt-2.5">

                <StatusBadge status={exam.status} />

              </div>

            </button>

          ))}

        </div>

        {/* EMPTY STATE */}
        {filteredExams.length === 0 && (
          <div className="mt-2 rounded-2xl border border-[#E5EDF5] bg-white">
            <EmptyState
              title="Ujian tidak ditemukan"
              description="Coba gunakan kata kunci atau filter yang berbeda."
              actionLabel="Reset pencarian"
              onAction={resetFilters}
            />
          </div>
        )}

      </section>
  );
}
