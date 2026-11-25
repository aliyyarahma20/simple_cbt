"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flag,
  LayoutGrid,
  Maximize,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";

import Modal from "@/components/siswa/Modal";
import { SiswaLoading } from "@/components/siswa/SiswaStepLayout";
import {
  updateSiswaSession,
  useSiswaGuard,
  getSiswaSession,
  type SiswaSession,
} from "@/lib/siswa-session";
import { siswaExam, siswaQuestions } from "@/lib/siswa-mock";

// ==========================================
// HELPER
// ==========================================

const OPTION_LABELS = ["A", "B", "C", "D", "E"];

type ViolationType =
  | "tab"
  | "blur"
  | "fullscreen"
  | "copy"
  | "rightClick";

const VIOLATION_MESSAGES: Record<ViolationType, string> = {
  tab: "Kamu terdeteksi berpindah tab atau aplikasi.",
  blur: "Jendela ujian kehilangan fokus.",
  fullscreen: "Kamu keluar dari mode layar penuh.",
  copy: "Menyalin atau menempel tidak diizinkan selama ujian.",
  rightClick: "Klik kanan tidak diizinkan selama ujian.",
};

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Jam yang berdetak tiap detik (aman untuk SSR)
const subscribeTick = (callback: () => void) => {
  const id = setInterval(callback, 1000);

  return () => clearInterval(id);
};

const getNowSeconds = () => Math.floor(Date.now() / 1000) * 1000;

// Status layar penuh
const subscribeFullscreen = (callback: () => void) => {
  document.addEventListener("fullscreenchange", callback);

  return () =>
    document.removeEventListener("fullscreenchange", callback);
};

const getIsFullscreen = () => !!document.fullscreenElement;

const noopSubscribe = () => () => {};

const getFullscreenSupported = () =>
  typeof document.documentElement.requestFullscreen === "function";

// ==========================================
// PAGE
// ==========================================

export default function ExamPage() {
  const session = useSiswaGuard("ujian");

  if (!session || session.startedAt === null) {
    return <SiswaLoading />;
  }

  return <ExamRunner session={session} startedAt={session.startedAt} />;
}

type ExamRunnerProps = {
  session: SiswaSession;
  startedAt: number;
};

