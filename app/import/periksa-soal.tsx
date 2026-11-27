"use client";

import { useEffect, useRef, useState } from "react";

/* ───────────────────────── Tipe data ─────────────────────────
 * API /api/import (dry run) perlu mengirim `butir` di tiap file:
 * daftar berurutan berisi bacaan dan soal sesuai urutan di dokumen.
 */

export type OpsiSoal = { label: string; teks: string; benar?: boolean };

export type ItemPeriksa = {
  id: string; // unik di dalam satu file, mis. "b1", "s5"
  tipe: "bacaan" | "soal";
  teks: string;
  gambar?: string[]; // URL atau data URI
  rumus?: string[];
  peringatan?: string[]; // alasan butir ini perlu dicek

  // khusus soal
  no?: number;
  jenis?: "PG" | "PGK" | "ESAI" | "LAIN"; // PGK = pilihan ganda kompleks (lebih dari satu kunci)
  opsi?: OpsiSoal[];
  kunci?: string;
  bacaan_no?: number; // soal ini terkait bacaan yang mulai di no. berapa

  // khusus bacaan
  no_mulai?: number;
  jumlah_soal?: number;
};

export type Penanda = "ok" | "flag";
export type Marks = Record<string, Penanda>;
export const kunciItem = (fileIndex: number, id: string) => `${fileIndex}:${id}`;

export const kunciIdentitas = (fileIndex: number) => `${fileIndex}#identitas`;

export type FileUntukPeriksa = {
  file: string;
  level: string;
  mapel?: string | null;
  kelas?: string | null;
  jenis?: string | null;
  guru?: string | null;
  butir?: ItemPeriksa[];
};

type Props = {
  files: FileUntukPeriksa[];
  queue: number[]; // urutan indeks file yang diperiksa
  marks: Marks;
  onMark: (key: string, value: Penanda | null) => void;
  onClose: () => void;
};

/* ───────────────────────── Gaya ───────────────────────── */

