"use client";

import { createContext, useContext, useEffect } from "react";

// Nilai yang boleh di-override oleh halaman (berasal dari data dinamis).
export type PageHeaderOverride = {
  mobileSubtitle?: string;
};

type SetPageHeaderOverride = (override: PageHeaderOverride) => void;

export const PageHeaderContext = createContext<SetPageHeaderOverride>(
  () => {}
);

// Dipakai halaman yang subtitle header mobile-nya bergantung pada data,
// misalnya "Matematika - Kelas X TKJ" di halaman pemantauan.
// Override dibersihkan otomatis saat halaman ditinggalkan.
export function usePageHeader({ mobileSubtitle }: PageHeaderOverride) {
  const setOverride = useContext(PageHeaderContext);

  useEffect(() => {
    setOverride({ mobileSubtitle });

    return () => setOverride({});
  }, [setOverride, mobileSubtitle]);
}
