import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { getDefaultModuleByRole } from "@/lib/workspace/config";

export default async function Home() {
  const { user, profile } = await getAuthContext();

  if (!user) {
    redirect("/auth/sign-in");
  }

  if (!profile) {
    redirect("/auth/sign-up");
  }

  redirect(`/workspace/${profile.role}/${getDefaultModuleByRole(profile.role)}`);
}
