import { requireOwner } from "@mayafishmart/shared/auth-owner";
import { createClient } from "@mayafishmart/shared/supabase/server";
import { UserRoleForm } from "@/components/admin/UserRoleForm";
import type { Profile } from "@mayafishmart/shared/types";

export default async function AdminUsersPage() {
  await requireOwner();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["owner", "manager", "staff", "viewer"])
    .order("role");

  return (
    <div>
      <h1 className="font-display ops-page-title">Users & roles</h1>
      <p className="mt-1 text-sm text-foam/60">
        Invite staff by email — they must sign up first, then assign a role here.
      </p>
      <UserRoleForm />
      <ul className="mt-8 space-y-2">
        {((data as Profile[] | null) ?? []).map((u) => (
          <li
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10"
          >
            <div>
              <p className="text-white">{u.full_name || u.email || u.id.slice(0, 8)}</p>
              <p className="text-xs text-foam/50">{u.email}</p>
            </div>
            <span className="rounded-full bg-aqua/20 px-3 py-1 text-xs font-semibold tracking-wide text-aqua uppercase">
              {u.role}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
