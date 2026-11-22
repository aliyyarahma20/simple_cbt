import "server-only";
import type { ParserBatch, ParserFile } from "./types";
import { wajibEnv } from "./util";

interface Opsi {
  mode: "POKJA" | "GURU";
  uploaderId: string;
  guruMap: Record<string, string>;
  lengkap: boolean;
}

export async function panggilParser(
  file: File,
  opsi: Opsi
): Promise<ParserBatch> {
  const isZip = file.name.toLowerCase().endsWith(".zip");

  const form = new FormData();
  form.append("file", file, file.name);
  form.append("mode", opsi.mode);
  form.append("uploader_id", opsi.uploaderId);
  form.append("guru_list", JSON.stringify(opsi.guruMap));
  form.append("include_rows", String(opsi.lengkap));
  form.append("include_images", String(opsi.lengkap));

  const baseUrl = wajibEnv("PARSER_URL").replace(/\/+$/, "");
  const apiKey = wajibEnv("PARSER_API_KEY");

  const response = await fetch(
    `${baseUrl}/${isZip ? "parse-batch" : "parse"}`,
    {
      method: "POST",
      headers: { "X-API-Key": apiKey },
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(120_000),
    }
  );

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Parser-service ${response.status}: ${detail}`);
  }

  const result = await response.json();

  if (isZip) return result as ParserBatch;

  const parsed = result as ParserFile;

  return {
    job_id: crypto.randomUUID(),
    total_file: 1,
    ringkasan: {
      GREEN: parsed.level === "GREEN" ? 1 : 0,
      YELLOW: parsed.level === "YELLOW" ? 1 : 0,
      RED: parsed.level === "RED" ? 1 : 0,
    },
    files: [parsed],
  };
}
