import Link from "next/link";
import { requireStaff } from "@mayafishmart/shared/auth";
import { isSupabaseConfigured, getStorefrontUrl } from "@mayafishmart/shared/config";
import { AdminNav } from "@/components/admin/AdminNav";
import { Logo } from "@/components/ui/Logo";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-ocean-deep text-foam">
        <div className="mx-auto max-w-lg px-4 py-20">
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

  return (
    <div className="min-h-screen bg-[#08183c] text-foam">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <aside className="glass-dark sticky top-0 z-30 border-b border-white/8 lg:min-h-screen lg:w-60 lg:border-r lg:border-b-0 lg:border-white/8">
          <div className="px-5 py-6">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo size={36} />
              <span className="font-display text-[1.2rem] tracking-[-0.02em] text-white">
                Maya Ops
              </span>
            </Link>
            <p className="eyebrow mt-2 text-aqua">{profile.role}</p>
          </div>
          <AdminNav role={profile.role} />
        </aside>
        <main className="flex-1 px-4 py-7 sm:px-6 lg:px-9 lg:py-9">{children}</main>
      </div>
    </div>
  );
}
