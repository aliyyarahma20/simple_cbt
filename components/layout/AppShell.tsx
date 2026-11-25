"use client";

import { useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";

import { useAuth } from "@/components/providers/AuthProvider";
import { getPageConfig, NAV_ROUTES, type NavLabel } from "@/lib/page-config";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import BottomNavigation from "./BottomNavigation";
import MobileHeader from "./MobileHeader";
import { AuthErrorScreen, AuthLoadingScreen } from "./AuthScreens";
import {
  PageHeaderContext,
  type PageHeaderOverride,
} from "./PageHeaderContext";

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const {
    user,
    status,
    error,
    isLoggingOut,
    roleLabel,
    roleLabelWithSchool,
    refresh,
    logout,
  } = useAuth();

  const [headerOverride, setHeaderOverride] =
    useState<PageHeaderOverride>({});

  // Panel notifikasi menutup sendiri saat pindah halaman.
  const [notificationsPath, setNotificationsPath] = useState<
    string | null
  >(null);

  const showNotifications = notificationsPath === pathname;

  // Shell selalu dirender (termasuk children) walau auth belum selesai;
  // layar loading/error ditampilkan sebagai overlay di atasnya.
  const userName = user?.full_name ?? "";

  const { config, params } = useMemo(
    () => getPageConfig(pathname),
    [pathname]
  );

  // ==========================================
  // HANDLER
  // ==========================================

  const handleNavigation = (label: string) => {
    const href = NAV_ROUTES[label as NavLabel];

    if (href) {
      router.push(href);
    } else {
      alert(`Halaman ${label} akan dikembangkan selanjutnya.`);
    }
  };

  const handleAction = (label: string) => {
    alert(`Fitur ${label} akan dikembangkan selanjutnya.`);
  };

  const toggleNotifications = () => {
    setNotificationsPath((current) =>
      current === pathname ? null : pathname
    );
  };

  const handleBack = () => {
    const { back } = config.mobile;

    if (typeof back === "function") {
      router.push(back(params));
    } else {
      router.back();
    }
  };

  // ==========================================
  // TAMPILAN
  // ==========================================

  return (
    <div className="min-h-screen bg-[#F5F8FC] text-[#15395D]">

      {/* STATUS AUTENTIKASI (menutupi shell sampai sesi valid) */}
      {status === "loading" && (
        <div className="fixed inset-0 z-[200]">
          <AuthLoadingScreen />
        </div>
      )}

      {(status === "error" || (status === "authenticated" && !user)) && (
        <div className="fixed inset-0 z-[200]">
          <AuthErrorScreen
            message={error}
            onRetry={refresh}
            onBackToLogin={() => router.replace("/")}
          />
        </div>
      )}

      <div className="min-h-screen flex">

        {/* SIDEBAR DESKTOP */}
        <Sidebar
          activePage={config.activePage}
          onNavigate={handleNavigation}
          onAction={handleAction}
          onLogout={logout}
          isLoggingOut={isLoggingOut}
          userName={userName}
          userRole={roleLabel}
        />

        {/* MAIN CONTENT */}
        <div className="flex-1 min-w-0 lg:ml-[250px]">

          {/* TOPBAR DESKTOP */}
          <Topbar
            title={config.title}
            subtitle={config.subtitle}
            onNotificationClick={toggleNotifications}
            userName={userName}
            userRole={roleLabelWithSchool}
          />

          {/* HEADER MOBILE */}
          {config.mobile.variant === "home" ? (
            <MobileHeader
              variant="home"
              userName={userName}
              roleLabel={roleLabelWithSchool}
              onNotificationClick={toggleNotifications}
            />
          ) : (
            <MobileHeader
              variant="page"
              title={config.title}
              subtitle={
                headerOverride.mobileSubtitle ?? config.mobile.subtitle
              }
              onBack={handleBack}
            />
          )}

          {/* NOTIFICATION PANEL */}
          {showNotifications && (
            <div className="mx-5 lg:mx-8 mt-3 bg-white rounded-2xl border border-slate-100 shadow-lg p-4 relative z-20">

              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm">Notifikasi</p>

                <button
                  onClick={() => setNotificationsPath(null)}
                  aria-label="Tutup notifikasi"
                >
                  <X size={17} />
                </button>
              </div>

              <p className="text-sm text-slate-500">
                Belum ada notifikasi baru.
              </p>

            </div>
          )}

          {/* PAGE CONTENT */}
          <PageHeaderContext.Provider value={setHeaderOverride}>
            <main>{children}</main>
          </PageHeaderContext.Provider>

        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <BottomNavigation
        activePage={config.activePage}
        onNavigate={handleNavigation}
      />
    </div>
  );
}
