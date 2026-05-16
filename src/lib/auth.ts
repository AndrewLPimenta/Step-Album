import "server-only";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserRow } from "@/types/database";

export interface SessionUser {
  authId: string;
  profile: UserRow;
}

/**
 * Get the authenticated user and their profile.
 * Redirects to /login if no session.
 */
export async function requireUser(): Promise<SessionUser> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  const typedProfile = profile as UserRow;
  if (!typedProfile.active) {
    await supabase.auth.signOut();
    redirect("/login?error=inactive");
  }

  return { authId: user.id, profile: typedProfile };
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireUser();
  if (session.profile.role !== "admin") {
    redirect("/dashboard?error=forbidden");
  }
  return session;
}

/** Non-redirecting variant for layouts/components that need to branch. */
export async function getOptionalUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();
  const typedProfile2 = profile as unknown as UserRow;
  if (!typedProfile2 || !typedProfile2.active) return null;
  return { authId: user.id, profile: typedProfile2 };
}
