import { NextResponse } from "next/server";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  // Harus di luar try-catch agar sinyal prerender Next.js tidak tertangkap.
  await connection();

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: "Belum terautentikasi.",
        },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, full_name, email, role, is_active")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          success: false,
          message: "Profil pengguna tidak ditemukan.",
        },
        { status: 403 }
      );
    }

    if (!profile.is_active) {
      return NextResponse.json(
        {
          success: false,
          message: "Akun tidak aktif.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Autentikasi berhasil.",
      data: {
        user: {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          role: profile.role,
        },
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}