"use client";

import { useEffect, useState } from "react";

export type HeroSlide = {
  id: string;
  badge: string;
  title: string;
  description: string;
  metricLabel: string;
  metricValue: string;
  bullets: string[];
  gradient: string;
};

type HeroSliderProps = {
  slides: HeroSlide[];
};

export function HeroSlider({ slides }: HeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5200);

    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) {
    return null;
  }

  const current = slides[activeIndex];

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-white/65 bg-white/15 p-5 shadow-[0_38px_100px_-58px_rgba(2,8,20,0.98)] backdrop-blur-xl sm:p-7">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${current.gradient} opacity-95 transition-all duration-700`}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.36),transparent_45%),radial-gradient(circle_at_84%_20%,rgba(255,255,255,0.22),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.09)_1px,transparent_1px)] bg-[size:34px_34px]" />

      <div key={current.id} className="relative z-10 animate-rise space-y-5 text-white">
        <div className="inline-flex rounded-full border border-white/30 bg-white/20 px-3 py-1 text-[11px] font-semibold tracking-[0.14em]">
          {current.badge}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold leading-tight sm:text-3xl">{current.title}</h2>
          <p className="max-w-xl text-sm text-white/90 sm:text-base">{current.description}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
          <div className="inline-flex items-end gap-2 rounded-2xl border border-white/28 bg-white/18 px-4 py-3">
            <p className="text-3xl font-bold leading-none">{current.metricValue}</p>
            <p className="pb-1 text-xs font-semibold uppercase tracking-[0.1em] text-white/90">{current.metricLabel}</p>
          </div>
          <div className="rounded-2xl border border-white/28 bg-white/18 px-4 py-3 text-xs text-white/95">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/85">Live Scope</p>
            <p className="mt-1">Patient, Provider, Admin workflows with connected operational controls.</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {current.bullets.map((bullet) => (
            <p
              key={bullet}
              className="rounded-xl border border-white/30 bg-white/18 px-3 py-2 text-xs text-white/95 shadow-[0_12px_24px_-18px_rgba(2,8,20,0.8)]"
            >
              {bullet}
            </p>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveIndex((activeIndex - 1 + slides.length) % slides.length)}
            className="rounded-lg border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/25"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setActiveIndex((activeIndex + 1) % slides.length)}
            className="rounded-lg border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/25"
          >
            Next
          </button>
          <div className="ml-1 flex items-center gap-1.5">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                title={`Open ${slide.title}`}
                onClick={() => setActiveIndex(index)}
                className={
                  index === activeIndex
                    ? "h-2.5 w-8 rounded-full bg-white"
                    : "h-2.5 w-2.5 rounded-full bg-white/55 transition hover:bg-white/80"
                }
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
