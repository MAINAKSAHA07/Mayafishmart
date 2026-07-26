import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { redirect } from "next/navigation";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data as Profile | null;
}

export async function requireUser(redirectTo = "/login", nextPath = "/account") {
  const user = await getSessionUser();
  if (!user) redirect(`${redirectTo}?next=${encodeURIComponent(nextPath)}`);
  return user;
}
