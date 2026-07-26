import type { Category, Product } from "@/lib/types";
import { defaultMinOrderQty } from "@mayafishmart/shared/min-order";

export const DEMO_CATEGORIES: Category[] = [
  {
    id: "cat-freshwater",
    name: "Freshwater",
    slug: "freshwater",
    description: "River and pond favourites",
    sort_order: 1,
  },
  {
    id: "cat-seawater",
    name: "Seawater",
    slug: "seawater",
    description: "Coastal catch of the day",
    sort_order: 2,
  },
  {
    id: "cat-shellfish",
    name: "Prawns & Shellfish",
    slug: "shellfish",
    description: "Prawns, crabs, and more",
    sort_order: 3,
  },
];

type Seed = {
  id: string;
  category: 0 | 1 | 2;
  name: string;
  slug: string;
  description: string;
  cut_notes: string;
  price_paise: number;
  stock: number;
};

const SEEDS: Seed[] = [
  {
    id: "prod-rohu",
    category: 0,
    name: "Rohu",
    slug: "rohu",
    description: "Firm freshwater favourite (Rui, Roho Labeo) — ideal for curry and fry.",
    cut_notes: "Cleaned, steak-cut on request",
    price_paise: 28000,
    stock: 40,
  },
  {
    id: "prod-katla",
    category: 0,
    name: "Catla (Katla)",
    slug: "katla",
    description: "Rich, oily freshwater fish — Bengali classic. Also called Katla.",
    cut_notes: "Whole or pieces",
    price_paise: 32000,
    stock: 40,
  },
  {
    id: "prod-tilapia",
    category: 0,
    name: "Tilapia",
    slug: "tilapia",
    description: "Mild white fish (Chilapi, Jalebi Fish) — great fried or curried.",
    cut_notes: "Whole or pieces",
    price_paise: 22000,
    stock: 15,
  },
  {
    id: "prod-pangasius",
    category: 0,
    name: "Pangasius",
    slug: "pangasius",
    description: "Indian Basa (Pangas) — boneless-friendly fillets popular for fry.",
    cut_notes: "Fillet or pieces",
    price_paise: 26000,
    stock: 15,
  },
  {
    id: "prod-mrigal",
    category: 0,
    name: "Mrigal",
    slug: "mrigal",
    description: "Mrigal Carp — firm flesh for everyday curry.",
    cut_notes: "Whole or pieces",
    price_paise: 25000,
    stock: 15,
  },
  {
    id: "prod-roopchand",
    category: 0,
    name: "Roopchand",
    slug: "roopchand",
    description: "River Pomfret / Chinese Pomfret — mild and flaky.",
    cut_notes: "Whole or pieces",
    price_paise: 36000,
    stock: 15,
  },
  {
    id: "prod-murrel",
    category: 0,
    name: "Murrel",
    slug: "murrel",
    description: "Snakehead (Sol, Soul Fish) — meaty freshwater favourite.",
    cut_notes: "Whole or pieces",
    price_paise: 42000,
    stock: 15,
  },
  {
    id: "prod-magur",
    category: 0,
    name: "Magur",
    slug: "magur",
    description: "Desi Mangur / Walking Catfish — rich curry fish.",
    cut_notes: "Whole or pieces",
    price_paise: 48000,
    stock: 15,
  },
  {
    id: "prod-singhi",
    category: 0,
    name: "Singhi",
    slug: "singhi",
    description: "Desi Singhi / Stinging Catfish — traditional Bengali favourite.",
    cut_notes: "Whole or pieces",
    price_paise: 45000,
    stock: 15,
  },
  {
    id: "prod-pabda",
    category: 0,
    name: "Pabda",
    slug: "pabda",
    description: "Pabda Catfish — delicate and prized for mustard gravy.",
    cut_notes: "Whole",
    price_paise: 52000,
    stock: 15,
  },
  {
    id: "prod-tengra",
    category: 0,
    name: "Tengra",
    slug: "tengra",
    description: "Tyangra / Kolkata Tengra — small catfish, excellent fried.",
    cut_notes: "Whole",
    price_paise: 38000,
    stock: 15,
  },
  {
    id: "prod-koi",
    category: 0,
    name: "Koi Mach",
    slug: "koi-mach",
    description: "Climbing Perch — firm texture, classic Bengali dish.",
    cut_notes: "Whole",
    price_paise: 40000,
    stock: 15,
  },
  {
    id: "prod-boal",
    category: 0,
    name: "Boal",
    slug: "boal",
    description: "Buwal / Attu Vaala — large freshwater catfish.",
    cut_notes: "Steak-cut on request",
    price_paise: 35000,
    stock: 15,
  },
  {
    id: "prod-aar",
    category: 0,
    name: "Aar Fish",
    slug: "aar-fish",
    description: "Aor / Long-whiskered Catfish — thick steaks for curry.",
    cut_notes: "Steak-cut on request",
    price_paise: 38000,
    stock: 15,
  },
  {
    id: "prod-chital",
    category: 0,
    name: "Chital",
    slug: "chital",
    description: "Chittol / Clown Knifefish — celebrated festive fish.",
    cut_notes: "Whole or pieces",
    price_paise: 55000,
    stock: 15,
  },
  {
    id: "prod-bata",
    category: 0,
    name: "Bata Fish",
    slug: "bata-fish",
    description: "Bata Labeo — small carp, great for light fry.",
    cut_notes: "Whole",
    price_paise: 30000,
    stock: 15,
  },
  {
    id: "prod-kachki",
    category: 0,
    name: "Kachki",
    slug: "kachki",
    description: "Tiny freshwater fish — crisp fry favourite.",
    cut_notes: "Whole",
    price_paise: 28000,
    stock: 15,
  },
  {
    id: "prod-surmai",
    category: 1,
    name: "Surmai",
    slug: "surmai",
    description: "Kingfish / Seer — firm steaks for fry and gravy.",
    cut_notes: "Steak-cut on request",
    price_paise: 72000,
    stock: 15,
  },
  {
    id: "prod-pomfret",
    category: 1,
    name: "Pomfret",
    slug: "pomfret",
    description: "Classic pomfret — perfect for fry or steam.",
    cut_notes: "Whole, gutted",
    price_paise: 78000,
    stock: 12,
  },
  {
    id: "prod-bombil",
    category: 1,
    name: "Bombil",
    slug: "bombil",
    description: "Bombay Duck — soft coastal fish, excellent fried.",
    cut_notes: "Whole",
    price_paise: 32000,
    stock: 15,
  },
  {
    id: "prod-prawns",
    category: 2,
    name: "Prawns",
    slug: "tiger-prawns",
    description: "Fresh prawns — medium size.",
    cut_notes: "Deveined on request",
    price_paise: 65000,
    stock: 20,
  },
];

export const DEMO_PRODUCTS: Product[] = SEEDS.map((s) => {
  const cat = DEMO_CATEGORIES[s.category];
  return {
    id: s.id,
    category_id: cat.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    cut_notes: s.cut_notes,
    unit: "kg" as const,
    price_paise: s.price_paise,
    gst_rate: 5,
    image_url: null,
    is_active: true,
    min_order_qty: defaultMinOrderQty(s.name),
    categories: cat,
    inventory: {
      product_id: s.id,
      qty_on_hand: s.stock,
      reserved_qty: 0,
      low_stock_threshold: 4,
      updated_at: new Date().toISOString(),
    },
  };
});

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;
  if (url.includes("your-project")) return false;
  if (anon.includes("your-anon-key") || anon.length < 40) return false;
  return true;
}
