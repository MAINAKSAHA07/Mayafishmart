import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@mayafishmart/shared/supabase/server";
import { createAdminClient } from "@mayafishmart/shared/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "owner") {
    return NextResponse.json({ error: "Owner only" }, { status: 403 });
  }

  const { email, role } = await request.json();
  if (!email || !role) {
    return NextResponse.json({ error: "email and role required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (!target) {
    return NextResponse.json(
      { error: "User must sign up first with this email" },
      { status: 404 }
    );
  }

  const { error } = await admin.from("profiles").update({ role }).eq("id", target.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
