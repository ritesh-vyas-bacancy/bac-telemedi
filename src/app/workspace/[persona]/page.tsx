import { notFound, redirect } from "next/navigation";
import { getPersonaConfig } from "@/lib/workspace/config";

type PageProps = {
  params: Promise<{ persona: string }>;
};

export default async function PersonaWorkspacePage({ params }: PageProps) {
  const { persona } = await params;
  const config = getPersonaConfig(persona);

  if (!config) {
    notFound();
  }

  redirect(`/workspace/${persona}/${config.modules[0].slug}`);
}
