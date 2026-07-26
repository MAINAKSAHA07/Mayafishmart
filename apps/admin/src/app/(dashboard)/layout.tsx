import { requireStaff } from "@mayafishmart/shared/auth";
import { isSupabaseConfigured, getStorefrontUrl } from "@mayafishmart/shared/config";
import { AdminShell } from "@/components/admin/AdminShell";
import { Logo } from "@/components/ui/Logo";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-dvh bg-ocean-deep text-foam">
        <div className="mx-auto max-w-lg px-4 py-20 safe-x">
          <Logo size={64} />
          <h1 className="mt-5 text-3xl text-white">Maya Ops</h1>
          <p className="mt-3 leading-relaxed text-foam/75">
            Set Supabase environment variables in the admin app to use the backoffice.
          </p>
          <a href={getStorefrontUrl()} className="btn-ghost mt-8 inline-flex">
            ← Storefront
          </a>
        </div>
      </div>
    );
  }

  const profile = await requireStaff();

  return <AdminShell role={profile.role}>{children}</AdminShell>;
}