const css = `
.rv { position: fixed; inset: 0; z-index: 50; background: var(--bg); display: flex; flex-direction: column; }
.rv-head { background: var(--navy); color: #fff; padding: 14px 16px 0; }
.rv-head-in { max-width: 720px; margin: 0 auto; display: flex; align-items: center; gap: 12px; }
.rv-x { width: 40px; height: 40px; border-radius: 12px; border: 0; background: var(--navy-2); color: #fff; cursor: pointer; display: grid; place-items: center; flex: none; }
.rv-title { font-size: 15px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rv-sub { font-size: 12px; color: #b9cbe0; margin-top: 1px; }
.rv-prog { max-width: 720px; margin: 12px auto 0; height: 4px; border-radius: 4px; background: var(--navy-2); overflow: hidden; }
.rv-prog > i { display: block; height: 100%; background: var(--orange); transition: width .2s; }

.rv-navwrap { background: var(--navy); padding: 12px 16px 14px; }
.rv-nav { max-width: 720px; margin: 0 auto; display: flex; gap: 6px; overflow-x: auto; padding: 2px; scrollbar-width: none; }
.rv-nav::-webkit-scrollbar { display: none; }
.rv-dot {
  flex: none; min-width: 34px; height: 34px; padding: 0 8px; border-radius: 10px; border: 0; cursor: pointer;
  font: inherit; font-size: 12.5px; font-weight: 700; background: var(--navy-2); color: #cfe0f3;
}
.rv-dot[data-b="true"] { border-radius: 10px 10px 10px 4px; }
.rv-dot[data-m="ok"] { background: #1f8a4c; color: #fff; }
.rv-dot[data-m="flag"] { background: var(--orange); color: #fff; }
.rv-dot[data-cur="true"] { outline: 2px solid #fff; outline-offset: 1px; }

.rv-filter { max-width: 720px; margin: 10px auto 0; display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #cfe0f3; }
.rv-filter button { border: 0; border-radius: 999px; padding: 5px 12px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; background: var(--navy-2); color: #fff; }
.rv-filter button[aria-pressed="true"] { background: #fff; color: var(--navy); }

.rv-scroll { flex: 1; overflow-y: auto; padding: 16px; }
.rv-in { max-width: 720px; margin: 0 auto; }
.rv-card { background: #fff; border-radius: 18px; padding: 18px; box-shadow: 0 1px 2px rgba(18,56,92,.05), 0 6px 18px rgba(18,56,92,.07); }
.rv-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.rv-no { font-size: 17px; font-weight: 800; }
.rv-chip { font-size: 11.5px; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: var(--tile); color: var(--blue); }
.rv-chip.warn { background: #fde8e8; color: #b91c1c; }
.rv-chip.ok { background: #e3f6ea; color: #15803d; }
.rv-chip.flag { background: #fff0e1; color: #b45309; }
.rv-justify { text-align: left; }
@media (min-width: 480px) { .rv-justify { text-align: justify; text-justify: inter-word; } } /* rata kiri-kanan hanya di layar lebar */
.rv-teks { font-size: 15px; line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; }
.rv-img { display: block; max-width: 100%; max-height: 320px; margin: 12px 0 0; border-radius: 10px; border: 1px solid var(--line); }
.rv-rumus { margin-top: 12px; display: grid; gap: 6px; }
.rv-rumus code { display: block; background: #f1f5fb; border-radius: 8px; padding: 8px 10px; font-size: 12.5px; overflow-x: auto; }
.rv-opsi { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 8px; }
.rv-opsi li { display: flex; gap: 10px; align-items: flex-start; border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; font-size: 14px; line-height: 1.5; }
.rv-opsi li[data-ok="true"] { border-color: #86d3a3; background: #effaf3; }
.rv-opsi b { flex: none; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: var(--tile); color: var(--blue); font-size: 12.5px; }
.rv-opsi li[data-ok="true"] b { background: #15803d; color: #fff; }
.rv-opsi span.k { margin-left: auto; flex: none; font-size: 11px; font-weight: 700; color: #15803d; }
.rv-opsi li[data-k="pgk"] b { border-radius: 8px; } /* kotak = bisa pilih lebih dari satu */
.rv-opsi li[data-k="pgk"][data-ok="true"] { border-color: #a5b4fc; background: #eef2ff; }
.rv-opsi li[data-k="pgk"][data-ok="true"] b { background: #4f46e5; color: #fff; }
.rv-opsi li[data-k="pgk"] span.k { color: #4338ca; }
.rv-chip.pgk { background: #eef2ff; color: #4338ca; }
.rv-kunci.pgk { background: #eef2ff; color: #3730a3; }
.rv-kunci.pgk small { color: #6366f1; }
.rv-kunci { margin-top: 14px; background: #f4f8fe; border-radius: 12px; padding: 12px; font-size: 13.5px; line-height: 1.55; }
.rv-kunci small { display: block; color: var(--muted); margin-bottom: 2px; }
.rv-warn { margin-top: 14px; background: #fff7ee; border-radius: 12px; padding: 12px 14px; font-size: 13px; line-height: 1.55; color: #92400e; }
.rv-warn b { color: var(--orange-d); }
.rv-warn ul { margin: 4px 0 0; padding-left: 18px; }

.rv-bar { background: #fff; border-top: 1px solid var(--line); padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px)); box-shadow: 0 -6px 20px rgba(18,56,92,.08); }
.rv-bar-in { max-width: 720px; margin: 0 auto; display: flex; gap: 10px; }
.rv-b { border: 0; border-radius: 12px; padding: 13px 14px; font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.rv-b:disabled { opacity: .4; cursor: not-allowed; }
.rv-b.prev { background: var(--tile); color: var(--blue); width: 48px; padding: 0; flex: none; }
.rv-b.flag { background: #fff0e1; color: var(--orange-d); }
.rv-b.okb { background: #15803d; color: #fff; flex: 1; }
.rv-b.navy { background: var(--navy); color: #fff; }
.rv-b.orange { background: var(--orange); color: #fff; }
.rv-b.line { background: #fff; color: var(--navy); border: 1px solid var(--line); }

.rv-idl { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 8px; }
.rv-idl li { display: flex; justify-content: space-between; align-items: center; gap: 12px; border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; }
.rv-idl li[data-empty="true"] { border-color: #f3b4b4; background: #fff5f5; }
.rv-idl small { display: block; color: var(--muted); font-size: 11.5px; margin-bottom: 2px; }
.rv-idl strong { font-size: 15px; overflow-wrap: anywhere; }
.rv-idl .none { color: #b91c1c; font-weight: 700; font-size: 14px; }
.rv-done { text-align: center; padding: 28px 18px; }
.rv-done h2 { margin: 12px 0 4px; font-size: 18px; }
.rv-done p { margin: 0; font-size: 13.5px; color: var(--muted); line-height: 1.55; }
.rv-sum { display: flex; justify-content: center; gap: 10px; margin: 16px 0 4px; flex-wrap: wrap; }
.rv-sum div { border-radius: 12px; padding: 10px 16px; min-width: 88px; }
.rv-sum b { display: block; font-size: 22px; }
.rv-sum span { font-size: 12px; font-weight: 600; }
.rv-acts { display: grid; gap: 10px; margin-top: 18px; }
@media (max-width: 420px) { .rv-b { font-size: 13px; padding: 12px 10px; } }
`;

