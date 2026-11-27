"use client";

import { useRef, useState } from "react";
import type { HasilSimpan, PratinjauFile } from "@/lib/import/types";
import PeriksaSoal, {
  type ItemPeriksa,
  type Marks,
  type Penanda,
} from "./periksa-soal";

/* ───────────────────────── Types (sama seperti sebelumnya) ───────────────────────── */

type RingkasanSoal = {
  jumlah_pg: number;
  jumlah_pgk: number;
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

type PratinjauLengkap = PratinjauFile & {
  ringkasan?: RingkasanSoal;
  butir?: ItemPeriksa[]; // daftar bacaan + soal untuk pemeriksaan
};

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

type Level = "GREEN" | "YELLOW" | "RED";

/* ───────────────────────── Tema (diambil dari desain SIMPLE-CBT) ───────────────────────── */

const LEVEL: Record<
  Level,
  { label: string; hint: string; fg: string; bg: string }
> = {
  GREEN: { label: "Siap", hint: "Bisa langsung disimpan", fg: "#15803d", bg: "#e3f6ea" },
  YELLOW: { label: "Perlu dicek", hint: "Ada catatan, periksa dulu", fg: "#b45309", bg: "#fff0e1" },
  RED: { label: "Bermasalah", hint: "Tidak bisa disimpan", fg: "#b91c1c", bg: "#fde8e8" },
};

const css = `
.imp {
  --navy: #12385c;
  --navy-2: #1b4a76;
  --ink: #16263a;
  --muted: #6b7a8c;
  --line: #e6ebf2;
  --bg: #f6f8fc;
  --card: #ffffff;
  --tile: #e8f1fd;
  --blue: #2563eb;
  --orange: #f08a3c;
  --orange-d: #dc7424;
  min-height: 100vh;
  background: var(--bg);
  color: var(--ink);
  font-family: "Plus Jakarta Sans", "Inter", system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
  padding-bottom: 120px;
}
.imp * { box-sizing: border-box; }
.imp-head { background: var(--navy); color: #fff; padding: 28px 20px 30px; }
.imp-head-in { max-width: 720px; margin: 0 auto; display: flex; align-items: center; gap: 14px; }
.imp-back {
  width: 42px; height: 42px; border-radius: 12px; border: 0; cursor: pointer;
  background: var(--navy-2); color: #fff; display: grid; place-items: center; flex: none;
}
.imp-title { font-size: 22px; font-weight: 700; margin: 0; }
.imp-sub { margin: 2px 0 0; font-size: 13px; color: #b9cbe0; }
.imp-body { max-width: 720px; margin: 0 auto; padding: 20px 16px 0; }

.imp-card {
  background: var(--card); border-radius: 18px; padding: 18px;
  box-shadow: 0 1px 2px rgba(18,56,92,.05), 0 6px 18px rgba(18,56,92,.07);
  margin-bottom: 16px;
}
.imp-h2 { font-size: 16px; font-weight: 700; margin: 0 0 4px; }
.imp-p { font-size: 13px; color: var(--muted); margin: 0; line-height: 1.5; }

.imp-drop {
  margin-top: 14px; display: flex; align-items: center; gap: 14px; width: 100%;
  border: 1.5px dashed #b8cde6; background: #f4f8fe; border-radius: 14px; padding: 16px;
  cursor: pointer; text-align: left; font: inherit; color: inherit;
  transition: border-color .15s, background .15s;
}
.imp-drop:hover:not(:disabled) { border-color: var(--blue); background: #eef5ff; }
.imp-drop:disabled { opacity: .6; cursor: not-allowed; }
.imp-drop[data-has="true"] { border-style: solid; border-color: #cfe0f5; background: #fff; }
.imp-tile {
  width: 48px; height: 48px; border-radius: 14px; background: var(--tile); color: var(--blue);
  display: grid; place-items: center; flex: none;
}
.imp-tile.orange { background: #fff0e1; color: var(--orange-d); }
.imp-fname { font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
.imp-fmeta { font-size: 12px; color: var(--muted); margin-top: 2px; }
.imp-types { display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap; }

.imp-chip {
  display: inline-block; font-size: 11.5px; font-weight: 600; padding: 4px 10px;
  border-radius: 999px; white-space: nowrap;
}
.imp-chip.neutral { background: var(--tile); color: var(--blue); }

.imp-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  border: 0; border-radius: 12px; padding: 13px 18px; font: inherit; font-size: 14px;
  font-weight: 700; color: #fff; cursor: pointer; transition: filter .15s, transform .05s;
}
.imp-btn:hover:not(:disabled) { filter: brightness(.94); }
.imp-btn:active:not(:disabled) { transform: translateY(1px); }
.imp-btn:disabled { opacity: .45; cursor: not-allowed; }
.imp-btn.orange { background: var(--orange); }
.imp-btn.green { background: #15803d; }
.imp-btn.navy { background: var(--navy); }
.imp-btn.block { width: 100%; margin-top: 14px; }
.imp-btn.line { background: #fff; color: var(--navy); border: 1px solid var(--line); }
.imp-btn.sm { padding: 9px 14px; font-size: 13px; border-radius: 10px; }
.imp-acts { display: grid; gap: 10px; margin-top: 14px; }
.imp-filefoot { padding: 0 18px 16px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.imp :focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }

.imp-err {
  display: flex; gap: 10px; background: #fde8e8; color: #991b1b; border-radius: 14px;
  padding: 14px; margin-bottom: 16px; font-size: 13.5px; overflow-wrap: anywhere;
}

.imp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 14px; }
.imp-stat { border-radius: 14px; padding: 12px; }
.imp-stat b { display: block; font-size: 24px; line-height: 1.1; }
.imp-stat span { font-size: 12px; font-weight: 600; }

.imp-mode { font-size: 12.5px; color: var(--muted); margin-top: 14px; }
.imp-mode strong { color: var(--ink); }

.imp-list-title { font-size: 13px; color: var(--muted); margin: 22px 4px 10px; }

.imp-file { padding: 0; overflow: hidden; }
.imp-file-top { padding: 16px 18px; display: flex; gap: 12px; align-items: flex-start; }
.imp-file-name { font-size: 14.5px; font-weight: 700; overflow-wrap: anywhere; }
.imp-file-count { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
.imp-meta {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px 14px;
  padding: 0 18px 16px;
}
.imp-meta small { display: block; font-size: 11.5px; color: var(--muted); }
.imp-meta div > div { font-size: 13.5px; font-weight: 600; overflow-wrap: anywhere; }

.imp-detail { border-top: 1px solid var(--line); padding: 16px 18px; background: #fbfcfe; }
.imp-detail-title { font-size: 13px; font-weight: 700; margin: 0 0 12px; }
.imp-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;
}
.imp-mini { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; }
.imp-mini small { display: block; font-size: 11.5px; color: var(--muted); }
.imp-mini b { font-size: 18px; }
.imp-mini i { font-style: normal; font-size: 11.5px; color: var(--muted); display: block; margin-top: 1px; }
.imp-warn { margin-top: 12px; font-size: 13px; color: #b91c1c; font-weight: 600; }

.imp-notes { border-top: 1px solid var(--line); padding: 14px 18px; background: #fff7ee; }
.imp-notes b { font-size: 13px; color: var(--orange-d); }
.imp-notes ul { margin: 6px 0 0; padding-left: 18px; font-size: 13px; line-height: 1.55; }

.imp-res { display: flex; gap: 12px; padding: 14px 0; border-top: 1px solid var(--line); }
.imp-res:first-of-type { border-top: 0; padding-top: 4px; }
.imp-res-body { font-size: 13px; color: var(--muted); line-height: 1.5; }

.imp-bar {
  position: fixed; left: 0; right: 0; bottom: 0; background: #fff;
  border-top: 1px solid var(--line); padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -6px 20px rgba(18,56,92,.08); z-index: 20;
}
.imp-bar-in { max-width: 720px; margin: 0 auto; display: flex; gap: 10px; }
.imp-bar-in .imp-btn { flex: 1; padding: 13px 10px; }
.imp-bar-note { max-width: 720px; margin: 8px auto 0; font-size: 11.5px; color: var(--muted); text-align: center; }

@media (max-width: 420px) {
  .imp-bar-in { flex-direction: column; }
}
`;

/* ───────────────────────── Ikon ───────────────────────── */

type IconProps = { size?: number };
const svgBase = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

const IconBack = ({ size = 20 }: IconProps) => (
  <svg {...svgBase(size)}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
);
const IconUpload = ({ size = 24 }: IconProps) => (
  <svg {...svgBase(size)}><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
);
const IconFile = ({ size = 24 }: IconProps) => (
  <svg {...svgBase(size)}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>
);
const IconCheck = ({ size = 24 }: IconProps) => (
  <svg {...svgBase(size)}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16 9.8" /></svg>
);
const IconAlert = ({ size = 24 }: IconProps) => (
  <svg {...svgBase(size)}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></svg>
);

/* ───────────────────────── Halaman ───────────────────────── */

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [results, setResults] = useState<HasilSimpan[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Pemeriksaan: antrean indeks file + penanda per butir
  const [queue, setQueue] = useState<number[] | null>(null);
  const [marks, setMarks] = useState<Marks>({});

  function setMark(key: string, value: Penanda | null) {
    setMarks((prev) => {
      const next = { ...prev };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  }

  const punyaButir = (f: PratinjauLengkap) => (f.butir?.length ?? 0) > 0;

  // Berapa butir file ini yang sudah diberi penanda
  function progres(fileIndex: number) {
    const total = preview?.files[fileIndex]?.butir?.length ?? 0;
    const sudah = Object.keys(marks).filter((k) =>
      k.startsWith(`${fileIndex}:`)
    ).length;
    return { total, sudah };
  }

  const jumlahDitandai = Object.values(marks).filter((v) => v === "flag").length;

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
        const res = data as PreviewResponse;
        setPreview(res);
        setMarks({});
        // Satu file: langsung masuk ke pemeriksaan soal.
        if (res.files.length === 1 && punyaButir(res.files[0])) {
          setQueue([0]);
        }
      } else {
        setResults((data as SaveResponse).hasil);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  const greenCount = preview?.ringkasan.GREEN ?? 0;
  const yellowCount = preview?.ringkasan.YELLOW ?? 0;
  const showBar = !!preview && !results;
  const isZip = !!file && file.name.toLowerCase().endsWith(".zip");

  // Antrean "perlu dicek": YELLOW dulu, lalu RED. GREEN dilewati.
  const antreanBermasalah = (preview?.files ?? [])
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => f.level !== "GREEN" && punyaButir(f))
    .sort((a, b) => (a.f.level === "YELLOW" ? 0 : 1) - (b.f.level === "YELLOW" ? 0 : 1))
    .map(({ i }) => i);
  const antreanSemua = (preview?.files ?? [])
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => punyaButir(f))
    .map(({ i }) => i);

  return (
    <main className="imp">
      <style>{css}</style>

      <header className="imp-head">
        <div className="imp-head-in">
          <button
            type="button"
            className="imp-back"
            aria-label="Kembali"
            onClick={() => history.back()}
          >
            <IconBack />
          </button>
          <div>
            <h1 className="imp-title">Impor Massal</h1>
            <p className="imp-sub">Tambah banyak soal sekaligus dari file</p>
          </div>
        </div>
      </header>

      <div className="imp-body">
        {/* 1. Pilih file */}
        <section className="imp-card">
          <h2 className="imp-h2">Pilih file soal</h2>
          <p className="imp-p">
            Unggah satu file. Sistem akan memeriksa isinya dulu sebelum disimpan.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept=".docx,.xlsx,.zip"
            disabled={busy}
            hidden
            onChange={(event) => {
              const selected = event.currentTarget.files?.[0] ?? null;
              setFile(selected);
              setPreview(null);
              setResults(null);
              setError("");
            }}
          />

          <button
            type="button"
            className="imp-drop"
            data-has={file ? "true" : "false"}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <span className={`imp-tile ${file ? "orange" : ""}`}>
              {file ? <IconFile /> : <IconUpload />}
            </span>
            <span>
              <span className="imp-fname" style={{ display: "block" }}>
                {file ? file.name : "Ketuk untuk memilih file"}
              </span>
              <span className="imp-fmeta" style={{ display: "block" }}>
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ketuk untuk ganti`
                  : "Belum ada file yang dipilih"}
              </span>
            </span>
          </button>

          <div className="imp-types">
            <span className="imp-chip neutral">DOCX</span>
            <span className="imp-chip neutral">XLSX</span>
            <span className="imp-chip neutral">ZIP</span>
          </div>

          <button
            type="button"
            className="imp-btn orange block"
            disabled={busy || !file}
            onClick={() => submitImport(true)}
          >
            {busy ? "Memproses..." : isZip ? "Periksa isi ZIP" : "Periksa file"}
          </button>
        </section>

        {error && (
          <div className="imp-err" role="alert">
            <IconAlert size={20} />
            <div>
              <strong>Terjadi masalah.</strong> {error}
            </div>
          </div>
        )}

        {/* 2. Hasil pratinjau */}
        {preview && (
          <>
            <section className="imp-card">
              <h2 className="imp-h2">Hasil pemeriksaan</h2>
              <p className="imp-mode">
                Mode pengguna: <strong>{preview.mode}</strong>
              </p>

              <div className="imp-stats">
                {(["GREEN", "YELLOW", "RED"] as const).map((level) => (
                  <div
                    key={level}
                    className="imp-stat"
                    style={{ background: LEVEL[level].bg, color: LEVEL[level].fg }}
                  >
                    <b>{preview.ringkasan[level]}</b>
                    <span>{LEVEL[level].label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="imp-card">
              <h2 className="imp-h2">Periksa soal satu per satu</h2>
              {antreanSemua.length === 0 ? (
                <p className="imp-p">
                  Detail soal belum dikirim oleh server, jadi pemeriksaan per soal
                  belum tersedia.
                </p>
              ) : (
                <>
                  <p className="imp-p">
                    {antreanBermasalah.length > 0
                      ? `${antreanBermasalah.length} file punya catatan. Mulai dari yang perlu dicek dulu, file yang siap bisa dilewati.`
                      : "Semua file siap. Kamu tetap bisa memeriksa isinya."}
                  </p>
                  <div className="imp-acts">
                    {antreanBermasalah.length > 0 && (
                      <button
                        type="button"
                        className="imp-btn orange"
                        onClick={() => setQueue(antreanBermasalah)}
                      >
                        Periksa yang perlu dicek ({antreanBermasalah.length} file)
                      </button>
                    )}
                    <button
                      type="button"
                      className={`imp-btn ${antreanBermasalah.length > 0 ? "line" : "orange"}`}
                      onClick={() => setQueue(antreanSemua)}
                    >
                      Periksa semua file ({antreanSemua.length})
                    </button>
                  </div>
                </>
              )}
            </section>

            <p className="imp-list-title">{preview.files.length} file diperiksa</p>

            {preview.files.map((item, index) => {
              const lv = LEVEL[item.level as Level];
              return (
                <article key={`${item.file}-${index}`} className="imp-card imp-file">
                  <div className="imp-file-top">
                    <span className="imp-tile" style={{ width: 42, height: 42 }}>
                      <IconFile size={20} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="imp-file-name">{item.file}</div>
                      <div className="imp-file-count">
                        {item.jumlah_soal} soal terdeteksi
                      </div>
                    </div>
                    <span
                      className="imp-chip"
                      style={{ background: lv.bg, color: lv.fg }}
                    >
                      {lv.label}
                    </span>
                  </div>

                  <div className="imp-meta">
                    <Info label="Mata pelajaran" value={item.mapel} />
                    <Info label="Kelas" value={item.kelas} />
                    <Info label="Jenis ujian" value={item.jenis} />
                    <Info label="Guru" value={item.guru} />
                  </div>

                  {item.ringkasan && <RingkasanBlock r={item.ringkasan} />}

                  {punyaButir(item) && (
                    <div className="imp-filefoot">
                      <button
                        type="button"
                        className="imp-btn navy sm"
                        onClick={() => setQueue([index])}
                      >
                        {progres(index).sudah > 0 ? "Lanjut periksa" : "Periksa soal"}
                      </button>
                      <span className="imp-chip neutral">
                        {progres(index).sudah}/{progres(index).total} diperiksa
                      </span>
                    </div>
                  )}

                  {item.catatan.length > 0 && (
                    <div className="imp-notes">
                      <b>Catatan</b>
                      <ul>
                        {item.catatan.map((note, i) => (
                          <li key={i}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              );
            })}
          </>
        )}

        {/* 3. Hasil simpan */}
        {results && (
          <section className="imp-card">
            <h2 className="imp-h2" style={{ marginBottom: 12 }}>
              Hasil penyimpanan
            </h2>

            {results.map((item, index) => {
              const ok = item.status === "TERSIMPAN";
              return (
                <div key={`${item.file}-${index}`} className="imp-res">
                  <span
                    className="imp-tile"
                    style={{
                      width: 40,
                      height: 40,
                      background: ok ? "#e3f6ea" : "#fde8e8",
                      color: ok ? "#15803d" : "#b91c1c",
                    }}
                  >
                    {ok ? <IconCheck size={20} /> : <IconAlert size={20} />}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="imp-file-name">{item.file}</div>
                    <span
                      className="imp-chip"
                      style={{
                        marginTop: 6,
                        background: ok ? "#e3f6ea" : "#fde8e8",
                        color: ok ? "#15803d" : "#b91c1c",
                      }}
                    >
                      {item.status}
                    </span>
                    <div className="imp-res-body" style={{ marginTop: 6 }}>
                      {item.exam_id && <div>ID ujian: {item.exam_id}</div>}
                      {item.jumlah_soal !== undefined && (
                        <div>Soal tersimpan: {item.jumlah_soal}</div>
                      )}
                      {item.alasan && <div>Alasan: {item.alasan}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>

      {preview && queue && (
        <PeriksaSoal
          files={preview.files}
          queue={queue}
          marks={marks}
          onMark={setMark}
          onClose={() => setQueue(null)}
        />
      )}

      {/* Bar aksi simpan (seperti bottom nav di aplikasi) */}
      {showBar && (
        <div className="imp-bar">
          <div className="imp-bar-in">
            <button
              type="button"
              className="imp-btn green"
              disabled={busy || greenCount === 0}
              onClick={() => submitImport(false, "GREEN")}
            >
              Simpan yang siap ({greenCount})
            </button>
            <button
              type="button"
              className="imp-btn navy"
              disabled={busy || greenCount + yellowCount === 0}
              onClick={() => submitImport(false, "GREEN_YELLOW")}
            >
              Simpan + perlu dicek ({greenCount + yellowCount})
            </button>
          </div>
          <p className="imp-bar-note">
            {jumlahDitandai > 0
              ? `${jumlahDitandai} soal kamu tandai. Tanda ini belum memengaruhi penyimpanan.`
              : "File diperiksa ulang otomatis sebelum disimpan."}
          </p>
        </div>
      )}
    </main>
  );
}

/* ───────────────────────── Komponen kecil ───────────────────────── */

function RingkasanBlock({ r }: { r: RingkasanSoal }) {
  return (
    <div className="imp-detail">
      <p className="imp-detail-title">Isi soal terdeteksi</p>

      <div className="imp-grid">
        <Mini label="Pilihan ganda" value={String(r.jumlah_pg)} />
        <Mini label="Pilihan ganda kompleks" value={String(r.jumlah_pgk)} />
        <Mini label="Esai" value={String(r.jumlah_esai)} />
        <Mini
          label="Gambar"
          value={String(r.jumlah_gambar)}
          sub={`soal ${r.gambar_soal} · bacaan ${r.gambar_bacaan}`}
        />
        <Mini
          label="Rumus"
          value={String(r.jumlah_rumus)}
          sub={`soal ${r.rumus_soal} · bacaan ${r.rumus_bacaan}`}
        />
        <Mini label="Bacaan" value={String(r.jumlah_bacaan)} />
      </div>

      {r.jumlah_lain > 0 && (
        <p className="imp-warn">
          {r.jumlah_lain} soal berjenis tidak dikenali (lihat catatan).
        </p>
      )}
    </div>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="imp-mini">
      <small>{label}</small>
      <b>{value}</b>
      {sub && <i>{sub}</i>}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <small>{label}</small>
      <div>{value || "-"}</div>
    </div>
  );
}