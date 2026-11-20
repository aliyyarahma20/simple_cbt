
'use client';

import { useRef, useState } from 'react';
import ExamSecurityMonitor, {
  type ViolationType,
} from '@/components/exam-security/ExamSecurityMonitor';

// Menyimpan informasi peringatan.
interface ViolationWarning {
  count: number;
  type: ViolationType;
}

export default function KerjakanUjianPage() {
  // Menyimpan jumlah pelanggaran yang ditampilkan.
  const [violationCount, setViolationCount] = useState(0);

  // Menyimpan riwayat pelanggaran.
  const [violationLogs, setViolationLogs] = useState<ViolationType[]>([]);

  // Menyimpan status fullscreen.
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Menyimpan peringatan terbaru.
  const [warning, setWarning] = useState<ViolationWarning | null>(null);

  // Menyimpan status apakah ujian sudah selesai.
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Ref digunakan agar jumlah pelanggaran selalu terbaca secara langsung.
  const violationCountRef = useRef(0);

  // Mencegah pelanggaran dihitung setelah ujian selesai.
  const isSubmittedRef = useRef(false);

  // Mengubah kode pelanggaran menjadi teks.
  const getViolationMessage = (type: ViolationType) => {
    switch (type) {
      case 'TAB_SWITCH':
        return 'Pindah tab terdeteksi';

      case 'WINDOW_BLUR':
        return 'Jendela ujian kehilangan fokus';

      case 'EXIT_FULLSCREEN':
        return 'Keluar dari mode fullscreen terdeteksi';

      default:
        return 'Pelanggaran terdeteksi';
    }
  };

  // Menangani laporan pelanggaran dari monitor.
  const handleViolation = (type: ViolationType) => {
    // Abaikan jika ujian sudah selesai.
    if (isSubmittedRef.current) return;

    // Abaikan jika batas pelanggaran sudah tercapai.
    if (violationCountRef.current >= 3) return;

    // Menambah jumlah pelanggaran.
    const newCount = violationCountRef.current + 1;
    violationCountRef.current = newCount;

    setViolationCount(newCount);
    setViolationLogs((previous) => [...previous, type]);

    // Menampilkan peringatan terbaru.
    setWarning({
      count: newCount,
      type,
    });

    // Jika pelanggaran ketiga, ujian langsung selesai.
    if (newCount === 3) {
      isSubmittedRef.current = true;
      setIsSubmitted(true);

      console.log('[EXAM] Batas pelanggaran tercapai. Ujian selesai.');
    }
  };

  // Memulai ujian dengan mengaktifkan fullscreen.
  const handleStartExam = async () => {
    if (isSubmittedRef.current) return;

    try {
      await document.documentElement.requestFullscreen();

      setIsFullscreen(true);

      console.log('[EXAM] Ujian dimulai dalam fullscreen');
    } catch (error) {
      console.error('[EXAM] Gagal mengaktifkan fullscreen:', error);
    }
  };

  // Menutup peringatan.
  const handleCloseWarning = () => {
    setWarning(null);
  };

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      {/* Monitor keamanan ujian */}
      <ExamSecurityMonitor
        onViolation={handleViolation}
        onFullscreenChange={setIsFullscreen}
      />

      <div className="mx-auto max-w-2xl space-y-6">

        {/* Status ujian */}
        {isSubmitted && (
          <section
            className="rounded-xl border border-red-300 bg-red-50 p-6"
            role="alert"
          >
            <h2 className="text-xl font-bold text-red-700">
              Ujian Telah Dikumpulkan
            </h2>

            <p className="mt-2 text-red-600">
              Batas maksimal 3 pelanggaran telah tercapai.
              Ujian ditandai selesai oleh sistem.
            </p>
          </section>
        )}

        {/* Peringatan pelanggaran */}
        {warning && (
          <section
            className="rounded-xl border border-red-300 bg-red-50 p-6 shadow-sm"
            role="alert"
          >
            <h2 className="text-lg font-bold text-red-700">
              Pelanggaran {warning.count} dari 3!
            </h2>

            <p className="mt-2 font-semibold text-red-700">
              {getViolationMessage(warning.type)}
            </p>

            {warning.count === 1 && (
              <p className="mt-2 text-sm text-red-600">
                Sistem mendeteksi Anda meninggalkan atau melanggar
                ketentuan halaman ujian. Silakan kembali fokus
                mengerjakan ujian.
              </p>
            )}

            {warning.count === 2 && (
              <p className="mt-2 text-sm text-red-600">
                Anda telah melakukan 2 dari 3 pelanggaran.
                Jika melakukan satu pelanggaran lagi, ujian
                akan dikumpulkan secara otomatis.
              </p>
            )}

            {warning.count === 3 && (
              <p className="mt-2 text-sm text-red-600">
                Batas maksimal pelanggaran telah tercapai.
                Ujian Anda telah ditandai selesai oleh sistem.
              </p>
            )}

            <button
              onClick={handleCloseWarning}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Mengerti
            </button>
          </section>
        )}

        {/* Informasi halaman ujian */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800">
            Halaman Ujian Aktif
          </h1>

          <p className="mt-2 text-gray-600">
            Halaman ini digunakan untuk menguji fitur Exam Lock.
          </p>

          {!isFullscreen && !isSubmitted && (
            <button
              onClick={handleStartExam}
              className="mt-5 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Mulai Ujian
            </button>
          )}

          {isFullscreen && !isSubmitted && (
            <p className="mt-5 font-medium text-green-600">
              Mode fullscreen aktif. Selamat mengerjakan!
            </p>
          )}
        </section>

        {/* Informasi jumlah pelanggaran */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">
            Monitoring Keamanan
          </h2>

          <p className="mt-4 text-gray-600">
            Jumlah Pelanggaran:
          </p>

          <p className="mt-1 text-4xl font-bold text-red-600">
            {violationCount} / 3
          </p>
        </section>

        {/* Riwayat pelanggaran */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">
            Riwayat Pelanggaran
          </h2>

          {violationLogs.length === 0 ? (
            <p className="mt-3 text-gray-500">
              Belum ada pelanggaran terdeteksi.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {violationLogs.map((log, index) => (
                <li
                  key={index}
                  className="rounded-lg bg-red-50 p-3 text-red-700"
                >
                  Pelanggaran {index + 1}: {getViolationMessage(log)}
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </main>
  );
}
