"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(nextPath: string | null) {
  if (!nextPath) return "/workspace";
  if (!nextPath.startsWith("/")) return "/workspace";
  return nextPath;
}

function encode(value: string) {
  return encodeURIComponent(value);
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? "/workspace"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/auth/sign-in?error=${encode(error.message)}&next=${encode(next)}`);
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const rawRole = String(formData.get("role") ?? "patient");
  const role = rawRole === "provider" || rawRole === "admin" ? rawRole : "patient";
  const next = safeNextPath(String(formData.get("next") ?? "/workspace"));

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
      },
    },
  });

  if (error) {
    redirect(`/auth/sign-up?error=${encode(error.message)}&next=${encode(next)}`);
  }

  if (data.user && data.session) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      role,
      full_name: fullName || null,
    });
  }

  // If email confirmation is disabled, session exists and user can continue.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(next);
  }

  redirect(
    `/auth/sign-in?message=${encode("Account created. Check your email to verify, then sign in.")}&next=${encode(
      next,
    )}`,
  );
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/sign-in?message=Signed out successfully.");
}
