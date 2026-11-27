import { NextResponse } from "next/server";
import { getImportUser, daftarGuru } from "@/lib/import/auth";
import { panggilParser } from "@/lib/import/parser";
import { keButir, keRingkasan, simpanSatu } from "@/lib/import/save";
import type { Level } from "@/lib/import/types";


export async function POST(request: Request) {
  try {
    const user = await getImportUser();

    if (!user) {
      return NextResponse.json(
        { error: "Session tidak valid. Silakan login kembali." },
        { status: 401 }
      );
    }

    if (!user.canImport) {
      return NextResponse.json(
        { error: "Role ini tidak memiliki akses impor." },
        { status: 403 }
      );
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File wajib diunggah." },
        { status: 400 }
      );
    }

    if (!/\.(docx|xlsx|zip)$/i.test(file.name)) {
      return NextResponse.json(
        { error: "Format yang didukung hanya DOCX, XLSX, dan ZIP." },
        { status: 400 }
      );
    }

    const maxMb = Number(process.env.MAX_FILE_MB ?? 20);

    if (file.size > maxMb * 1024 * 1024) {
      return NextResponse.json(
        { error: `Ukuran file maksimal ${maxMb} MB.` },
        { status: 413 }
      );
    }

    const dryRun = form.get("dryRun") !== "false";
    const hanya: Level[] =
      form.get("hanya") === "GREEN_YELLOW"
        ? ["GREEN", "YELLOW"]
        : ["GREEN"];

    const guruMap = await daftarGuru();

    const hasilParser = await panggilParser(file, {
      mode: user.mode,
      uploaderId: user.id,
      guruMap,
      lengkap: true,
    });

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        mode: user.mode,
        ringkasan: hasilParser.ringkasan,
        files: hasilParser.files.map(keRingkasan),
      });
    }

    const hasil = [];

    for (const parsedFile of hasilParser.files) {
      if (!hanya.includes(parsedFile.level)) {
        hasil.push({
          file: parsedFile.file,
          status: "DILEWATI" as const,
          alasan: `Level ${parsedFile.level} tidak termasuk pilihan penyimpanan.`,
        });
        continue;
      }

      hasil.push(
        await simpanSatu(parsedFile, user.id, user.role, guruMap)
      );
    }

    return NextResponse.json({
      dryRun: false,
      hasil,
    });
  } catch (error) {
    console.error("Import error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memproses impor.",
      },
      { status: 500 }
    );
  }
}
