# CoffeeShop Gen

A multi-shop coffee marketplace: shop owners apply and get approved, customers browse shops, order for delivery, track their order, and earn reward points.

**Stack:** React (Vite) · Tailwind CSS v4 · Supabase (Postgres, Auth, Row Level Security) · React Router

## Features

- **Shop owners:** apply with shop details → admin approves → dashboard to manage products, stock, and incoming orders
- **Admin:** review pending shop applications (approve or reject with a reason)
- **Customers:** browse approved shops, add items (with sizes) to a cart, checkout, track order status, and earn points (1 per ₱100)

## Setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project.
2. Open **SQL Editor → New query**, paste the full contents of [`supabase/schema.sql`](supabase/schema.sql), and run it.
3. Under **Project Settings → API**, copy the Project URL and the `anon` public key.

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### 4. Run

```bash
npm run dev
```

### 5. Create an admin

1. Sign up through the app once.
2. In the Supabase SQL Editor, run:

   ```sql
   update profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

Admins can then open **Admin** and approve shops.

## Project structure

```
supabase/schema.sql      Tables, triggers, RPC, and RLS policies
src/
  lib/                   Supabase client, auth & cart contexts, shared UI tokens
  components/            Navbar, ProtectedRoute
  pages/                 Shops, ShopPage, Cart, Orders, OwnerDashboard, AdminPanel, Login
```

## Known limitations (MVP)

- Stock is not decremented when an order is placed. The owner adjusts it manually.
- Order creation runs as several client-side inserts. A Postgres function would make it atomic.
- No payment gateway. GCash and card are recorded as payment methods only.
- Image fields take URLs. There is no file upload yet (Supabase Storage can be added).
- Points are recorded but cannot be redeemed yet.
- Real-time order updates are not wired up. Refresh to see changes.

## Deploying

Build with `npm run build`, then deploy the `dist/` folder to Vercel, Netlify, or Cloudflare Pages. Set the two `VITE_SUPABASE_*` variables in the host's environment settings.
