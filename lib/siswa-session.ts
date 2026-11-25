"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

// ==========================================
// SESI SISWA (sementara, UI saja)
// Disimpan di memori + sessionStorage supaya tetap ada
// saat halaman di-refresh. Nanti bisa diganti dengan API.
// ==========================================

const STORAGE_KEY = "simple-cbt:siswa-session";

export type SiswaSession = {
  token: string;
  name: string;
  className: string;
  startedAt: number | null;
  answers: Record<number, number>;
  flagged: number[];
  violations: number;
  finishedAt: number | null;
};

type Listener = () => void;

const listeners = new Set<Listener>();

let current: SiswaSession | null = null;
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;

  loaded = true;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    current = raw ? (JSON.parse(raw) as SiswaSession) : null;
  } catch {
    current = null;
  }
}

function commit(next: SiswaSession | null) {
  current = next;
  loaded = true;

  try {
    if (next) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // sessionStorage tidak tersedia: data tetap ada di memori.
  }

  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getSiswaSession() {
  load();

  return current;
}

export function startSiswaSession(token: string) {
  commit({
    token,
    name: "",
    className: "",
    startedAt: null,
    answers: {},
    flagged: [],
    violations: 0,
    finishedAt: null,
  });
}

export function updateSiswaSession(
  update: (session: SiswaSession) => Partial<SiswaSession>
) {
  const session = getSiswaSession();

  if (!session) return;

  commit({ ...session, ...update(session) });
}

export function clearSiswaSession() {
  commit(null);
}

// ==========================================
// HOOK
// ==========================================

const noopSubscribe = () => () => {};

export function useSiswaSession() {
  const session = useSyncExternalStore(
    subscribe,
    getSiswaSession,
    () => null
  );

  // false di server dan saat hydration, true setelahnya.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  return { session, hydrated };
}

// ==========================================
// GUARD ALUR: token -> biodata -> konfirmasi -> ujian -> selesai
// ==========================================

export type SiswaPage =
  | "biodata"
  | "konfirmasi"
  | "ujian"
  | "selesai";

const PAGE_RANK: Record<SiswaPage, number> = {
  biodata: 1,
  konfirmasi: 2,
  ujian: 3,
  selesai: 4,
};

const RANK_PATH: Record<number, string> = {
  1: "/siswa/biodata",
  2: "/siswa/konfirmasi",
  3: "/siswa/ujian",
  4: "/siswa/selesai",
};

function getSessionRank(session: SiswaSession) {
  if (session.finishedAt) return 4;
  if (session.startedAt) return 3;
  if (session.name && session.className) return 2;
  return 1;
}

function getRedirect(
  session: SiswaSession | null,
  page: SiswaPage
): string | null {
  if (!session) return "/";

  const rank = getSessionRank(session);
  const pageRank = PAGE_RANK[page];

  // Ujian yang sudah dimulai tidak bisa kembali ke langkah sebelumnya.
  const allowed = rank >= 3 ? pageRank === rank : pageRank <= rank;

  return allowed ? null : RANK_PATH[rank];
}

// Mengembalikan sesi jika siswa boleh membuka halaman ini,
// atau null (dan mengarahkan ke langkah yang benar) jika tidak.
export function useSiswaGuard(page: SiswaPage) {
  const router = useRouter();
  const { session, hydrated } = useSiswaSession();

  const redirectTo = hydrated ? getRedirect(session, page) : null;

  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  return hydrated && !redirectTo ? session : null;
}