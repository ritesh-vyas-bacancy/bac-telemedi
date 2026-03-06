import { redirect, notFound } from "next/navigation";
import { canAccessPersona, requireProfile } from "@/lib/auth/session";
import { PERSONAS, getPersonaConfig } from "@/lib/workspace/config";
import { PersonaSidebar } from "@/components/workspace/persona-sidebar";

type PersonaLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ persona: string }>;
};

export default async function PersonaLayout({ children, params }: PersonaLayoutProps) {
  const { persona } = await params;
  const { profile } = await requireProfile(`/workspace/${persona}`);

  if (!PERSONAS.includes(persona as (typeof PERSONAS)[number])) {
    notFound();
  }

  if (!canAccessPersona(profile.role, persona)) {
    redirect(`/workspace/${profile.role}`);
  }

  const personaConfig = getPersonaConfig(persona);
  if (!personaConfig) {
    notFound();
  }

  return (
    <div className={`role-theme-${personaConfig.id}`}>
      <div className="mx-auto flex w-full max-w-[1700px] gap-4 px-2 py-3 sm:px-4">
        <PersonaSidebar
          persona={personaConfig.id}
          personaLabel={personaConfig.label}
          modules={personaConfig.modules}
        />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
