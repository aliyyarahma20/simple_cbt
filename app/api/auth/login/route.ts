import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().trim().email("Format email tidak valid."),
  password: z.string().min(1, "Password wajib diisi."),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Email atau password tidak valid.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    const supabase = await createClient();

    // Login melalui Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Email atau password salah.",
        },
        { status: 401 }
      );
    }

    // Ambil profil aplikasi dari public.users
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, full_name, email, role, is_active")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      // User Auth ada, tetapi belum mempunyai profil aplikasi.
      await supabase.auth.signOut();

      return NextResponse.json(
        {
          success: false,
          message: "Profil pengguna belum terdaftar.",
        },
        { status: 403 }
      );
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();

      return NextResponse.json(
        {
          success: false,
          message: "Akun tidak aktif. Hubungi POKJA.",
        },
        { status: 403 }
      );
    }

    if (profile.role !== "POKJA" && profile.role !== "GURU") {
      await supabase.auth.signOut();

      return NextResponse.json(
        {
          success: false,
          message: "Role pengguna tidak valid.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Login berhasil.",
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
    console.error("Login error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}