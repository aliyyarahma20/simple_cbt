
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Clock3,
  FileText,
  ShieldCheck,
  Save,
  AlertTriangle,
  Monitor,
  Maximize,
  Eye,
  Clipboard,
  MousePointerClick,
  Info,
  Plus,
  Trash2,
  Settings2,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import BottomNavigation from "@/components/layout/BottomNavigation";

type TabType = "informasi" | "soal" | "exam-lock";

type EditExamClientProps = {
  id: string;
};

type MonitoringSettings = {
  tabSwitch: boolean;
  fullscreen: boolean;
  windowBlur: boolean;
  copyPaste: boolean;
  rightClick: boolean;
};

const initialExam = {
  subject: "Matematika",
  className: "X TKJ",
  type: "PAS",
  date: "2025-09-10",
  startTime: "08:00",
  endTime: "10:00",
  duration: 120,
  description:
    "Penilaian Akhir Semester mata pelajaran Matematika untuk kelas X TKJ.",
  totalQuestions: 40,
};

const monitoringOptions = [
  {
    key: "tabSwitch" as const,
    title: "Perpindahan Tab",
    description: "Mendeteksi ketika siswa berpindah ke tab browser lain.",
    icon: Monitor,
  },
  {
    key: "fullscreen" as const,
    title: "Keluar dari Fullscreen",
    description: "Mendeteksi ketika siswa keluar dari mode layar penuh.",
    icon: Maximize,
  },
  {
    key: "windowBlur" as const,
    title: "Kehilangan Fokus Halaman",
    description: "Mendeteksi ketika halaman ujian tidak lagi aktif.",
    icon: Eye,
  },
  {
    key: "copyPaste" as const,
    title: "Copy & Paste",
    description: "Mendeteksi aktivitas menyalin dan menempel teks.",
    icon: Clipboard,
  },
  {
    key: "rightClick" as const,
    title: "Klik Kanan",
    description: "Mendeteksi penggunaan menu klik kanan pada halaman ujian.",
    icon: MousePointerClick,
  },
];

