
'use client';

import { useEffect, useRef } from 'react';

// Jenis pelanggaran yang dapat dideteksi.
export type ViolationType =
  | 'TAB_SWITCH'
  | 'WINDOW_BLUR'
  | 'EXIT_FULLSCREEN';

interface ExamSecurityMonitorProps {
  onViolation: (type: ViolationType) => void;

  // Mengirim perubahan status fullscreen ke halaman ujian.
  onFullscreenChange: (isFullscreen: boolean) => void;
}

export default function ExamSecurityMonitor({
  onViolation,
  onFullscreenChange,
}: ExamSecurityMonitorProps) {
  // Mencegah satu perpindahan tab dihitung dua kali.
  const violationReported = useRef(false);

  // Menyimpan status apakah peserta sebelumnya sudah masuk fullscreen.
  const wasFullscreen = useRef(false);

  useEffect(() => {
    // 1. DETEKSI PESERTA MENINGGALKAN HALAMAN

    const handleLeaveExam = () => {
      if (violationReported.current) return;

      violationReported.current = true;

      onViolation('TAB_SWITCH');

      console.log('[EXAM SECURITY] Pelanggaran: Pindah tab');
    };

    // Mendeteksi halaman ujian tidak terlihat.
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleLeaveExam();
      } else {
        // Peserta kembali ke halaman ujian.
        violationReported.current = false;
      }
    };

    // Mendeteksi browser kehilangan fokus.
    const handleWindowBlur = () => {
      handleLeaveExam();
    };

    // 2. DETEKSI PESERTA KELUAR FULLSCREEN

    const handleFullscreenChange = () => {
      // Membaca status fullscreen terbaru dari browser.
      const fullscreenActive = Boolean(document.fullscreenElement);

      // Mengirim status fullscreen ke halaman ujian.
      onFullscreenChange(fullscreenActive);

      // Jika peserta masuk fullscreen, simpan statusnya.
      if (fullscreenActive) {
        wasFullscreen.current = true;

        console.log('[EXAM SECURITY] Fullscreen aktif');

        return;
      }

      // Jika sebelumnya fullscreen aktif,
      // tetapi sekarang sudah tidak aktif,
      // berarti peserta keluar dari fullscreen.
      if (wasFullscreen.current) {
        wasFullscreen.current = false;

        onViolation('EXIT_FULLSCREEN');

        console.log('[EXAM SECURITY] Pelanggaran: Keluar fullscreen');
      }
    };

    // 3. MEMASANG EVENT LISTENER

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // 4. MEMBERSIHKAN EVENT LISTENER

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [onViolation, onFullscreenChange]);

  // Komponen monitor tidak menampilkan elemen visual.
  return null;
}
