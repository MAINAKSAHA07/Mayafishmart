import { createClient } from "./supabase/server";
import type { AppRole, Profile } from "./types";
import { MANAGER_ROLES, STAFF_ROLES, WRITE_STAFF_ROLES } from "./types";
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

export async function requireUser(redirectTo = "/login", nextPath = "/") {
  const user = await getSessionUser();
  if (!user) redirect(`${redirectTo}?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Staff gate for the standalone admin app (dashboard lives at `/`). */
export async function requireStaff() {
  const profile = await getProfile();
  if (!profile || !STAFF_ROLES.includes(profile.role)) {
    redirect("/login");
  }
  return profile;
}

export async function requireManager() {
  const profile = await requireStaff();
  if (!MANAGER_ROLES.includes(profile.role)) {
    redirect("/");
  }
  return profile;
}

export function canWriteStock(role: AppRole) {
  return WRITE_STAFF_ROLES.includes(role);
}

export function canManageCatalog(role: AppRole) {
  return MANAGER_ROLES.includes(role);
}

export function canManageUsers(role: AppRole) {
  return role === "owner";
}
