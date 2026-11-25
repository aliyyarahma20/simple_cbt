import { Suspense, type ReactNode } from "react";

import { AuthProvider } from "@/components/providers/AuthProvider";
import AppShell from "@/components/layout/AppShell";
import { AuthLoadingScreen } from "@/components/layout/AuthScreens";

// Layout untuk semua halaman yang membutuhkan login.
// AuthProvider mengambil /api/auth/me satu kali, lalu AppShell
// menyediakan Sidebar, Topbar, dan BottomNavigation untuk semua halaman.
//
// Suspense diperlukan karena AppShell memakai usePathname() dan
// route dinamis seperti /ujian/[id] (cacheComponents aktif).
export default function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthProvider>
      <Suspense fallback={<AuthLoadingScreen />}>
        <AppShell>{children}</AppShell>
      </Suspense>
    </AuthProvider>
  );
}
