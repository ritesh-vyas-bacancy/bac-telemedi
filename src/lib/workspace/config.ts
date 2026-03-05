export type Persona = "patient" | "provider" | "admin";

export type ModuleDefinition = {
  slug: string;
  title: string;
  description: string;
};

export type PersonaDefinition = {
  id: Persona;
  label: string;
  accent: string;
  modules: ModuleDefinition[];
};

export const WORKSPACE_CONFIG: Record<Persona, PersonaDefinition> = {
  patient: {
    id: "patient",
    label: "Patient",
    accent: "from-cyan-600 to-teal-500",
    modules: [
      {
        slug: "booking",
        title: "Book Appointment",
        description: "Find provider and reserve your consultation slot.",
      },
      {
        slug: "visits",
        title: "My Visits",
        description: "Track all appointments and status progression.",
      },
      {
        slug: "inbox",
        title: "Care Inbox",
        description: "Review provider communication and updates.",
      },
    ],
  },
  provider: {
    id: "provider",
    label: "Provider",
    accent: "from-indigo-600 to-sky-500",
    modules: [
      {
        slug: "dashboard",
        title: "Queue Dashboard",
        description: "Manage today's patient queue with live status updates.",
      },
      {
        slug: "schedule",
        title: "Availability",
        description: "Maintain consultation availability slots.",
      },
      {
        slug: "patients",
        title: "Patient Panel",
        description: "View active patient list and recent interactions.",
      },
    ],
  },
  admin: {
    id: "admin",
    label: "Admin",
    accent: "from-emerald-600 to-lime-500",
    modules: [
      {
        slug: "pulse",
        title: "Operations Pulse",
        description: "See live telemedicine platform health.",
      },
      {
        slug: "operations",
        title: "Operations Desk",
        description: "Monitor latest appointments and role mix.",
      },
      {
        slug: "audit",
        title: "Audit Stream",
        description: "Review tracked actions and compliance history.",
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
