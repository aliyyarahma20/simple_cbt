import type { ReactNode } from "react";
import { Check, ShieldCheck } from "lucide-react";

const STEPS = ["Token", "Biodata", "Konfirmasi"];

type SiswaStepLayoutProps = {
  // 1 = Token, 2 = Biodata, 3 = Konfirmasi
  step: 1 | 2 | 3;
  title: string;
  description: string;
  children: ReactNode;
  maxWidth?: string;
};

export function SiswaLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#E3EDF9] border-t-[#15395D] rounded-full animate-spin" />
    </div>
  );
}

export default function SiswaStepLayout({
  step,
  title,
  description,
  children,
  maxWidth = "max-w-[520px]",
}: SiswaStepLayoutProps) {
  return (
    <main className="min-h-screen px-4 py-8 sm:py-12 flex flex-col items-center">

      {/* LOGO */}
      <div className="flex items-center gap-2 text-[#15395D]">
        <ShieldCheck size={28} strokeWidth={1.8} />
        <span className="text-xl font-bold tracking-tight">
          SIMPLE-CBT
        </span>
      </div>

      {/* STEPPER */}
      <ol className="mt-6 flex items-center gap-2 sm:gap-3">
        {STEPS.map((label, index) => {
          const number = index + 1;
          const done = number < step;
          const active = number === step;

          return (
            <li key={label} className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    done
                      ? "bg-[#21965F] text-white"
                      : active
                        ? "bg-[#15395D] text-white"
                        : "bg-[#E3EDF9] text-slate-400"
                  }`}
                >
                  {done ? <Check size={15} /> : number}
                </span>

                <span
                  className={`text-xs font-medium ${
                    active ? "text-[#15395D]" : "text-slate-400"
                  } ${active ? "" : "hidden sm:inline"}`}
                >
                  {label}
                </span>
              </div>

              {number < STEPS.length && (
                <span className="w-5 sm:w-8 h-px bg-[#D5E0EC]" />
              )}
            </li>
          );
        })}
      </ol>

      {/* CARD */}
      <section
        className={`w-full ${maxWidth} mt-6 bg-white border border-[#E5EDF5] rounded-[24px] p-6 sm:p-8 shadow-[0_15px_50px_rgba(21,57,93,0.06)]`}
      >
        <h1 className="text-xl sm:text-2xl font-bold text-[#15395D]">
          {title}
        </h1>

        <p className="text-sm text-slate-400 mt-2">{description}</p>

        <div className="mt-6">{children}</div>
      </section>

    </main>
  );
}