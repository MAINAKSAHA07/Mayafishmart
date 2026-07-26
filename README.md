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
- Browse today's catch, cart, login
- Checkout collects **name, email, phone, address** and saves them **only when ordering**
- Pickup windows, Razorpay or pay at counter
- Order status + history

### Backoffice (Maya Ops — separate app)
Roles: `owner` · `manager` · `staff` · `viewer`

- Dashboard, orders board, counter orders
- Catalog + inventory movements
- Customers (saved checkout contact data)
- User role assignment (owner)
- AI insights + image stock scan (human approve before apply)

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

## Deploy (two Vercel projects)

1. **Storefront** — Root Directory: `.` · Build: `npm run build` · Env: Supabase + Razorpay + `NEXT_PUBLIC_ADMIN_URL`
2. **Admin** — Root Directory: `apps/admin` · Build: `npm run build` · Env: Supabase + OpenAI + `NEXT_PUBLIC_STOREFRONT_URL`  
   Include `packages/shared` in the monorepo (Vercel installs from repo root when using workspaces; set “Include source files outside Root Directory” if prompted).

## Auth notes

- Customers: email/password or phone OTP (OTP needs an SMS provider in Supabase)
- Staff: email/password on the **admin** app; owner assigns roles under **Users**

## AI notes

- Insights and stock vision run in the **admin** app when `OPENAI_API_KEY` is set
- Without a key, heuristic summaries / sample proposals are returned
- Image stock updates never auto-commit — staff must **Apply** or **Reject**

## Project layout

```
src/                 # customer storefront
apps/admin/          # Maya Ops (deploy separately)
packages/shared/     # types, auth, supabase clients, money
supabase/migrations  # schema + RLS
```
