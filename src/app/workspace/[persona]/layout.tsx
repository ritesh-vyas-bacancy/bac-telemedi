import { redirect, notFound } from "next/navigation";
import { canAccessPersona, requireProfile } from "@/lib/auth/session";
import { PERSONAS } from "@/lib/workspace/config";

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

  return <>{children}</>;
}
