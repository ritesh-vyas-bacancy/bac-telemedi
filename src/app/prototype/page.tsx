"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { JOURNEYS, PERSONA_META, PERSONAS, type Persona } from "./journeys";
import { ScreenPreview } from "./screens";

export default function PrototypePage() {
  const [persona, setPersona] = useState<Persona>("patient");
  const [index, setIndex] = useState(0);

  const steps = JOURNEYS[persona];
  const step = steps[index];
  const meta = PERSONA_META[persona];
  const progress = Math.round(((index + 1) / steps.length) * 100);

  const nextLabel = useMemo(() => {
    if (index === steps.length - 1) return "Restart";
    return `Next: ${steps[index + 1].title}`;
  }, [index, steps]);

  const switchPersona = (next: Persona) => {
    setPersona(next);
    setIndex(0);
  };

  const prev = () => setIndex((p) => Math.max(0, p - 1));
  const next = () => setIndex((p) => (p === steps.length - 1 ? 0 : p + 1));

  return (
    <main className="prototype-bg min-h-screen px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <header className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_18px_70px_-45px_rgba(8,60,80,0.6)] backdrop-blur sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-cyan-700">
                TELEMEDICINE FULL SCREEN PROTOTYPE
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                {meta.label} - {step.title}
              </h1>
              <p className="text-sm text-slate-600">{step.screen}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                Stage {index + 1} / {steps.length}
              </span>
              <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                Progress {progress}%
              </span>
              <Link
                href="/"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Back Home
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-white/70 bg-white/88 p-3 shadow-[0_18px_70px_-45px_rgba(8,60,80,0.6)] backdrop-blur sm:p-4">
          <div className="flex flex-wrap gap-2">
            {PERSONAS.map((item) => {
              const active = item === persona;
              const itemMeta = PERSONA_META[item];
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => switchPersona(item)}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {itemMeta.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {steps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setIndex(i)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  i === index
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                title={s.title}
              >
                {s.stage}: {s.title}
              </button>
            ))}
          </div>
        </section>

        <section className="h-[76vh] min-h-[620px]">
          <ScreenPreview persona={persona} stepId={step.id} />
        </section>

        <footer className="rounded-2xl border border-white/70 bg-white/88 p-3 shadow-[0_18px_70px_-45px_rgba(8,60,80,0.6)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-600">
              This is full-screen presentation mode. Switch persona and stage to view every screen.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={prev}
                disabled={index === 0}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={next}
                className={`rounded-lg bg-gradient-to-r ${meta.tone} px-3 py-2 text-xs font-semibold text-white`}
              >
                {nextLabel}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
