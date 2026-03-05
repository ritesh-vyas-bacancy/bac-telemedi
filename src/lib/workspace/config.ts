export type Persona = "patient" | "provider" | "admin";

export type ModuleDefinition = {
  slug: string;
  title: string;
  description: string;
};

export type PersonaDefinition = {
  id: Persona;
  label: string;
  modules: ModuleDefinition[];
};

export const WORKSPACE_CONFIG: Record<Persona, PersonaDefinition> = {
  patient: {
    id: "patient",
    label: "Patient",
    modules: [
      {
        slug: "booking",
        title: "Appointment Booking",
        description: "Book consultations and review upcoming appointments.",
      },
    ],
  },
  provider: {
    id: "provider",
    label: "Provider",
    modules: [
      {
        slug: "dashboard",
        title: "Queue Dashboard",
        description: "Review assigned appointments and update status.",
      },
    ],
  },
  admin: {
    id: "admin",
    label: "Admin",
    modules: [
      {
        slug: "pulse",
        title: "Operations Pulse",
        description: "View high-level live platform metrics.",
      },
    ],
  },
};

export const PERSONAS: Persona[] = ["patient", "provider", "admin"];

export function getPersonaConfig(persona: string) {
  return WORKSPACE_CONFIG[persona as Persona] ?? null;
}

export function getModuleConfig(persona: string, module: string) {
  const personaConfig = getPersonaConfig(persona);
  if (!personaConfig) return null;
  return personaConfig.modules.find((item) => item.slug === module) ?? null;
}

export function getDefaultModuleByRole(role: Persona) {
  return WORKSPACE_CONFIG[role].modules[0]?.slug ?? "";
}
