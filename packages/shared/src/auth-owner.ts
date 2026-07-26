import { getProfile } from "./auth";
import { redirect } from "next/navigation";

export async function requireOwner() {
  const profile = await getProfile();
  if (!profile || profile.role !== "owner") {
    redirect("/");
  }
  return profile;
}
