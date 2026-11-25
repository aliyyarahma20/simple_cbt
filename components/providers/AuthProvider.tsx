"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";

// ==========================================
// TYPE
// ==========================================

export type UserRole = "POKJA" | "GURU";

export type AuthUser = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
};

type AuthMeResponse = {
  success: boolean;
  message: string;
  data: {
    user: AuthUser;
  };
};

export type AuthStatus = "loading" | "authenticated" | "error";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  error: string;
  isLoggingOut: boolean;
  // "POKJA" atau "Guru"
  roleLabel: string;
  // "POKJA - SMKN 2 Garut" atau "Guru - SMKN 2 Garut"
  roleLabelWithSchool: string;
  refresh: () => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// ==========================================
// PROVIDER
// ==========================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Dinaikkan saat "Coba Lagi" untuk mengambil ulang session
  const [reloadKey, setReloadKey] = useState(0);

  // Ambil data pengguna dari /api/auth/me.
  // Hanya berjalan saat provider pertama kali dimuat
  // (atau saat refresh() dipanggil), bukan di tiap halaman.
  useEffect(() => {
    let active = true;

    apiRequest<AuthMeResponse>("/api/auth/me", { method: "GET" })
      .then((response) => {
        if (!response.success || !response.data?.user) {
          throw new Error(
            response.message || "Gagal mengambil data pengguna."
          );
        }

        if (!active) return;

        setUser(response.data.user);
        setError("");
        setStatus("authenticated");
      })
      .catch((err: unknown) => {
        if (!active) return;

        setUser(null);
        setError(
          err instanceof Error
            ? err.message
            : "Gagal mengambil data pengguna."
        );
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const refresh = useCallback(() => {
    setStatus("loading");
    setError("");
    setReloadKey((key) => key + 1);
  }, []);

  const logout = useCallback(async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);

      await apiRequest("/api/auth/logout", { method: "POST" });

      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);

      alert(
        err instanceof Error
          ? err.message
          : "Gagal melakukan logout. Silakan coba lagi."
      );

      setIsLoggingOut(false);
    }
  }, [isLoggingOut, router]);

  const value = useMemo<AuthContextValue>(() => {
    const roleLabel = user?.role === "POKJA" ? "POKJA" : "Guru";

    return {
      user,
      status,
      error,
      isLoggingOut,
      roleLabel,
      roleLabelWithSchool: `${roleLabel} - SMKN 2 Garut`,
      refresh,
      logout,
    };
  }, [user, status, error, isLoggingOut, refresh, logout]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

// ==========================================
// HOOK
// ==========================================

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth harus dipakai di dalam <AuthProvider>.");
  }

  return context;
}

// Untuk halaman di dalam AppShell: pengguna dijamin sudah ada
// karena AppShell hanya merender halaman setelah autentikasi berhasil.
export function useUser() {
  const { user } = useAuth();

  if (!user) {
    throw new Error(
      "useUser hanya boleh dipakai setelah autentikasi berhasil."
    );
  }

  return user;
}
