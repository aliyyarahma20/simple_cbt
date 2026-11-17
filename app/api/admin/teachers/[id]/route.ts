import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const updateTeacherSchema = z.object({
  is_active: z.boolean({
    message: "Status akun harus berupa boolean.",
  }),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    // 1. Validasi ID guru
    const { id } = await context.params;

    const idValidation = z.string().uuid().safeParse(id);

    if (!idValidation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "ID guru tidak valid.",
        },
        { status: 400 }
      );
    }

    // 2. Validasi body request
    const body: unknown = await request.json();
    const validation = updateTeacherSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Data perubahan tidak valid.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { is_active } = validation.data;

    // 3. Periksa session pengguna
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

    // 4. Pastikan pengguna adalah POKJA aktif
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role, is_active")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      !profile.is_active ||
      profile.role !== "POKJA"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak. Hanya POKJA aktif yang dapat mengelola akun guru.",
        },
        { status: 403 }
      );
    }

    // 5. Cegah POKJA menonaktifkan akunnya sendiri
    if (id === user.id && !is_active) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda tidak dapat menonaktifkan akun sendiri.",
        },
        { status: 400 }
      );
    }

    // 6. Gunakan Admin Client untuk memeriksa akun tujuan
    const admin = createAdminClient();

    const { data: targetTeacher, error: targetError } = await admin
      .from("users")
      .select("id, full_name, email, role, is_active")
      .eq("id", id)
      .maybeSingle();

    if (targetError) {
      console.error("Find teacher error:", targetError);

      return NextResponse.json(
        {
          success: false,
          message: "Gagal memeriksa akun guru.",
        },
        { status: 500 }
      );
    }

    if (!targetTeacher || targetTeacher.role !== "GURU") {
      return NextResponse.json(
        {
          success: false,
          message: "Akun guru tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    // 7. Perbarui status akun guru
    const { data: updatedTeacher, error: updateError } = await admin
      .from("users")
      .update({
        is_active,
      })
      .eq("id", id)
      .select("id, full_name, email, role, is_active")
      .single();

    if (updateError || !updatedTeacher) {
      console.error("Update teacher error:", updateError);

      return NextResponse.json(
        {
          success: false,
          message: "Gagal memperbarui status akun guru.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: is_active
        ? "Akun guru berhasil diaktifkan."
        : "Akun guru berhasil dinonaktifkan.",
      data: {
        teacher: updatedTeacher,
      },
    });
  } catch (error) {
    console.error("Update teacher error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}