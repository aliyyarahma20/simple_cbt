import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const createTeacherSchema = z.object({
  full_name: z.string().trim().min(2, "Nama minimal 2 karakter."),
  email: z.string().trim().email("Format email tidak valid."),
  password: z.string().min(8, "Password minimal 8 karakter."),
});

export async function POST(request: Request) {
  try {
    // 1. Verifikasi session pemanggil
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Belum terautentikasi." },
        { status: 401 }
      );
    }

    // 2. Pastikan pemanggil adalah POKJA yang aktif
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      profile.role !== "POKJA" ||
      !profile.is_active
    ) {
      return NextResponse.json(
        { success: false, message: "Akses hanya untuk POKJA." },
        { status: 403 }
      );
    }

    // 3. Validasi input
    const body: unknown = await request.json();
    const validation = createTeacherSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Data akun guru tidak valid.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { full_name, email, password } = validation.data;

    // 4. Buat akun melalui Supabase Auth Admin API
    const admin = createAdminClient();

    const { data: authData, error: createAuthError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
        },
      });

    if (createAuthError || !authData.user) {
      console.error("Create Auth user error:", createAuthError);

      return NextResponse.json(
        {
          success: false,
          message: "Gagal membuat akun guru.",
        },
        { status: 400 }
      );
    }

    // 5. Buat profil di public.users
    const { data: newTeacher, error: insertProfileError } = await admin
      .from("users")
      .insert({
        id: authData.user.id,
        full_name,
        email,
        role: "GURU",
        is_active: true,
      })
      .select("id, full_name, email, role, is_active")
      .single();

    // 6. Jika profil gagal dibuat, hapus akun Auth agar tidak yatim
    if (insertProfileError || !newTeacher) {
      console.error("Insert teacher profile error:", insertProfileError);

      const { error: deleteAuthError } =
        await admin.auth.admin.deleteUser(authData.user.id);

      if (deleteAuthError) {
        console.error(
          "Rollback delete Auth user error:",
          deleteAuthError
        );
      }

      return NextResponse.json(
        {
          success: false,
          message:
            "Akun Auth berhasil dibuat, tetapi profil database gagal disimpan.",
        },
        { status: 500 }
      );
    }

    // 7. Berhasil
    return NextResponse.json(
      {
        success: true,
        message: "Akun guru berhasil dibuat.",
        data: {
          user: newTeacher,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create teacher error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan pada server.",
        error:
          error instanceof Error
            ? error.message
            : "Unknown server error.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // 1. Verifikasi session
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Belum terautentikasi." },
        { status: 401 }
      );
    }

    // 2. Pastikan pengguna adalah POKJA aktif
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      profile.role !== "POKJA" ||
      !profile.is_active
    ) {
      return NextResponse.json(
        { success: false, message: "Akses hanya untuk POKJA." },
        { status: 403 }
      );
    }

    // 3. Ambil semua profil GURU
    const { data: teachers, error: teachersError } = await supabase
      .from("users")
      .select("id, full_name, email, role, is_active, created_at")
      .eq("role", "GURU")
      .order("created_at", { ascending: false });

    if (teachersError) {
      console.error("Get teachers error:", teachersError);

      return NextResponse.json(
        { success: false, message: "Gagal mengambil daftar guru." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Daftar guru berhasil diambil.",
      data: {
        teachers,
        total: teachers.length,
      },
    });
  } catch (error) {
    console.error("Get teachers error:", error);

    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}