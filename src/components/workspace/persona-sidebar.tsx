"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ModuleDefinition, Persona } from "@/lib/workspace/config";

type PersonaSidebarProps = {
  persona: Persona;
  personaLabel: string;
  modules: ModuleDefinition[];
};

const THEME = {
  patient: {
    panel: "from-cyan-600 to-sky-600",
    soft: "border-cyan-200 bg-cyan-50/80 text-cyan-900",
    accent: "text-cyan-800",
    dot: "bg-cyan-500",
  },
  provider: {
    panel: "from-indigo-600 to-blue-600",
    soft: "border-indigo-200 bg-indigo-50/80 text-indigo-900",
    accent: "text-indigo-800",
    dot: "bg-indigo-500",
  },
  admin: {
    panel: "from-emerald-600 to-green-600",
    soft: "border-emerald-200 bg-emerald-50/80 text-emerald-900",
    accent: "text-emerald-800",
    dot: "bg-emerald-500",
  },
} as const;

export function PersonaSidebar({ persona, personaLabel, modules }: PersonaSidebarProps) {
  const pathname = usePathname();
  const theme = THEME[persona];

  return (
    <aside className="hidden lg:block lg:w-80 lg:flex-none">
      <div className="sticky top-[84px] space-y-4">
        <section className="overflow-hidden rounded-3xl border border-white/75 bg-white/88 shadow-[0_20px_54px_-38px_rgba(2,8,20,0.9)] backdrop-blur">
          <div className={`bg-gradient-to-r ${theme.panel} p-4 text-white`}>
            <div className="flex items-center gap-2">
              <Image
                src="/brand/logo-mark.svg"
                alt="BAC Telemedicine"
                width={32}
                height={32}
                className="rounded-lg bg-white/90 p-1"
              />
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-white/90">WORKSPACE</p>
                <p className="text-base font-bold">{personaLabel}</p>
              </div>
            </div>
          </div>

          <nav className="space-y-2 p-3">
            {modules.map((module, index) => {
              const href = `/workspace/${persona}/${module.slug}`;
              const isActive = pathname === href;
              return (
                <Link
                  key={module.slug}
                  href={href}
                  title={module.description}
                  className={
                    isActive
                      ? `block rounded-2xl border px-3 py-2.5 ${theme.soft}`
                      : "block rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  }
                >
                  <p className="text-[11px] font-semibold tracking-[0.12em]">MODULE {index + 1}</p>
                  <p className="text-sm font-semibold">{module.title}</p>
                  <p className="text-xs opacity-80">{module.description}</p>
                </Link>
              );
            })}
          </nav>
        </section>

        <section className="rounded-2xl border border-white/75 bg-white/88 p-4 shadow-[0_18px_50px_-36px_rgba(2,8,20,0.85)] backdrop-blur">
          <p className={`text-xs font-semibold tracking-[0.12em] ${theme.accent}`}>FLOW TIPS</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            <li className="flex gap-2">
              <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${theme.dot}`} />
              <span>Use module order from top to bottom for a complete role journey.</span>
            </li>
            <li className="flex gap-2">
              <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${theme.dot}`} />
              <span>Hover on action controls to read tooltips before submitting.</span>
            </li>
            <li className="flex gap-2">
              <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${theme.dot}`} />
              <span>Use status badges to track current stage and completion quality.</span>
            </li>
          </ul>
        </section>
      </div>
    </aside>
  );
}
