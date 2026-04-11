# Local/staging database seed (Riverbend)

This seeds a **full application dataset** (not just Auth users): kennel, `public.users` profiles, staff/customer links, dogs, vaccinations, services, checkout add-ons, rooms, business hours, required vaccines, dog badges, many bookings (past / active / upcoming), room assignments, payments, alerts, and discounts.

Use only with a **non-production** Supabase project.

**Requirements**

- `VITE_SUPABASE_URL` — project URL (same project your local app uses).
- `SUPABASE_SERVICE_ROLE_KEY` — **service_role** secret from Supabase **Settings → API**.  
  If you use the **anon** key, inserts can fail after Auth users are created (orphan accounts). The script warns if the key looks unusually short.

**Do not** point these at production.

---

## Owner onboarding + Stripe (local / demo)

Owner subscription enforcement is controlled by `server/subscriptionAccess.ts`:

- If **`STRIPE_SECRET_KEY`** is set, the app treats owner SaaS billing as **enforced** unless you set **`OWNER_SUBSCRIPTION_ENFORCE=off`** (or `0` / `false`).
- **`STRIPE_OWNER_SUBSCRIPTION_PRICE_ID`** is required only when you click **Start Subscription** (Stripe Checkout for the owner plan). Without it, use **Skip for now** (trial) or turn enforcement off for pure demo.
- **`kennels.trial_ends_at`** (and related Stripe columns) must exist for **Skip for now** to persist a trial end date. Run **`MIGRATION_R30_kennel_stripe_subscription.sql`** (or the `kennels` `ALTER` block in **`SUPABASE_SCHEMA.sql`**) in the Supabase SQL Editor if you see schema-cache errors. Then **Dashboard → Settings → API → Reload schema** if your client still caches an old schema.

**Typical local demo `.env` (no owner Stripe checkout):**

```bash
# Optional: keep owner gate off while STRIPE_SECRET_KEY is set for customer payments
OWNER_SUBSCRIPTION_ENFORCE=off
```

**Typical local demo with full owner checkout:** set `STRIPE_SECRET_KEY`, `STRIPE_OWNER_SUBSCRIPTION_PRICE_ID` (recurring Price id from Stripe Dashboard), and apply **`MIGRATION_R30`** on the demo database.

---

## Reset and reseed (recommended order)

```bash
cd /path/to/KennelSync
pnpm run seed:demo:reset
pnpm run seed:demo
```

- `seed:demo:reset` — deletes kennel **Riverbend Pet Lodge** (and legacy **Riverbend Pet Lodge & Daycare** if present), removes seeded Auth users, clears `scripts/.demo-seed-state.json`.
- `seed:demo` — creates Auth users **then** all relational data.

Success ends with **`[seed] Done — full app dataset written`** and a **Verification** block with non-zero counts for dogs, bookings, payments, etc. If you only see auth users in Supabase, the script likely **errored before kennel insert** — scroll up for `kennels.insert` / column errors, run migrations (e.g. `MIGRATION_R30_kennel_stripe_subscription.sql`), then reset and seed again.

---

## Login credentials

**Shared password** (unless `DEMO_SEED_PASSWORD` is set):

`RiverbendLodge2026!`

| Role | Email |
|------|--------|
| Owner | `morgan.hale@riverbendpetlodge.com` |
| Staff | `avery.chen@riverbendpetlodge.com` |
| Staff | `jordan.okonkwo@riverbendpetlodge.com` |
| Staff | `sam.rivera@riverbendpetlodge.com` |
| Customers | `s.whitfield82@gmail.com`, `james.nolan.pdx@yahoo.com`, `priya.sharma.oregon@gmail.com`, `marcus.reed@outlook.com`, `elena.v.park@icloud.com`, `d.collins.work@gmail.com`, `cmurphywrites@gmail.com`, `olivia.bennett@me.com`, `daniel.foster@hotmail.com`, `michelle.hayes.pdx@gmail.com` |

---

## Data model (what the app reads)

| Area | Tables / notes |
|------|----------------|
| Kennel | `kennels` (`owner_id` → owner UUID; optional `subscription_status`, `stripe_*` for billing UI) |
| Owner profile | `users` row; `kennel_id` set to primary kennel for session context |
| Staff | `users.role = employee`, `users.kennel_id` set |
| Customers | `users.role = customer`; `customer_kennel_associations` links each customer + staff to kennel |
| Dogs | `dogs` (`owner_id`, `kennel_id`), `vaccinations`, optional `dog_badge_assignments` |
| Catalog | `services`, `checkout_add_ons`, `checkout_discounts`, `business_hours`, `kennel_required_vaccines`, `dog_badges` |
| Operations | `bookings`, `room_assignments`, optional `booking_dogs`, `booking_add_ons`, `payments`, `alerts` |

---

## Screens that should look populated

**Owner**

- Dashboard (stats, occupancy, revenue when payments exist)
- Bookings / calendar / schedule views
- Rooms & occupancy
- Services, add-ons, discounts
- Dogs (kennel roster), alerts / compliance-style lists
- Kennel profile / settings; subscription/billing cards if your build shows them

**Employee**

- Dashboard (checked-in, today check-in/out, tasks from add-ons)
- Today / operations flows
- Dogs, bookings, rooms, alerts

**Customer**

- Linked kennel (via `customer_kennel_associations`)
- My dogs, vaccinations, bookings / stays

---

## Files

| File | Purpose |
|------|--------|
| `scripts/demo-seed-config.ts` | Kennel name, identities, `allSeedAuthEmails()` for reset |
| `scripts/seed-demo.ts` | Full seed + resilient kennel insert + verification counts |
| `scripts/reset-demo.ts` | Wipe seeded kennel + auth users |
| `scripts/.demo-seed-state.json` | Written on success; gitignored |
| `package.json` | `seed:demo`, `seed:demo:reset` |

---

## Screenshot ideas

**Owner:** dashboard, financials/revenue, bookings board, services & pricing, kennel profile.

**Staff:** dashboard, today’s check-outs / tasks, dog detail (feeding & behavior notes), alerts.

**Customer:** dogs, upcoming/past stays, booking request flow.
