# Maya Fish Mart

End-to-end fish mart platform: customer storefront (pickup only) + multi-role backoffice, with AI sales/stock insights and image-based inventory review.

## Stack

- **Next.js** (App Router) + TypeScript + Tailwind
- **Supabase** — Auth, Postgres, RLS, Storage
- **Razorpay** — online payments (pay-at-counter also supported)
- **OpenAI** (optional) — insights + vision stock scans

## Features

### Customer
- Browse today's catch, cart, login
- Checkout collects **name, email, phone, address** and saves them **only when ordering**
- Pickup windows, Razorpay or pay at counter
- Order status + history (no separate profile editor)

### Backoffice (`/admin`)
Roles: `owner` · `manager` · `staff` · `viewer`

- Dashboard, orders board, counter orders
- Catalog + inventory movements
- Customers (saved checkout contact data)
- User role assignment (owner)
- AI insights + image stock scan (human approve before apply)

## Setup

1. Clone and install:

```bash
npm install
cp .env.example .env.local
```

2. Create a Supabase project. In the SQL editor run:
   - [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql)
   - [`supabase/seed.sql`](supabase/seed.sql)

3. Create Storage buckets:
   - `product-images` — public read
   - `stock-scans` — private (staff only)

4. Fill `.env.local` with Supabase + Razorpay (+ optional OpenAI) keys.

5. Sign up via `/login`, then promote yourself to owner:

```sql
update public.profiles set role = 'owner' where email = 'you@example.com';
```

6. Run the app:

```bash
npm run dev
```

- Storefront: http://localhost:3000  
- Admin: http://localhost:3000/admin  

Without Supabase env vars, the storefront shows a **demo catalog** (browse-only).

## Auth notes

- Customers: email/password or phone OTP (OTP needs an SMS provider in Supabase)
- Staff: email/password; owner assigns roles under **Users**

## AI notes

- Insights and stock vision call OpenAI when `OPENAI_API_KEY` is set
- Without a key, heuristic summaries / sample proposals are returned so the UI still works
- Image stock updates never auto-commit — staff must **Apply** or **Reject**

## Project layout

```
src/app/(shop)/     # customer storefront
src/app/admin/      # backoffice
src/app/api/        # orders, payments, admin, AI
supabase/migrations # schema + RLS
supabase/functions  # optional edge stubs
```
