"use client";

import { useEffect, useState } from "react";

export type HeroSlide = {
  id: string;
  badge: string;
  title: string;
  description: string;
  metricLabel: string;
  metricValue: string;
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
    <section className="relative overflow-hidden rounded-3xl border border-white/65 bg-white/15 p-5 shadow-[0_34px_95px_-55px_rgba(2,8,20,0.98)] backdrop-blur-xl sm:p-7">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${current.gradient} opacity-95 transition-all duration-700`}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.36),transparent_45%),radial-gradient(circle_at_84%_20%,rgba(255,255,255,0.22),transparent_40%)]" />

      <div className="relative z-10 space-y-5 text-white">
        <div className="inline-flex rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-semibold tracking-[0.14em]">
          {current.badge}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold leading-tight sm:text-3xl">{current.title}</h2>
          <p className="max-w-xl text-sm text-white/90 sm:text-base">{current.description}</p>
        </div>

        <div className="inline-flex items-end gap-2 rounded-2xl border border-white/28 bg-white/18 px-4 py-3">
          <p className="text-3xl font-bold leading-none">{current.metricValue}</p>
          <p className="pb-1 text-xs font-semibold uppercase tracking-[0.1em] text-white/90">{current.metricLabel}</p>
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
                    ? "h-2.5 w-6 rounded-full bg-white"
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

