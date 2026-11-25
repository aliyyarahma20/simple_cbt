
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Verifikasi session menggunakan token.
  // Verifikasi session menggunakan token.
const {
  data: claimsData,
  error: claimsError,
} = await supabase.auth.getClaims();

const claims = claimsError ? null : claimsData?.claims ?? null;

  const pathname = request.nextUrl.pathname;

  // Halaman yang wajib membutuhkan autentikasi.
  const protectedRoutes = [
    "/dashboard",
    "/ujian",
    "/profil",
    "/admin",
  ];

  const isProtectedRoute = protectedRoutes.some(
    (route) =>
      pathname === route || pathname.startsWith(`${route}/`)
  );

  // Jika belum login dan membuka halaman yang dilindungi,
  // arahkan kembali ke halaman login.
  if (!claims && isProtectedRoute) {
    const redirectUrl = new URL("/", request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl);

    // Pertahankan cookie yang mungkin diperbarui Supabase.
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  return supabaseResponse;
}