export default function EditExamClient({ id }: EditExamClientProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>("informasi");

  const [exam, setExam] = useState(initialExam);

  const [examLockEnabled, setExamLockEnabled] = useState(true);

  const [monitoring, setMonitoring] = useState<MonitoringSettings>({
    tabSwitch: true,
    fullscreen: true,
    windowBlur: true,
    copyPaste: false,
    rightClick: false,
  });

  const [violationLimit, setViolationLimit] = useState(3);

  const [violationAction, setViolationAction] = useState("warning");

  const [questions, setQuestions] = useState([
    { id: 1, text: "Contoh soal matematika pertama" },
    { id: 2, text: "Contoh soal matematika kedua" },
    { id: 3, text: "Contoh soal matematika ketiga" },
  ]);

  const [saved, setSaved] = useState(false);

  const handleNavigation = (label: string) => {
    const routes: Record<string, string> = {
      Beranda: "/dashboard",
      Ujian: "/ujian",
      Soal: "/soal",
      Profil: "/profil",
    };

    if (routes[label]) router.push(routes[label]);
  };

  const updateExam = (
    field: keyof typeof initialExam,
    value: string | number
  ) => {
    setExam((prev) => ({ ...prev, [field]: value }));
  };

  const toggleMonitoring = (key: keyof MonitoringSettings) => {
    setMonitoring((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: `Soal baru ${prev.length + 1}`,
      },
    ]);
  };

  const handleDeleteQuestion = (questionId: number) => {
    setQuestions((prev) =>
      prev.filter((question) => question.id !== questionId)
    );
  };

  const handleSave = () => {
    setSaved(true);
    alert(
      "Perubahan berhasil disimulasikan. Data belum tersimpan ke database."
    );
  };

  const tabs = [
    {
      id: "informasi" as const,
      label: "Informasi Ujian",
      icon: BookOpen,
    },
    {
      id: "soal" as const,
      label: "Kelola Soal",
      icon: FileText,
    },
    {
      id: "exam-lock" as const,
      label: "Exam Lock",
      icon: ShieldCheck,
    },
  ];

  return (
    <main className="min-h-screen bg-[#F5F8FC] text-[#15395D]">
      <div className="min-h-screen flex">
          <Sidebar
            activePage="Ujian"
            onNavigate={handleNavigation}
            onAction={(label) =>
              alert(`Fitur ${label} akan dikembangkan selanjutnya.`)
            }
            userName="Budi Santoso"
            userRole="Guru"
          />

      <div className="flex-1 min-w-0 lg:ml-[250px]">
          <div className="hidden lg:block">
            <Topbar
              title="Edit Ujian"
              subtitle="Perbarui informasi dan pengaturan ujian"
              onNotificationClick={() =>
                alert("Belum ada notifikasi baru.")
              }
              userName="Budi Santoso"
              userRole="Guru - SMKN 2 Garut"
            />
          </div>

          <header className="bg-[#15395D] px-5 pb-5 pt-6 text-white lg:hidden">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/ujian/${id}`)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"
                aria-label="Kembali"
              >
                <ArrowLeft size={21} />
              </button>

              <div>
                <h1 className="text-lg font-bold">Edit Ujian</h1>
                <p className="mt-1 text-xs text-blue-200">
                  Pengaturan dan pengelolaan ujian
                </p>
              </div>
            </div>
          </header>

          <section className="px-5 lg:px-8 xl:px-12 pt-6 lg:pt-9 pb-28 lg:pb-12 max-w-[1450px] mx-auto space-y-5">
            {/* BREADCRUMB */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
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
                Edit Ujian
              </span>
            </div>

            {/* PAGE TITLE */}
            <div>
              <h2 className="text-xl font-bold sm:text-2xl">
                Edit Pengaturan Ujian
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Kelola informasi, soal, dan keamanan pelaksanaan ujian.
              </p>
            </div>

            {/* TAB NAVIGATION */}
            <div className="rounded-2xl border border-[#E5EDF5] bg-white p-2 shadow-sm">
              <div className="grid grid-cols-3 gap-1">

                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex min-w-0 flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-1 sm:px-3 py-3 text-center text-[10px] sm:text-sm font-medium transition ${
                        active
                          ? "bg-[#15395D] text-white"
                          : "text-slate-500 hover:bg-[#F5F8FC] hover:text-[#15395D]"
                      }`}
                    >
                      <Icon size={16} className="shrink-0" />

                      <span className="leading-tight">
                        {tab.label}
                      </span>
                    </button>
                  );
                })}

              </div>
            </div>

            {/* INFORMASI UJIAN */}
            {activeTab === "informasi" && (
              <section className="rounded-[20px] border border-[#E5EDF5] bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF3FC] text-[#2677C7]">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold">Informasi Ujian</h3>
                    <p className="text-xs text-slate-400">
                      Perbarui informasi dasar dan jadwal ujian.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Mata Pelajaran
                    </label>
                    <input
                      value={exam.subject}
                      onChange={(e) =>
                        updateExam("subject", e.target.value)
                      }
                      className="w-full rounded-xl border border-[#DCE6F0] px-4 py-3 text-sm outline-none focus:border-[#2677C7]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Kelas
                    </label>
                    <input
                      value={exam.className}
                      onChange={(e) =>
                        updateExam("className", e.target.value)
                      }
                      className="w-full rounded-xl border border-[#DCE6F0] px-4 py-3 text-sm outline-none focus:border-[#2677C7]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Jenis Ujian
                    </label>
                    <select
                      value={exam.type}
                      onChange={(e) => updateExam("type", e.target.value)}
                      className="w-full rounded-xl border border-[#DCE6F0] bg-white px-4 py-3 text-sm outline-none focus:border-[#2677C7]"
                    >
                      <option value="Ulangan Harian">Ulangan Harian</option>
                      <option value="PTS">PTS</option>
                      <option value="PAS">PAS</option>
                      <option value="PAT">PAT</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Tanggal Ujian
                    </label>
                    <input
                      type="date"
                      value={exam.date}
                      onChange={(e) => updateExam("date", e.target.value)}
                      className="w-full rounded-xl border border-[#DCE6F0] px-4 py-3 text-sm outline-none focus:border-[#2677C7]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Waktu Mulai
                    </label>
                    <input
                      type="time"
                      value={exam.startTime}
                      onChange={(e) =>
                        updateExam("startTime", e.target.value)
                      }
                      className="w-full rounded-xl border border-[#DCE6F0] px-4 py-3 text-sm outline-none focus:border-[#2677C7]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Waktu Selesai
                    </label>
                    <input
                      type="time"
                      value={exam.endTime}
                      onChange={(e) =>
                        updateExam("endTime", e.target.value)
                      }
                      className="w-full rounded-xl border border-[#DCE6F0] px-4 py-3 text-sm outline-none focus:border-[#2677C7]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Durasi Pengerjaan (menit)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={exam.duration}
                      onChange={(e) =>
                        updateExam("duration", Number(e.target.value))
                      }
                      className="w-full rounded-xl border border-[#DCE6F0] px-4 py-3 text-sm outline-none focus:border-[#2677C7]"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <label className="mb-2 block text-sm font-medium">
                    Deskripsi Ujian
                  </label>
                  <textarea
                    rows={4}
                    value={exam.description}
                    onChange={(e) =>
                      updateExam("description", e.target.value)
                    }
                    className="w-full resize-none rounded-xl border border-[#DCE6F0] px-4 py-3 text-sm outline-none focus:border-[#2677C7]"
                  />
                </div>
              </section>
            )}

            {/* KELOLA SOAL */}
            {activeTab === "soal" && (
              <section className="rounded-[20px] border border-[#E5EDF5] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF3FC] text-[#2677C7]">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold">Kelola Soal</h3>
                      <p className="text-xs text-slate-400">
                        Atur daftar soal dalam ujian ini.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleAddQuestion}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#15395D] px-4 py-3 text-sm font-medium text-white hover:bg-[#102F4D]"
                  >
                    <Plus size={17} />
                    Tambah Soal
                  </button>
                </div>

                <div className="mt-6 rounded-xl bg-[#F5F8FC] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      Total soal
                    </span>
                    <span className="text-lg font-bold">
                      {questions.length}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#E5EDF5] p-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF3FC] text-sm font-bold text-[#2677C7]">
                          {index + 1}
                        </div>
                        <p className="truncate text-sm font-medium">
                          {question.text}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeleteQuestion(question.id)}
                        aria-label="Hapus soal"
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs text-slate-400">
                  Pengelolaan soal pada tahap ini masih berupa simulasi
                  frontend. Integrasi dengan halaman bank soal akan
                  dilakukan pada tahap berikutnya.
                </p>
              </section>
            )}

            {/* EXAM LOCK */}
            {activeTab === "exam-lock" && (
              <div className="space-y-5">
                {/* MAIN TOGGLE */}
                <section className="rounded-[20px] border border-[#E5EDF5] bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF3FC] text-[#2677C7]">
                        <ShieldCheck size={23} />
                      </div>

                      <div>
                        <h3 className="font-bold">Exam Lock</h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                          Aktifkan sistem pengamanan untuk memantau
                          aktivitas siswa selama ujian berlangsung.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={examLockEnabled}
                      onClick={() =>
                        setExamLockEnabled(!examLockEnabled)
                      }
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                        examLockEnabled ? "bg-[#21965F]" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          examLockEnabled ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div
                    className={`mt-5 flex items-start gap-2 rounded-xl p-3 text-xs leading-relaxed ${
                      examLockEnabled
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-50 text-slate-500"
                    }`}
                  >
                    <Info size={16} className="mt-0.5 shrink-0" />
                    {examLockEnabled
                      ? "Exam Lock aktif. Guru dapat mengatur jenis monitoring yang akan diterapkan."
                      : "Exam Lock tidak aktif. Monitoring pelanggaran tidak akan diterapkan pada ujian ini."}
                  </div>
                </section>

                {/* MONITORING OPTIONS */}
                <section
                  className={`rounded-[20px] border border-[#E5EDF5] bg-white p-5 shadow-sm sm:p-6 ${
                    !examLockEnabled ? "opacity-50" : ""
                  }`}
                >
                  <div className="mb-5 flex items-center gap-2">
                    <Settings2 size={19} className="text-[#2677C7]" />
                    <div>
                      <h3 className="font-bold">Monitoring Aktivitas</h3>
                      <p className="text-xs text-slate-400">
                        Pilih aktivitas yang ingin dipantau.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {monitoringOptions.map((option) => {
                      const Icon = option.icon;
                      const checked = monitoring[option.key];

                      return (
                        <div
                          key={option.key}
                          className="flex items-center justify-between gap-4 rounded-xl border border-[#E5EDF5] p-4"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F2F6FB] text-[#2677C7]">
                              <Icon size={19} />
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-semibold">
                                {option.title}
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                                {option.description}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={checked}
                            disabled={!examLockEnabled}
                            onClick={() =>
                              toggleMonitoring(option.key)
                            }
                            className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed ${
                              checked ? "bg-[#21965F]" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${
                                checked ? "left-6" : "left-1"
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* VIOLATION LIMIT */}
                <section
                  className={`rounded-[20px] border border-[#E5EDF5] bg-white p-5 shadow-sm sm:p-6 ${
                    !examLockEnabled ? "opacity-50" : ""
                  }`}
                >
                  <div className="mb-5 flex items-center gap-2">
                    <AlertTriangle size={19} className="text-[#E99A35]" />
                    <div>
                      <h3 className="font-bold">Batas Pelanggaran</h3>
                      <p className="text-xs text-slate-400">
                        Tentukan jumlah toleransi pelanggaran siswa.
                      </p>
                    </div>
                  </div>

                  <div className="max-w-md">
                    <label className="mb-2 block text-sm font-medium">
                      Maksimal jumlah pelanggaran
                    </label>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={violationLimit}
                        disabled={!examLockEnabled}
                        onChange={(e) =>
                          setViolationLimit(
                            Math.max(1, Math.min(20, Number(e.target.value)))
                          )
                        }
                        className="w-28 rounded-xl border border-[#DCE6F0] px-4 py-3 text-sm font-semibold outline-none focus:border-[#2677C7] disabled:bg-slate-100"
                      />
                      <span className="text-sm text-slate-500">
                        kali pelanggaran
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      Sistem akan menjalankan tindakan setelah siswa
                      mencapai batas pelanggaran yang ditentukan.
                    </p>
                  </div>
                </section>

                {/* VIOLATION ACTION */}
                <section
                  className={`rounded-[20px] border border-[#E5EDF5] bg-white p-5 shadow-sm sm:p-6 ${
                    !examLockEnabled ? "opacity-50" : ""
                  }`}
                >
                  <div className="mb-5">
                    <h3 className="font-bold">Tindakan Sistem</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Pilih tindakan ketika batas pelanggaran tercapai.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        value: "warning",
                        title: "Berikan Peringatan",
                        description:
                          "Sistem menampilkan peringatan kepada siswa.",
                      },
                      {
                        value: "lock",
                        title: "Kunci Pengerjaan Ujian",
                        description:
                          "Siswa tidak dapat melanjutkan pengerjaan ujian.",
                      },
                      {
                        value: "submit",
                        title: "Akhiri Ujian Otomatis",
                        description:
                          "Sistem mengakhiri sesi ujian siswa secara otomatis.",
                      },
                    ].map((item) => (
                      <label
                        key={item.value}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                          violationAction === item.value
                            ? "border-[#2677C7] bg-[#F3F8FD]"
                            : "border-[#E5EDF5] hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="violationAction"
                          value={item.value}
                          checked={violationAction === item.value}
                          disabled={!examLockEnabled}
                          onChange={(e) =>
                            setViolationAction(e.target.value)
                          }
                          className="mt-1 accent-[#15395D]"
                        />

                        <div>
                          <p className="text-sm font-semibold">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {item.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>

                {/* NOTICE */}
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                  <Info size={18} className="mt-0.5 shrink-0" />
                  <p className="text-xs leading-relaxed">
                    Beberapa aktivitas browser memiliki keterbatasan
                    deteksi. Pengaturan ini merupakan konfigurasi
                    frontend dan belum menjalankan monitoring secara
                    langsung.
                  </p>
                </div>
              </div>
            )}

            {/* FOOTER ACTIONS */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                onClick={() => router.push(`/ujian/${id}`)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DCE6F0] bg-white px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft size={17} />
                Kembali
              </button>

              <button
                onClick={handleSave}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#15395D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#102F4D]"
              >
                <Save size={17} />
                Simpan Perubahan
              </button>
            </div>
          </section>
        </div>
      </div>

      <div className="lg:hidden">
        <BottomNavigation
          activePage="Ujian"
          onNavigate={handleNavigation}
        />
      </div>
    </main>
  );
}
