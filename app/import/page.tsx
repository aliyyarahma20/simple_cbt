"use client";

import { useState } from "react";
import type { HasilSimpan, PratinjauFile } from "@/lib/import/types";

// Ringkasan dari parser (ringkasan_soal). Opsional supaya halaman tetap jalan
// kalau API belum meneruskan field ini.
type RingkasanSoal = {
  jumlah_pg: number;
  jumlah_esai: number;
  jumlah_lain: number;
  jumlah_gambar: number;
  gambar_soal: number;
  gambar_bacaan: number;
  jumlah_rumus: number;
  rumus_soal: number;
  rumus_bacaan: number;
  jumlah_bacaan: number;
  soal_terkait_bacaan: number;
  bacaan: {
    mulai_no: number;
    jumlah_soal: number;
    cuplikan: string;
    gambar: number;
    rumus: number;
  }[];
  acak_diizinkan: boolean;
};

type PratinjauLengkap = PratinjauFile & { ringkasan?: RingkasanSoal };

type PreviewResponse = {
  dryRun: true;
  mode: string;
  ringkasan: Record<"GREEN" | "YELLOW" | "RED", number>;
  files: PratinjauLengkap[];
};

type SaveResponse = {
  dryRun: false;
  hasil: HasilSimpan[];
};

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [results, setResults] = useState<HasilSimpan[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submitImport(
    dryRun: boolean,
    only: "GREEN" | "GREEN_YELLOW" = "GREEN"
  ) {
    if (!file) {
      setError("Pilih file terlebih dahulu.");
      return;
    }

    setBusy(true);
    setError("");
    setResults(null);

    const form = new FormData();
    form.append("file", file);
    form.append("dryRun", String(dryRun));
    form.append("hanya", only);

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? `Gagal (${response.status})`);
      }

      if (dryRun) {
        setPreview(data as PreviewResponse);
      } else {
        setResults((data as SaveResponse).hasil);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan."
      );
    } finally {
      setBusy(false);
    }
  }

  const warna = {
    GREEN: "#15803d",
    YELLOW: "#b45309",
    RED: "#b91c1c",
  };

  return (
    <main style={{
    minHeight: "100vh",
    maxWidth: 1000,
    margin: "0 auto",
    padding: "40px 24px",
    fontFamily: "Arial, sans-serif",
    color: "#1e293b",
    background: "#f8fafc",
    }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>
        Impor Soal
      </h1>
      <p style={{ color: "#666", marginBottom: 28 }}>
        Uji coba parsing dan penyimpanan soal dari DOCX, XLSX, atau ZIP.
      </p>

      <section style={{
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 20,
        marginBottom: 24,
      }}>
        <h2 style={{ fontSize: 18, marginBottom: 14 }}>
          1. Pilih file
        </h2>

        <input
          type="file"
          accept=".docx,.xlsx,.zip"
          disabled={busy}
          onChange={(event) => {
            const selected = event.currentTarget.files?.[0] ?? null;

            setFile(selected);
            setPreview(null);
            setResults(null);
            setError("");
          }}
        />

        <p style={{ marginTop: 12, color: "#555" }}>
          {file
            ? `File dipilih: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
            : "Belum ada file yang dipilih."}
        </p>

        <button
          type="button"
          disabled={busy}
          onClick={() => submitImport(true)}
          style={buttonStyle("#2563eb", busy)}
        >
          {busy ? "Memproses..." : "Pratinjau"}
        </button>
      </section>

      {error && (
        <div style={{
          padding: 14,
          borderRadius: 8,
          background: "#fee2e2",
          color: "#991b1b",
          marginBottom: 20,
          overflowWrap: "anywhere",
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {preview && (
        <section style={{
          border: "1px solid #ddd",
          borderRadius: 10,
          padding: 20,
          marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>
            2. Hasil pratinjau
          </h2>

          <p style={{ marginBottom: 14 }}>
            Mode pengguna: <strong>{preview.mode}</strong>
          </p>

          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
          }}>
            {(["GREEN", "YELLOW", "RED"] as const).map((level) => (
              <div key={level} style={{
                padding: "12px 18px",
                border: `1px solid ${warna[level]}`,
                borderRadius: 8,
                color: warna[level],
              }}>
                <strong>{level}</strong>
                <div>{preview.ringkasan[level]} file</div>
              </div>
            ))}
          </div>

          {preview.files.map((item, index) => (
            <article key={`${item.file}-${index}`} style={{
              borderTop: "1px solid #ddd",
              padding: "18px 0",
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}>
                <strong>{item.file}</strong>
                <strong style={{ color: warna[item.level] }}>
                  {item.level}
                </strong>
              </div>

              <p style={{ marginTop: 10 }}>
                Jumlah soal: <strong>{item.jumlah_soal}</strong>
              </p>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 8,
                marginTop: 12,
              }}>
                <Info label="Mata pelajaran" value={item.mapel} />
                <Info label="Kelas" value={item.kelas} />
                <Info label="Jenis ujian" value={item.jenis} />
                <Info label="Guru" value={item.guru} />
              </div>

              {item.ringkasan && <RingkasanBlock r={item.ringkasan} />}

              {item.catatan.length > 0 && (
                <div style={{
                  marginTop: 12,
                  padding: 12,
                  background: "#fff7ed",
                  borderRadius: 8,
                }}>
                  <strong>Catatan:</strong>
                  <ul style={{ paddingLeft: 20, marginTop: 6 }}>
                    {item.catatan.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}

          <div style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 16,
          }}>
            <button
              type="button"
              disabled={busy || preview.ringkasan.GREEN === 0}
              onClick={() => submitImport(false, "GREEN")}
              style={buttonStyle("#15803d", busy || preview.ringkasan.GREEN === 0)}
            >
              Simpan GREEN
            </button>

            <button
              type="button"
              disabled={
                busy ||
                preview.ringkasan.GREEN + preview.ringkasan.YELLOW === 0
              }
              onClick={() => submitImport(false, "GREEN_YELLOW")}
              style={buttonStyle(
                "#b45309",
                busy ||
                preview.ringkasan.GREEN + preview.ringkasan.YELLOW === 0
              )}
            >
              Simpan GREEN + YELLOW
            </button>
          </div>

          <p style={{ color: "#777", fontSize: 13, marginTop: 12 }}>
            Proses simpan akan menjalankan parsing ulang sebelum memasukkan data.
          </p>
        </section>
      )}

      {results && (
        <section style={{
          border: "1px solid #ddd",
          borderRadius: 10,
          padding: 20,
        }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>
            3. Hasil penyimpanan
          </h2>

          {results.map((item, index) => (
            <div key={`${item.file}-${index}`} style={{
              padding: 14,
              borderBottom: "1px solid #eee",
            }}>
              <strong>{item.file}</strong>
              <p style={{
                marginTop: 6,
                color: item.status === "TERSIMPAN" ? "#15803d" : "#b91c1c",
              }}>
                {item.status}
              </p>
              {item.exam_id && <p>ID ujian: {item.exam_id}</p>}
              {item.jumlah_soal !== undefined && (
                <p>Jumlah soal tersimpan: {item.jumlah_soal}</p>
              )}
              {item.alasan && <p>Alasan: {item.alasan}</p>}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

function RingkasanBlock({ r }: { r: RingkasanSoal }) {
  return (
    <div style={{
      marginTop: 14,
      padding: 14,
      background: "#f1f5f9",
      borderRadius: 8,
    }}>
      <strong>Isi soal terdeteksi</strong>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 8,
        marginTop: 10,
      }}>
        <Info label="Pilihan ganda (PG)" value={String(r.jumlah_pg)} />
        <Info label="Esai" value={String(r.jumlah_esai)} />
        <Info
          label="Gambar"
          value={`${r.jumlah_gambar} (soal ${r.gambar_soal}, bacaan ${r.gambar_bacaan})`}
        />
        <Info
          label="Rumus"
          value={`${r.jumlah_rumus} (soal ${r.rumus_soal}, bacaan ${r.rumus_bacaan})`}
        />
        <Info label="Bacaan / deskripsi" value={String(r.jumlah_bacaan)} />
      </div>

      {r.jumlah_lain > 0 && (
        <p style={{ marginTop: 10, color: "#b91c1c" }}>
          {r.jumlah_lain} soal berjenis tidak dikenali (lihat catatan).
        </p>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <small style={{ color: "#777" }}>{label}</small>
      <div>{value || "-"}</div>
    </div>
  );
}

function buttonStyle(background: string, disabled: boolean) {
  return {
    background,
    color: "white",
    border: "none",
    borderRadius: 7,
    padding: "11px 16px",
    marginTop: 16,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    fontWeight: 600,
  } as const;
}