function ExamRunner({ session, startedAt }: ExamRunnerProps) {
  const { lock } = siswaExam;
  const questions = siswaQuestions;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNav, setShowNav] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [violation, setViolation] = useState<{
    type: ViolationType;
    count: number;
  } | null>(null);

  const finishedRef = useRef(false);
  const lastViolationRef = useRef(0);
  const hasEnteredFullscreenRef = useRef(false);

  const now = useSyncExternalStore(subscribeTick, getNowSeconds, () => 0);

  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    getIsFullscreen,
    () => false
  );

  const fullscreenSupported = useSyncExternalStore(
    noopSubscribe,
    getFullscreenSupported,
    () => false
  );

  // ==========================================
  // DATA SOAL & JAWABAN
  // ==========================================

  const question = questions[currentIndex];
  const flagged = new Set(session.flagged);

  const answeredCount = questions.filter(
    (item) => session.answers[item.id] !== undefined
  ).length;

  const flaggedCount = flagged.size;
  const unansweredCount = questions.length - answeredCount;

  const selectAnswer = (questionId: number, optionIndex: number) => {
    updateSiswaSession((current) => {
      const answers = { ...current.answers };

      // Klik pilihan yang sama lagi = batalkan jawaban
      if (answers[questionId] === optionIndex) {
        delete answers[questionId];
      } else {
        answers[questionId] = optionIndex;
      }

      return { answers };
    });
  };

  const toggleFlag = (questionId: number) => {
    updateSiswaSession((current) => ({
      flagged: current.flagged.includes(questionId)
        ? current.flagged.filter((id) => id !== questionId)
        : [...current.flagged, questionId],
    }));
  };

  const goTo = (index: number) => {
    setCurrentIndex(index);
    setShowNav(false);
  };

  // ==========================================
  // KUMPULKAN UJIAN
  // useSiswaGuard otomatis mengarahkan ke /siswa/selesai
  // ==========================================

  const finish = useCallback(() => {
    if (finishedRef.current) return;

    finishedRef.current = true;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    updateSiswaSession(() => ({ finishedAt: Date.now() }));
  }, []);

  // ==========================================
  // TIMER
  // ==========================================

  const elapsedSeconds = Math.floor((now - startedAt) / 1000);

  const remainingSeconds = Math.max(
    0,
    siswaExam.durationMinutes * 60 - elapsedSeconds
  );

  useEffect(() => {
    if (remainingSeconds <= 0) {
      finish();
    }
  }, [remainingSeconds, finish]);

  // ==========================================
  // EXAM LOCK
  // ==========================================

  const registerViolation = useCallback(
    (type: ViolationType) => {
      if (finishedRef.current) return;

      // Satu aksi bisa memicu beberapa event (mis. blur + tab berpindah)
      const time = Date.now();

      if (time - lastViolationRef.current < 1500) return;

      lastViolationRef.current = time;

      const count = (getSiswaSession()?.violations ?? 0) + 1;

      updateSiswaSession(() => ({ violations: count }));

      if (
        lock.violationAction === "submit" &&
        count >= lock.violationLimit
      ) {
        finish();
        return;
      }

      setViolation({ type, count });
    },
    [lock.violationAction, lock.violationLimit, finish]
  );

  useEffect(() => {
    if (isFullscreen) {
      hasEnteredFullscreenRef.current = true;
    }
  }, [isFullscreen]);

  useEffect(() => {
    const onVisibility = () => {
      if (lock.tabSwitch && document.hidden) registerViolation("tab");
    };

    const onBlur = () => {
      if (lock.windowBlur) registerViolation("blur");
    };

    const onFullscreenChange = () => {
      if (
        lock.fullscreen &&
        !document.fullscreenElement &&
        hasEnteredFullscreenRef.current
      ) {
        registerViolation("fullscreen");
      }
    };

    const onClipboard = (event: Event) => {
      event.preventDefault();
      registerViolation("copy");
    };

    const onContextMenu = (event: Event) => {
      event.preventDefault();
      registerViolation("rightClick");
    };

    // Mencegah refresh/tutup tab yang tidak disengaja
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!finishedRef.current) event.preventDefault();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("beforeunload", onBeforeUnload);

    if (lock.copyPaste) {
      document.addEventListener("copy", onClipboard);
      document.addEventListener("cut", onClipboard);
      document.addEventListener("paste", onClipboard);
    }

    if (lock.rightClick) {
      document.addEventListener("contextmenu", onContextMenu);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener(
        "fullscreenchange",
        onFullscreenChange
      );
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("copy", onClipboard);
      document.removeEventListener("cut", onClipboard);
      document.removeEventListener("paste", onClipboard);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [lock, registerViolation]);

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const needsFullscreen =
    lock.fullscreen && fullscreenSupported && !isFullscreen;

  // ==========================================
  // TAMPILAN
  // ==========================================

  const lowTime = remainingSeconds <= 300;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === questions.length - 1;
  const progress = (answeredCount / questions.length) * 100;

  const navProps = {
    questions,
    currentIndex,
    answers: session.answers,
    flagged,
    onSelect: goTo,
  };

  return (
    <div className="min-h-screen">

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-[#15395D] text-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3 lg:px-8">

          <div className="flex min-w-0 items-center gap-3">
            <ShieldCheck size={24} className="hidden shrink-0 sm:block" />

            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold sm:text-base">
                {siswaExam.subject} - Kelas {siswaExam.className}
              </h1>

              <p className="truncate text-xs text-blue-200">
                {session.name} • {session.className}
              </p>
            </div>
          </div>

          <div
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold tabular-nums ${
              lowTime ? "bg-red-500" : "bg-white/10"
            }`}
            aria-label="Sisa waktu"
          >
            <Clock3 size={17} />
            {formatTime(remainingSeconds)}
          </div>

        </div>

        {/* PROGRESS */}
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-[#F59E42] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* BODY */}
      <div className="mx-auto grid max-w-[1200px] gap-5 px-4 py-5 pb-28 lg:grid-cols-[1fr_320px] lg:px-8 lg:pb-8">

        {/* SOAL */}
        <section className="rounded-[20px] border border-[#E5EDF5] bg-white p-5 shadow-sm sm:p-6">

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#2677C7]">
              Soal {currentIndex + 1} dari {questions.length}
            </p>

            <button
              onClick={() => toggleFlag(question.id)}
              aria-pressed={flagged.has(question.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                flagged.has(question.id)
                  ? "border-[#F59E42] bg-[#FFF2E6] text-[#D97706]"
                  : "border-[#DCE6F0] text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Flag size={14} />
              Ragu-ragu
            </button>
          </div>

          <p className="mt-5 text-base leading-relaxed sm:text-lg">
            {question.text}
          </p>

          <div className="mt-6 space-y-3">
            {question.options.map((option, index) => {
              const selected = session.answers[question.id] === index;

              return (
                <button
                  key={option}
                  onClick={() => selectAnswer(question.id, index)}
                  aria-pressed={selected}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition sm:p-4 ${
                    selected
                      ? "border-[#15395D] bg-[#EAF3FC]"
                      : "border-[#E5EDF5] hover:border-[#B9D1EA] hover:bg-[#F8FAFD]"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      selected
                        ? "bg-[#15395D] text-white"
                        : "bg-[#F2F6FB] text-slate-500"
                    }`}
                  >
                    {OPTION_LABELS[index]}
                  </span>

                  <span className="text-sm sm:text-base">{option}</span>
                </button>
              );
            })}
          </div>

          {/* PREV / NEXT */}
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#EEF2F7] pt-5">
            <button
              onClick={() => setCurrentIndex((index) => index - 1)}
              disabled={isFirst}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE6F0] bg-white px-4 py-3 text-sm font-medium text-[#15395D] transition hover:bg-[#F5F8FC] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={17} />
              Sebelumnya
            </button>

            {isLast ? (
              <button
                onClick={() => setShowFinish(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#21965F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1B7F50]"
              >
                Selesai Ujian
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex((index) => index + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#15395D] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#102F4D]"
              >
                Selanjutnya
                <ChevronRight size={17} />
              </button>
            )}
          </div>

        </section>

        {/* NAVIGASI NOMOR (DESKTOP) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-[20px] border border-[#E5EDF5] bg-white p-5 shadow-sm">
            <h2 className="font-bold">Daftar Soal</h2>

            <p className="mt-1 text-xs text-slate-400">
              {answeredCount} dari {questions.length} soal terjawab
            </p>

            <div className="mt-4">
              <QuestionNav {...navProps} />
            </div>

            <NavLegend />

            <button
              onClick={() => setShowFinish(true)}
              className="mt-5 w-full rounded-xl bg-[#15395D] py-3 text-sm font-semibold text-white transition hover:bg-[#102F4D]"
            >
              Selesai Ujian
            </button>
          </div>
        </aside>

      </div>

      {/* BOTTOM BAR (MOBILE) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E7EEF6] bg-white px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-[500px] gap-3">
          <button
            onClick={() => setShowNav(true)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#DCE6F0] py-3 text-sm font-medium text-[#15395D]"
          >
            <LayoutGrid size={17} />
            Daftar Soal ({answeredCount}/{questions.length})
          </button>

          <button
            onClick={() => setShowFinish(true)}
            className="flex-1 rounded-xl bg-[#15395D] py-3 text-sm font-semibold text-white"
          >
            Selesai
          </button>
        </div>
      </div>

      {/* SHEET NAVIGASI NOMOR (MOBILE) */}
      {showNav && (
        <div
          className="fixed inset-0 z-[100] flex items-end bg-slate-900/40 lg:hidden"
          onClick={() => setShowNav(false)}
        >
          <div
            className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold">Daftar Soal</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {answeredCount} dari {questions.length} soal terjawab
                </p>
              </div>

              <button
                onClick={() => setShowNav(false)}
                aria-label="Tutup"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <QuestionNav {...navProps} />

            <NavLegend />
          </div>
        </div>
      )}

      {/* KONFIRMASI KUMPULKAN */}
      {showFinish && (
        <Modal onClose={() => setShowFinish(false)}>
          <h2 className="text-lg font-bold">Kumpulkan Ujian?</h2>

          <p className="mt-2 text-sm text-slate-500">
            Jawaban tidak dapat diubah setelah dikumpulkan.
          </p>

          <div className="mt-4 space-y-2 rounded-xl bg-[#F2F6FB] p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Terjawab</span>
              <span className="font-semibold">
                {answeredCount} soal
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Belum dijawab</span>
              <span
                className={`font-semibold ${
                  unansweredCount > 0 ? "text-red-500" : ""
                }`}
              >
                {unansweredCount} soal
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Ragu-ragu</span>
              <span className="font-semibold">{flaggedCount} soal</span>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setShowFinish(false)}
              className="flex-1 rounded-xl border border-[#DCE6F0] py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Kembali
            </button>

            <button
              onClick={finish}
              className="flex-1 rounded-xl bg-[#21965F] py-3 text-sm font-semibold text-white hover:bg-[#1B7F50]"
            >
              Kumpulkan
            </button>
          </div>
        </Modal>
      )}

      {/* PERINGATAN PELANGGARAN */}
      {violation && (
        <Modal layer="z-[130]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-orange-500">
            <ShieldAlert size={26} />
          </div>

          <h2 className="mt-4 text-lg font-bold">
            Pelanggaran Terdeteksi
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {VIOLATION_MESSAGES[violation.type]}
          </p>

          <p className="mt-3 text-sm font-semibold text-orange-600">
            Pelanggaran ke-{violation.count} dari batas{" "}
            {lock.violationLimit}.
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Pelanggaran dicatat dan dilaporkan ke pengawas.
          </p>

          <button
            onClick={() => setViolation(null)}
            className="mt-5 w-full rounded-xl bg-[#15395D] py-3 text-sm font-semibold text-white hover:bg-[#102F4D]"
          >
            Saya Mengerti
          </button>
        </Modal>
      )}

      {/* WAJIB LAYAR PENUH */}
      {needsFullscreen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#15395D] p-6 text-center text-white">
          <div className="max-w-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
              <Maximize size={30} />
            </div>

            <h2 className="mt-5 text-xl font-bold">
              Mode Layar Penuh Diperlukan
            </h2>

            <p className="mt-2 text-sm text-blue-100">
              Ujian harus dikerjakan dalam mode layar penuh. Waktu
              ujian tetap berjalan.
            </p>

            <button
              onClick={enterFullscreen}
              className="mt-6 w-full rounded-xl bg-[#F28B3C] py-3.5 text-sm font-semibold text-white hover:bg-[#E97829]"
            >
              Masuk Layar Penuh
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// ==========================================
// KOMPONEN KECIL
// ==========================================

type QuestionNavProps = {
  questions: { id: number }[];
  currentIndex: number;
  answers: Record<number, number>;
  flagged: Set<number>;
  onSelect: (index: number) => void;
};

function QuestionNav({
  questions,
  currentIndex,
  answers,
  flagged,
  onSelect,
}: QuestionNavProps) {
  return (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-5">
      {questions.map((item, index) => {
        const isCurrent = index === currentIndex;
        const isFlagged = flagged.has(item.id);
        const isAnswered = answers[item.id] !== undefined;

        const tone = isFlagged
          ? "border-[#F59E42] bg-[#F59E42] text-white"
          : isAnswered
            ? "border-[#15395D] bg-[#15395D] text-white"
            : "border-[#DCE6F0] bg-white text-slate-500 hover:bg-slate-50";

        return (
          <button
            key={item.id}
            onClick={() => onSelect(index)}
            aria-label={`Soal ${index + 1}`}
            aria-current={isCurrent ? "true" : undefined}
            className={`aspect-square rounded-lg border text-sm font-semibold transition ${tone} ${
              isCurrent ? "ring-2 ring-[#2677C7] ring-offset-2" : ""
            }`}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );
}

function NavLegend() {
  const items = [
    { label: "Terjawab", className: "bg-[#15395D]" },
    { label: "Ragu-ragu", className: "bg-[#F59E42]" },
    { label: "Belum", className: "border border-[#DCE6F0] bg-white" },
  ];

  return (
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded ${item.className}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}