# Maya Fish Mart

End-to-end fish mart platform: **customer storefront** (pickup only) and a **separate Maya Ops backoffice**, with AI sales/stock insights and image-based inventory review.

## Apps (deploy separately)

| App | Path | Local | Deploy root |
|-----|------|-------|-------------|
| Storefront | repo root (`src/`) | http://localhost:3000 | `.` (Vercel project A) |
| Maya Ops | `apps/admin/` | http://localhost:3001 | `apps/admin` (Vercel project B) |
| Shared lib | `packages/shared/` | — | used by admin via workspace |

## Stack

- **Next.js** (App Router) + TypeScript + Tailwind
- **Supabase** — Auth, Postgres, RLS, Storage
- **Razorpay** — online payments (pay-at-counter also supported)
- **OpenAI** (optional) — insights + vision stock scans

## Public URL structure (storefront)

| Path | Purpose | Indexed |
|------|---------|---------|
| `/` | Home / brand | Yes |
| `/catch` | Full catalog | Yes |
| `/catch/[category]` | Category (e.g. `/catch/freshwater`) | Yes |
| `/products/[slug]` | Product detail | Yes |
| `/cart`, `/checkout`, `/login`, `/account`, `/orders/*` | Customer account flows | No |

Permanent redirects: `/shop`, `/catalog`, `/menu` → `/catch`; `/product/:slug` → `/products/:slug`; `/admin` → admin app URL.

SEO: `sitemap.xml`, `robots.txt`, Open Graph / Twitter cards, JSON-LD. Set `NEXT_PUBLIC_APP_URL` to your production storefront domain.

### Customer
- Browse today's catch, cart, **guest checkout** (login optional)
- Checkout collects **name, email, phone, address** — prefills if signed in or from last guest order
- Pickup windows, Razorpay or pay at counter
- Order confirmation via pickup code link; signed-in users also get order history

### Backoffice (Maya Ops — separate app)
Roles: `owner` · `manager` · `staff` · `viewer`

- Dashboard with D3 sales charts (30-day revenue, volume, top products)
- Orders board, counter orders, printable GST receipts
- Catalog + inventory movements + **coupons**
- Customers (saved checkout contact data)
- User role assignment (owner)
- Image stock scan (human approve before apply)

Staff open Ops at `NEXT_PUBLIC_ADMIN_URL` directly — it is **not** linked from the storefront header.

## Setup

1. Clone and install (npm workspaces):

```bash
npm install
cp .env.example .env.local
cp apps/admin/.env.example apps/admin/.env.local
```

2. Create a Supabase project. In the SQL editor run:
   - [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql)
   - [`supabase/seed.sql`](supabase/seed.sql)

3. Create Storage buckets:
   - `product-images` — public read
   - `stock-scans` — private (staff only)

4. Fill both `.env.local` files with the same Supabase keys. Set:
   - Storefront: `NEXT_PUBLIC_ADMIN_URL` → your admin deploy URL
   - Admin: `NEXT_PUBLIC_STOREFRONT_URL` → your storefront deploy URL

5. Sign up via storefront `/login`, then promote yourself to owner:

```sql
update public.profiles set role = 'owner' where email = 'you@example.com';
```

6. Run:

```bash
npm run dev:storefront   # :3000
npm run dev:admin        # :3001
```

Without Supabase env vars, the storefront shows a **demo catalog** (browse-only).

## Deploy (two Netlify projects)

1. **Storefront** — https://mayafishmart.netlify.app · filter `mayafishmart` · Root `.` · `npm run deploy:storefront`
2. **Maya Ops** — https://mayafishmart-ops.netlify.app · filter `admin` · Base `apps/admin` · `npm run deploy:admin`

Env on both sites: Supabase keys. Storefront also needs Razorpay + `NEXT_PUBLIC_ADMIN_URL`. Ops needs `NEXT_PUBLIC_STOREFRONT_URL`.

Cloud deploys build from **GitHub `main`** — commit and push before triggering.

## Auth notes

- Customers: email/password or phone OTP (OTP needs an SMS provider in Supabase)
- Staff: email/password on the **admin** app; owner assigns roles under **Users**

## AI notes

- Image stock vision runs in the **admin** app when `OPENAI_API_KEY` is set
- Sales reporting uses **deterministic D3 charts** on the dashboard (no AI)
- Image stock updates never auto-commit — staff must **Apply** or **Reject**

## Coupons

- Manage under Maya Ops → **Coupons** (owner/manager)
- Percent or fixed ₹ off, min order, validity window, total + per-customer limits
- Customers apply codes at checkout; discounts apply **before GST**
- Demo seed: `FRESH10` (10% off, min ₹500)

## Project layout

```
src/                 # customer storefront
apps/admin/          # Maya Ops (deploy separately)
packages/shared/     # types, auth, supabase clients, money
supabase/migrations  # schema + RLS
```
