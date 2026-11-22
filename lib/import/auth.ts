import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ImportRole = "POKJA" | "GURU";

export interface ImportUser {
  id: string;
  nama: string;
  email: string;
  role: ImportRole;
  mode: ImportRole;
  canImport: boolean;
}

export async function getImportUser(): Promise<ImportUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const admin = createAdminClient();

  const { data: profile, error } = await admin
    .from("users")
    .select("id, full_name, email, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(`Gagal membaca profil: ${error.message}`);

  if (
    !profile ||
    !profile.is_active ||
    (profile.role !== "POKJA" && profile.role !== "GURU")
  ) {
    return null;
  }

  return {
    id: profile.id,
    nama: profile.full_name,
    email: profile.email,
    role: profile.role,
    mode: profile.role,
    canImport: true,
  };
}

export async function daftarGuru(): Promise<Record<string, string>> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("users")
    .select("id, full_name")
    .eq("role", "GURU")
    .eq("is_active", true);

  if (error) {
    throw new Error(`Gagal membaca daftar guru: ${error.message}`);
  }

  return Object.fromEntries(
    (data ?? []).map((guru) => [guru.full_name, guru.id])
  );
}
