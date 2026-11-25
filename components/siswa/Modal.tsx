"use client";

import type { ReactNode } from "react";

type ModalProps = {
  children: ReactNode;
  // Dipanggil saat area gelap diklik (opsional)
  onClose?: () => void;
  // Kelas z-index Tailwind, mis. "z-[110]"
  layer?: string;
};

export default function Modal({
  children,
  onClose,
  layer = "z-[110]",
}: ModalProps) {
  return (
    <div
      className={`fixed inset-0 ${layer} flex items-center justify-center bg-slate-900/50 p-4`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}