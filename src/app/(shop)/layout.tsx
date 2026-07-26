import ShopLayoutClient from "@/components/shop/ShopLayoutShell";
import { getProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/demo-data";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let profile = null;
  if (isSupabaseConfigured()) {
    try {
      profile = await getProfile();
    } catch {
      profile = null;
    }
  }

  return <ShopLayoutClient profile={profile}>{children}</ShopLayoutClient>;
}
