# CoffeeShopGen

A multi-shop coffee marketplace. Shop owners apply and get approved, customers order for delivery and follow the order live, and everyone earns points that take money off the next cup.

**Stack:** React 18 (Vite) · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage, Realtime) · deployed on Vercel

## What it does

| Who | What they can do |
| --- | --- |
| Customers | Browse shops, order with sizes, pay on delivery, follow the order through 7 live steps, cancel while it's still "placed", rate delivered orders, earn and spend points, invite friends |
| Shop owners | Apply with shop details and photos, get reviewed, then manage the menu and stock, move orders along, pause orders, see sales and earnings |
| Admins | Review applications (approve, reject with a reason, suspend), see marketplace totals |

## Set it up

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste [`supabase/migrations/20261028000000_init.sql`](supabase/migrations/20261028000000_init.sql), and run it. This creates the tables, the order and reward functions, row level security, the image bucket and realtime.
   - If you ran the earlier v1 schema, run [`supabase/reset.sql`](supabase/reset.sql) first. It deletes the old tables.
3. Copy two values: the **Project URL** and the **publishable key** (`sb_publishable_…`). Find both by clicking **Connect** at the top of the project, or under **Settings → API Keys**. Older projects show a legacy `anon` key instead; it works the same way.
4. Under **Authentication → URL Configuration**, set **Site URL** to your Vercel URL (or `http://localhost:5173` while developing) and add the same address under **Redirect URLs**. Without this, email confirmation links point to the wrong place.
5. **Turn off email confirmation.** Under **Authentication → Sign In / Providers → Email**, switch off **Confirm email**. The app expects sign-up to log people in right away, with no link or code. With it off, any email address that isn't already registered works, and a duplicate gets a clear "already has an account" message.

### 2. Run it locally

```bash
npm install
cp .env.example .env.local     # then fill in the two values
npm run dev
```

### 3. Create the test admin (quickest)

Run [`supabase/seed_admin.sql`](supabase/seed_admin.sql) in the SQL Editor. It creates an admin you can log in with right away:

- Email: `admin@gmail.com`
- Password: `#admin321`

**This repo is public, so this login is public.** It is for test systems only. Before real customers arrive, delete it with `delete from auth.users where email = 'admin@gmail.com';` (also at the bottom of that file). If you'd rather use a private admin, skip this and follow the next section.

### 3b. Or make your own account an admin

Sign up in the app, then run this in the Supabase SQL Editor with your email:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Open **Admin** from the account menu to approve shops. Optional: run [`supabase/seed.sql`](supabase/seed.sql) to turn your first account into the owner of a demo shop with a small menu.

### 4. Deploy to Vercel

1. Push this repo to GitHub and import it at [vercel.com/new](https://vercel.com/new). Vercel detects Vite on its own.
2. Add two **Environment Variables** (Production and Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy. [`vercel.json`](vercel.json) rewrites every path to `index.html`, so refreshing `/orders` or opening a shared shop link works instead of returning a 404.
4. Put your Vercel URL into Supabase's Site URL and Redirect URLs (step 1.4).

Vite bakes `VITE_*` variables in at build time, so redeploy after changing them. `VITE_SUPABASE_ANON_KEY` takes the publishable key (the variable name is historical). It is safe in the browser: the database is protected by row level security, not by hiding the key. Never put the **secret key** (`sb_secret_…`) or the legacy `service_role` key in this project or in Vercel, because it bypasses all security rules.

## How the rules are enforced

The browser never writes orders, order items, rewards or shop status directly. It calls database functions that check everything on the server:

- `place_order` reads prices, sizes, stock, delivery fee and the customer's points from the database, never from the browser. It locks the rows, so two people can't buy the last croissant. All steps happen in one transaction.
- `set_order_status` only lets a shop move an order one step forward, and lets a customer cancel while it is still "placed". Cancelling puts stock back, voids pending points and returns spent points.
- `review_shop`, `resubmit_shop` and `submit_review` guard approvals and reviews.
- Column-level grants stop users from editing their own role or a shop's status.

**Points:** 1 point per ₱20 paid, pending until the order is delivered. 1 point is worth ₱1 and can cover up to half the subtotal. **Referrals:** both people get 50 points after the invited friend's first delivered order of ₱200 or more, once per friend, with a cap of 10 bonuses a month per referrer. **Platform fee:** 5% of the subtotal, stored on every order.

## Project structure

```
supabase/
  migrations/…init.sql   Tables, functions, RLS, storage, realtime
  seed.sql               Optional demo shop
  reset.sql              Destructive clean-up for the old v1 schema
src/
  lib/                   Supabase client, auth, cart, toasts, confirm dialogs, formatting, rules
  components/            UI kit, ticket, order tracker, navbar, image upload
  pages/                 Home, ShopPage, Cart, Orders, Rewards, Login
  pages/owner/           Dashboard, orders, menu, shop form
  pages/admin/           Admin panel
vercel.json              SPA rewrite, cache and security headers
```

## Known limits

- **No online payments.** Orders are paid on delivery (cash or GCash to the rider). Adding a gateway such as PayMongo or Xendit means a server function plus a webhook.
- **Settlement is not automated.** Orders store the 5% fee and owners see their net earnings, but paying shops out is a separate process.
- **Delivery is handled by the shop.** There is no courier app, so the shop moves the order through the steps.
- **Points can be discounted by hand-made accounts.** The referral cap and the qualifying-order rule limit abuse, but they can't tell two accounts owned by one person apart.
- Reviews can't be edited or deleted yet, and there is no password reset page.

## AI features (optional)

Two features use Google Gemini through a Vercel serverless function (`api/ai.js`):

- **Coffee assistant** – a floating "Ask AI" button. Customers describe what they want and get real products from the live menu, each with an Add button.
- **AI fill** – in the owner's product form, fills the description, category and sizes from the product name (never overwrites what the owner already typed).

To turn it on:

1. Create a free key at https://aistudio.google.com/apikey
2. In Vercel, **Settings → Environment Variables**, add `GEMINI_API_KEY` (no `VITE_` prefix; the key must stay server-side) for Production, Preview and Development.
3. Redeploy.

Optional: `GEMINI_MODEL` (default `gemini-2.5-flash`). Without the key the rest of the app works normally and the assistant says it isn't set up yet. Only signed-in users can call it, limited to 30 requests per hour each. The functions don't run under plain `npm run dev`; use the deployed site or `vercel dev`.
