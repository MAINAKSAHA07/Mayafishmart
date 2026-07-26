import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/demo-data";
import { AdminNav } from "@/components/admin/AdminNav";
import { Logo } from "@/components/ui/Logo";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-ocean-deep text-foam">
        <div className="mx-auto max-w-lg px-4 py-20">
          <Logo size={64} />
          <h1 className="mt-5 text-3xl text-white">Backoffice</h1>
          <p className="mt-3 leading-relaxed text-foam/75">
            Set Supabase environment variables to use the multi-role admin. Demo storefront works
            without them.
          </p>
          <Link href="/" className="btn-ghost mt-8 inline-flex">
            ← Storefront
          </Link>
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
            <Link href="/admin" className="flex items-center gap-2.5">
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
