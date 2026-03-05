import { redirect } from "next/navigation";
import { type User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { type Persona } from "@/lib/workspace/config";

export type UserProfile = {
  id: string;
  role: Persona;
  full_name: string | null;
  created_at: string;
};

type AuthContext = {
  user: User | null;
  profile: UserProfile | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

function resolveRole(rawRole: unknown): Persona {
  if (rawRole === "provider") return "provider";
  if (rawRole === "admin") return "admin";
  return "patient";
}

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null, supabase };
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id,role,full_name,created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile) {
    return { user, profile: existingProfile as UserProfile, supabase };
  }

  // Bootstraps profile if database trigger was not configured.
  const role = resolveRole(user.user_metadata?.role);
  const fullName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;

  const { data: createdProfile } = await supabase
    .from("profiles")
    .insert({ id: user.id, role, full_name: fullName })
    .select("id,role,full_name,created_at")
    .maybeSingle();

  return {
    user,
    profile: (createdProfile as UserProfile | null) ?? null,
    supabase,
  };
}

export async function requireAuth(nextPath: string) {
  const context = await getAuthContext();
  if (!context.user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(nextPath)}`);
  }
  return context;
}

export async function requireProfile(nextPath: string) {
  const context = await requireAuth(nextPath);
  if (!context.profile) {
    redirect(
      `/auth/sign-up?next=${encodeURIComponent(
        nextPath,
      )}&message=${encodeURIComponent("Complete account setup to continue.")}`,
    );
  }
  return context as AuthContext & { user: User; profile: UserProfile };
}

export function canAccessPersona(userRole: Persona, persona: string) {
  return userRole === "admin" || userRole === persona;
}