/* ───────────────────────── Ikon ───────────────────────── */

const ico = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};
const IconX = () => (<svg {...ico}><path d="M6 6l12 12M18 6L6 18" /></svg>);
const IconLeft = () => (<svg {...ico}><path d="M15 6l-6 6 6 6" /></svg>);
const IconFlag = () => (<svg {...ico} width={17} height={17}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>);
const IconCheck = () => (<svg {...ico} width={17} height={17}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>);
const IconBig = ({ ok }: { ok: boolean }) => (
  <svg {...ico} width={44} height={44} style={{ color: ok ? "#15803d" : "#b45309" }}>
    <circle cx="12" cy="12" r="9" />
    {ok ? <path d="M8 12.5l2.7 2.7L16 9.8" /> : <path d="M12 8v5M12 16.5v.01" />}
  </svg>
);

/* ───────────────────────── Komponen ───────────────────────── */

export default function PeriksaSoal({ files, queue, marks, onMark, onClose }: Props) {
  const [pos, setPos] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [phase, setPhase] = useState<"identitas" | "review" | "filedone">("identitas");
  const navRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fi = queue[pos];
  const file = files[fi];
  const all = file.butir ?? [];
  const issues = all.filter((i) => (i.peringatan?.length ?? 0) > 0);
  const items = onlyIssues ? issues : all;
  const idx = Math.min(cursor, Math.max(items.length - 1, 0));
  const cur = items[idx];

  const markOf = (id: string) => marks[kunciItem(fi, id)];
  const done = items.filter((i) => markOf(i.id)).length;
  const okCount = items.filter((i) => markOf(i.id) === "ok").length;
  const flagCount = items.filter((i) => markOf(i.id) === "flag").length;
  const firstUnmarked = items.findIndex((i) => !markOf(i.id));
  const lastFile = pos >= queue.length - 1;

  function advance() {
    if (idx < items.length - 1) setCursor(idx + 1);
    else setPhase("filedone");
  }

  function setMark(v: Penanda) {
    if (!cur) return;
    onMark(kunciItem(fi, cur.id), v);
    advance();
  }

  const barisIdentitas = [
    { label: "Mata pelajaran", value: file.mapel, wajib: true },
    { label: "Kelas", value: file.kelas, wajib: true },
    { label: "Jenis ujian", value: file.jenis, wajib: true },
    { label: "Guru", value: file.guru, wajib: false },
  ];
  const kosongWajib = barisIdentitas.filter((r) => r.wajib && !r.value?.trim());
  const idMark = marks[kunciIdentitas(fi)];

  function konfirmasiIdentitas(v: Penanda) {
    onMark(kunciIdentitas(fi), v);
    setCursor(0);
    setPhase("review");
  }

  function nextFile() {
    if (lastFile) {
      onClose();
      return;
    }
    setPos(pos + 1);
    setCursor(0);
    setPhase("identitas");
  }

  // Panah kiri/kanan untuk pindah butir
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "review") return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (idx < items.length - 1) setCursor(idx + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (idx > 0) setCursor(idx - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, items.length, phase]);

  // Jaga navigator & konten selalu menampilkan butir aktif
  useEffect(() => {
    navRef.current
      ?.querySelector('[data-cur="true"]')
      ?.scrollIntoView({ inline: "center", block: "nearest" });
    scrollRef.current?.scrollTo({ top: 0 });
  }, [idx, pos, phase, onlyIssues]);

  const pct = items.length ? Math.round((done / items.length) * 100) : 100;

  return (
    <div className="rv" role="dialog" aria-modal="true" aria-label="Pemeriksaan soal">
      <style>{css}</style>

      <header className="rv-head">
        <div className="rv-head-in">
          <button type="button" className="rv-x" aria-label="Tutup pemeriksaan" onClick={onClose}>
            <IconX />
          </button>
          <div style={{ minWidth: 0 }}>
            <div className="rv-title">{file.file}</div>
            <div className="rv-sub" aria-live="polite">
              {queue.length > 1 ? `File ${pos + 1} dari ${queue.length} · ` : ""}
              {phase === "identitas" ? "Cek identitas dulu" : `${done}/${items.length} diperiksa`}
            </div>
          </div>
        </div>
        <div className="rv-prog" aria-hidden>
          <i style={{ width: `${pct}%` }} />
        </div>
      </header>

      <div className="rv-navwrap">
        <div className="rv-nav" ref={navRef} role="tablist" aria-label="Daftar butir">
          <button
            type="button"
            className="rv-dot"
            data-cur={phase === "identitas"}
            data-m={idMark ?? ""}
            aria-label="Identitas ujian"
            onClick={() => setPhase("identitas")}
          >
            ID
          </button>
          {items.map((it, n) => (
            <button
              key={it.id}
              type="button"
              className="rv-dot"
              data-cur={n === idx && phase === "review"}
              data-m={markOf(it.id) ?? ""}
              data-b={it.tipe === "bacaan"}
              aria-label={it.tipe === "bacaan" ? "Bacaan" : `Soal ${it.no ?? n + 1}`}
              onClick={() => {
                setCursor(n);
                setPhase("review");
              }}
            >
              {it.tipe === "bacaan" ? "B" : it.no ?? n + 1}
            </button>
          ))}
        </div>

        {issues.length > 0 && (
          <div className="rv-filter">
            <button
              type="button"
              aria-pressed={onlyIssues}
              onClick={() => {
                setOnlyIssues(!onlyIssues);
                setCursor(0);
                setPhase("review");
              }}
            >
              Hanya yang perlu dicek ({issues.length})
            </button>
            <span>{onlyIssues ? "Butir tanpa catatan dilewati" : ""}</span>
          </div>
        )}
      </div>

      <div className="rv-scroll" ref={scrollRef}>
        <div className="rv-in">
          {phase === "identitas" ? (
            <Identitas rows={barisIdentitas} kosong={kosongWajib} mark={idMark} />
          ) : items.length === 0 ? (
            <div className="rv-card rv-done">
              <IconBig ok />
              <h2>Tidak ada yang perlu dicek</h2>
              <p>File ini tidak punya butir dengan catatan.</p>
              <div className="rv-acts">
                <button type="button" className="rv-b navy" onClick={nextFile}>
                  {lastFile ? "Selesai" : "Lanjut ke file berikutnya"}
                </button>
              </div>
            </div>
          ) : phase === "filedone" ? (
            <div className="rv-card rv-done">
              <IconBig ok={flagCount === 0 && firstUnmarked === -1} />
              <h2>{lastFile ? "Pemeriksaan selesai" : "File ini selesai diperiksa"}</h2>
              <div className="rv-sum">
                <div style={{ background: "#e3f6ea", color: "#15803d" }}>
                  <b>{okCount}</b>
                  <span>Benar</span>
                </div>
                <div style={{ background: "#fff0e1", color: "#b45309" }}>
                  <b>{flagCount}</b>
                  <span>Ditandai</span>
                </div>
                <div style={{ background: "#eef2f7", color: "#475569" }}>
                  <b>{items.length - done}</b>
                  <span>Belum</span>
                </div>
              </div>
              {firstUnmarked !== -1 && (
                <p>Masih ada {items.length - done} butir yang belum diperiksa.</p>
              )}
              <div className="rv-acts">
                {firstUnmarked !== -1 && (
                  <button
                    type="button"
                    className="rv-b orange"
                    onClick={() => {
                      setCursor(firstUnmarked);
                      setPhase("review");
                    }}
                  >
                    Periksa yang belum
                  </button>
                )}
                <button type="button" className="rv-b navy" onClick={nextFile}>
                  {lastFile ? "Selesai" : "Lanjut ke file berikutnya"}
                </button>
                <button
                  type="button"
                  className="rv-b line"
                  onClick={() => {
                    setCursor(items.length - 1);
                    setPhase("review");
                  }}
                >
                  Kembali ke butir terakhir
                </button>
              </div>
            </div>
          ) : (
            cur && <Butir item={cur} mark={markOf(cur.id)} />
          )}
        </div>
      </div>

      {phase === "identitas" && (
        <div className="rv-bar">
          <div className="rv-bar-in">
            {kosongWajib.length > 0 ? (
              <button
                type="button"
                className="rv-b flag"
                style={{ flex: 1 }}
                onClick={() => konfirmasiIdentitas("flag")}
              >
                <IconFlag /> Tandai bermasalah, lanjut ke soal
              </button>
            ) : (
              <button type="button" className="rv-b okb" onClick={() => konfirmasiIdentitas("ok")}>
                <IconCheck /> Identitas benar, lanjut ke soal
              </button>
            )}
          </div>
        </div>
      )}

      {items.length > 0 && phase === "review" && (
        <div className="rv-bar">
          <div className="rv-bar-in">
            <button
              type="button"
              className="rv-b prev"
              aria-label="Sebelumnya"
              disabled={idx === 0}
              onClick={() => setCursor(idx - 1)}
            >
              <IconLeft />
            </button>
            {cur?.tipe === "soal" && (
              <button type="button" className="rv-b flag" onClick={() => setMark("flag")}>
                <IconFlag /> Tandai
              </button>
            )}
            <button type="button" className="rv-b okb" onClick={() => setMark("ok")}>
              <IconCheck /> {cur?.tipe === "bacaan" ? "Bacaan benar" : "Sudah benar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Isi satu butir ───────────────────────── */

function Butir({ item, mark }: { item: ItemPeriksa; mark?: Penanda }) {
  const isBacaan = item.tipe === "bacaan";
  const akhir =
    isBacaan && item.no_mulai !== undefined && item.jumlah_soal
      ? item.no_mulai + item.jumlah_soal - 1
      : undefined;

  const isPgk = !isBacaan && item.jenis === "PGK";
  // Kunci PGK diambil dari opsi yang ditandai benar; cadangannya dari teks kunci "A,C".
  const kunciPgk = !isPgk
    ? []
    : item.opsi?.some((o) => o.benar)
      ? item.opsi.filter((o) => o.benar).map((o) => o.label)
      : (item.kunci ?? "").split(",").map((k) => k.trim()).filter(Boolean);

  return (
    <article className="rv-card">
      <div className="rv-top">
        <span className="rv-no">{isBacaan ? "Bacaan" : `Soal ${item.no ?? ""}`}</span>

        {isBacaan && akhir !== undefined && (
          <span className="rv-chip">untuk soal {item.no_mulai}–{akhir}</span>
        )}
        {!isBacaan && item.jenis === "PG" && <span className="rv-chip">Pilihan ganda</span>}
        {isPgk && (
          <span className={kunciPgk.length >= 2 ? "rv-chip pgk" : "rv-chip warn"}>
            Pilihan ganda kompleks · {kunciPgk.length} kunci
          </span>
        )}
        {!isBacaan && item.jenis === "ESAI" && <span className="rv-chip">Esai</span>}
        {!isBacaan && item.jenis === "LAIN" && <span className="rv-chip warn">Jenis tidak dikenali</span>}
        {!isBacaan && item.bacaan_no !== undefined && (
          <span className="rv-chip">terkait bacaan no. {item.bacaan_no}</span>
        )}
        {mark === "ok" && <span className="rv-chip ok">Sudah benar</span>}
        {mark === "flag" && <span className="rv-chip flag">Ditandai</span>}
      </div>

      <p className={isBacaan ? "rv-teks rv-justify" : "rv-teks"}>{item.teks || "(teks kosong)"}</p>

      {item.gambar?.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} className="rv-img" src={src} alt={`Gambar ${i + 1}`} />
      ))}

      {item.rumus && item.rumus.length > 0 && (
        <div className="rv-rumus">
          {item.rumus.map((r, i) => (
            <code key={i}>{r}</code>
          ))}
        </div>
      )}

      {item.opsi && item.opsi.length > 0 && (
        <ul className="rv-opsi">
          {item.opsi.map((o) => {
            const benar = !!o.benar || (isPgk && kunciPgk.includes(o.label));
            return (
              <li key={o.label} data-ok={benar} data-k={isPgk ? "pgk" : undefined}>
                <b>{o.label}</b>
                <span style={{ overflowWrap: "anywhere" }}>{o.teks}</span>
                {benar && <span className="k">Kunci</span>}
              </li>
            );
          })}
        </ul>
      )}

      {isPgk && kunciPgk.length > 0 && (
        <div className="rv-kunci pgk">
          <small>Kunci jawaban (semua harus dipilih)</small>
          {kunciPgk.join(", ")}
        </div>
      )}

      {!isBacaan && item.jenis === "ESAI" && item.kunci && (
        <div className="rv-kunci">
          <small>Kunci / pedoman</small>
          {item.kunci}
        </div>
      )}

      {item.peringatan && item.peringatan.length > 0 && (
        <div className="rv-warn">
          <b>Perlu dicek</b>
          <ul>
            {item.peringatan.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

/* ───────────────────────── Identitas ujian ───────────────────────── */

function Identitas({
  rows,
  kosong,
  mark,
}: {
  rows: { label: string; value?: string | null; wajib: boolean }[];
  kosong: { label: string }[];
  mark?: Penanda;
}) {
  const jenisKosong = kosong.some((k) => k.label === "Jenis ujian");

  return (
    <article className="rv-card">
      <div className="rv-top">
        <span className="rv-no">Identitas ujian</span>
        {mark === "ok" && <span className="rv-chip ok">Sudah benar</span>}
        {mark === "flag" && <span className="rv-chip flag">Ditandai</span>}
      </div>
      <p style={{ margin: 0, fontSize: 13.5, color: "var(--muted)", lineHeight: 1.55 }}>
        Pastikan data ini sesuai sebelum memeriksa soal.
      </p>

      <ul className="rv-idl">
        {rows.map((r) => {
          const ada = !!r.value?.trim();
          return (
            <li key={r.label} data-empty={!ada && r.wajib}>
              <div style={{ minWidth: 0 }}>
                <small>{r.label}</small>
                {ada ? (
                  <strong>{r.value}</strong>
                ) : (
                  <span className="none">{r.wajib ? "Belum terdeteksi" : "-"}</span>
                )}
              </div>
              {ada && <span className="rv-chip ok">Terisi</span>}
              {!ada && r.wajib && <span className="rv-chip warn">Wajib</span>}
            </li>
          );
        })}
      </ul>

      {kosong.length > 0 && (
        <div className="rv-warn">
          <b>Data wajib kosong</b>
          <ul>
            <li>{kosong.map((k) => k.label).join(", ")} belum terdeteksi dari file.</li>
            {jenisKosong && (
              <li>Tanpa jenis ujian yang valid, file ini akan ditolak saat disimpan.</li>
            )}
            <li>Perbaiki di file sumber lalu unggah ulang.</li>
          </ul>
        </div>
      )}
    </article>
  );
}