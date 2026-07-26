import { createAdminClient } from "@/lib/supabase/admin";

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+")) return phone.trim();
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return phone.trim();
}

/**
 * Resolve an existing customer (logged-in or by email) or create a confirmed
 * auth+profile pair for guest checkout. Orders always need a profiles FK.
 */
export async function resolveCustomerId(opts: {
  userId?: string | null;
  email: string;
  phone: string;
  fullName: string;
}): Promise<{ customerId: string; created: boolean }> {
  const admin = createAdminClient();
  const email = opts.email.trim().toLowerCase();
  const phone = normalizePhone(opts.phone);

  if (opts.userId) {
    await admin
      .from("profiles")
      .update({
        full_name: opts.fullName,
        email,
        phone,
      })
      .eq("id", opts.userId);
    return { customerId: opts.userId, created: false };
  }

  const { data: byEmail } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (byEmail?.id) {
    await admin
      .from("profiles")
      .update({
        full_name: opts.fullName,
        phone,
      })
      .eq("id", byEmail.id);
    return { customerId: byEmail.id, created: false };
  }

  // Email-only auth user — phone lives on profiles (avoids SMS provider requirement).
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: opts.fullName,
      role: "customer",
    },
  });

  if (created?.user?.id) {
    await admin
      .from("profiles")
      .upsert({
        id: created.user.id,
        email,
        phone,
        full_name: opts.fullName,
        role: "customer",
      });
    return { customerId: created.user.id, created: true };
  }

  // Email may already exist in Auth without a matching profile row
  const msg = (error?.message || "").toLowerCase();
  if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
    const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const match = usersData?.users?.find((u) => u.email?.toLowerCase() === email);
    if (match?.id) {
      await admin.from("profiles").upsert({
        id: match.id,
        email,
        phone,
        full_name: opts.fullName,
        role: "customer",
      });
      return { customerId: match.id, created: false };
    }
  }

  throw new Error(error?.message || "Could not create guest customer");
}
