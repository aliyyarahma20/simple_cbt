
'use client';

import { useEffect, useRef } from 'react';

// Jenis pelanggaran yang dapat dideteksi.
export type ViolationType =
  | 'TAB_SWITCH'
  | 'WINDOW_BLUR'
  | 'EXIT_FULLSCREEN'
  | 'COPY'
  | 'CUT'
  | 'PASTE'
  | 'SCREENSHOT';

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

        // 2. DETEKSI AKTIVITAS CLIPBOARD

    // Mendeteksi ketika peserta menyalin teks.
    const handleCopy = () => {
      onViolation('COPY');

      console.log('[EXAM SECURITY] Pelanggaran: Copy');
    };

    // Mendeteksi ketika peserta memotong teks.
    const handleCut = () => {
      onViolation('CUT');

      console.log('[EXAM SECURITY] Pelanggaran: Cut');
    };

    // Mendeteksi ketika peserta menempelkan teks.
    const handlePaste = () => {
      onViolation('PASTE');

      console.log('[EXAM SECURITY] Pelanggaran: Paste');
    };

        // Mendeteksi tombol PrintScreen jika event diterima browser.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'PrintScreen') {
        onViolation('SCREENSHOT');

        console.log('[EXAM SECURITY] Tombol PrintScreen terdeteksi');
      }
    };

    // 3. DETEKSI PESERTA KELUAR FULLSCREEN

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
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    window.addEventListener('keydown', handleKeyDown);


        // 4. MEMBERSIHKAN EVENT LISTENER
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);

      // Membersihkan listener aktivitas clipboard.
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onViolation, onFullscreenChange]);

  // Komponen monitor tidak menampilkan elemen visual.
  return null;
}
