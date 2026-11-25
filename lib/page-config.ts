// ==========================================
// KONFIGURASI HALAMAN BERDASARKAN ROUTE
// Dipakai AppShell untuk menentukan judul Topbar,
// menu aktif, dan perilaku header mobile.
// ==========================================

export type NavLabel = "Beranda" | "Ujian" | "Soal" | "Profil";

export type RouteParams = Record<string, string>;

export const NAV_ROUTES: Record<NavLabel, string> = {
  Beranda: "/dashboard",
  Ujian: "/ujian",
  Soal: "/soal",
  Profil: "/profil",
};

export type MobileHeaderConfig = {
  // "home"  : kartu sapaan pengguna (Beranda)
  // "page"  : tombol kembali + judul + subtitle
  variant: "home" | "page";
  // Subtitle khusus header mobile (boleh berbeda dari desktop)
  subtitle?: string;
  // "history" = router.back(), atau fungsi yang mengembalikan URL tujuan
  back?: "history" | ((params: RouteParams) => string);
};

export type PageConfig = {
  title: string;
  subtitle: string;
  activePage: NavLabel;
  mobile: MobileHeaderConfig;
};

type RouteEntry = {
  path: string;
  config: PageConfig;
};

const ROUTES: RouteEntry[] = [
  {
    path: "/dashboard",
    config: {
      title: "Beranda",
      subtitle: "Selamat datang di Simple-CBT",
      activePage: "Beranda",
      mobile: { variant: "home" },
    },
  },
  {
    path: "/ujian",
    config: {
      title: "Daftar Ujian",
      subtitle: "Kelola dan pantau seluruh ujian",
      activePage: "Ujian",
      mobile: { variant: "page", back: "history" },
    },
  },
  {
    path: "/ujian/:id",
    config: {
      title: "Detail Ujian",
      subtitle: "Informasi dan pengelolaan ujian",
      activePage: "Ujian",
      mobile: {
        variant: "page",
        subtitle: "Informasi dan pengelolaan ujian",
        back: () => "/ujian",
      },
    },
  },
  {
    path: "/ujian/:id/edit",
    config: {
      title: "Edit Ujian",
      subtitle: "Perbarui informasi dan pengaturan ujian",
      activePage: "Ujian",
      mobile: {
        variant: "page",
        subtitle: "Pengaturan dan pengelolaan ujian",
        back: ({ id }) => `/ujian/${id}`,
      },
    },
  },
  {
    path: "/ujian/:id/pemantauan",
    config: {
      title: "Pemantauan Ujian",
      subtitle: "Pantau aktivitas dan pelanggaran peserta ujian",
      activePage: "Ujian",
      // Subtitle mobile diisi halaman lewat usePageHeader()
      // karena berisi nama mata pelajaran dan kelas.
      mobile: {
        variant: "page",
        back: ({ id }) => `/ujian/${id}`,
      },
    },
  },
    {
    path: "/profil",
    config: {
      title: "Profil",
      subtitle: "Informasi akun Anda",
      activePage: "Profil",
      mobile: {
        variant: "page",
        subtitle: "Informasi akun Anda",
        back: () => "/dashboard",
      },
    },
  },
];

const DEFAULT_CONFIG: PageConfig = {
  title: "Simple-CBT",
  subtitle: "",
  activePage: "Beranda",
  mobile: { variant: "page", back: "history" },
};

function matchPath(
  pattern: string,
  pathname: string
): RouteParams | null {
  const patternSegments = pattern.split("/").filter(Boolean);
  const pathSegments = pathname.split("/").filter(Boolean);

  if (patternSegments.length !== pathSegments.length) return null;

  const params: RouteParams = {};

  for (let i = 0; i < patternSegments.length; i++) {
    const expected = patternSegments[i];
    const actual = pathSegments[i];

    if (expected.startsWith(":")) {
      params[expected.slice(1)] = decodeURIComponent(actual);
    } else if (expected !== actual) {
      return null;
    }
  }

  return params;
}

export function getPageConfig(pathname: string): {
  config: PageConfig;
  params: RouteParams;
} {
  for (const route of ROUTES) {
    const params = matchPath(route.path, pathname);

    if (params) {
      return { config: route.config, params };
    }
  }

  return { config: DEFAULT_CONFIG, params: {} };
}
