# KennelSync - Deployment Guide

**KennelSync** is a full-stack kennel management platform built with React 19, Express 4, tRPC 11, and MySQL (TiDB). This document covers everything needed to deploy the application in production, including environment setup, database provisioning, and third-party integrations.

---

## Architecture Overview

The application follows a monorepo structure with a shared backend and role-based frontend interfaces. The server handles API requests via tRPC, serves the built React SPA, and manages authentication through OAuth. File storage uses Amazon S3, and payment processing is handled by Stripe.

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19, Tailwind CSS 4, Wouter | Single-page application with role-based views |
| Backend | Express 4, tRPC 11, TypeScript | API server with type-safe procedures |
| Database | MySQL 8+ / TiDB | Relational data storage with Drizzle ORM |
| Auth | Manus OAuth (JWT sessions) | User authentication and session management |
| Payments | Stripe | Checkout sessions, webhooks, payment processing |
| Storage | Amazon S3 | File uploads (dog photos, vaccination records) |
| Build | Vite 7, esbuild | Frontend bundling and server compilation |

---

## Prerequisites

Before deploying, ensure the following are available:

- **Node.js** 22.x or later
- **pnpm** 10.x (package manager)
- **MySQL 8+** or **TiDB** database instance
- **Stripe** account (test or live keys)
- **Amazon S3** bucket with appropriate IAM credentials
- **OAuth provider** configured (Manus OAuth or replace with your own)

---

## Project Structure

```
kennelsync/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components (shadcn/ui)
│   │   ├── contexts/        # React contexts (Kennel, Theme)
│   │   ├── pages/           # Page-level components
│   │   ├── lib/             # Utilities (tRPC client, date helpers)
│   │   ├── App.tsx          # Route definitions
│   │   ├── main.tsx         # Entry point with providers
│   │   └── index.css        # Global styles and theme variables
│   └── index.html           # HTML template
├── server/
│   ├── _core/               # Framework plumbing (auth, OAuth, context)
│   ├── db.ts                # Database query helpers
│   ├── routers.ts           # tRPC procedure definitions
│   ├── storage.ts           # S3 file storage helpers
│   ├── stripe.ts            # Stripe product/price definitions
│   ├── stripeWebhook.ts     # Stripe webhook handler
│   └── *.test.ts            # Vitest test files
├── drizzle/
│   ├── schema.ts            # Database schema (Drizzle ORM)
│   ├── relations.ts         # Table relations
│   └── *.sql                # Migration files
├── shared/                  # Shared types and constants
├── package.json
├── vite.config.ts
└── vitest.config.ts
```

---

## Environment Variables

Create a `.env` file in the project root with the following variables. All are required unless marked optional.

### Core Application

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL/TiDB connection string | `mysql://user:pass@host:4000/kennelsync?ssl={"rejectUnauthorized":true}` |
| `JWT_SECRET` | Secret key for signing session cookies (min 32 chars) | `your-random-secret-key-here` |
| `NODE_ENV` | Environment mode | `production` |

### OAuth / Authentication

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_APP_ID` | OAuth application ID | `app_abc123` |
| `OAUTH_SERVER_URL` | OAuth backend base URL | `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | OAuth login portal URL (frontend) | `https://id.manus.im` |
| `OWNER_OPEN_ID` | Owner's OAuth open ID (first admin user) | `openid_xyz` |
| `OWNER_NAME` | Owner's display name | `John Doe` |

### Stripe Payments

| Variable | Description | Example |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe secret API key | `sk_test_...` or `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (frontend) | `pk_test_...` or `pk_live_...` |

### S3 File Storage

| Variable | Description | Example |
|----------|-------------|---------|
| `BUILT_IN_FORGE_API_URL` | S3/storage API endpoint | `https://forge.manus.im` |
| `BUILT_IN_FORGE_API_KEY` | S3/storage API key (server-side) | `key_...` |
| `VITE_FRONTEND_FORGE_API_URL` | Storage API URL (frontend) | `https://forge.manus.im` |
| `VITE_FRONTEND_FORGE_API_KEY` | Storage API key (frontend, limited scope) | `key_...` |

### Analytics (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_ANALYTICS_ENDPOINT` | Analytics collection endpoint | `https://analytics.example.com` |
| `VITE_ANALYTICS_WEBSITE_ID` | Analytics website identifier | `site_abc` |

---

## Database Setup

### 1. Create the Database

Connect to your MySQL/TiDB instance and create the database:

```sql
CREATE DATABASE kennelsync;
```

### 2. Run Migrations

The project includes migration SQL files in the `drizzle/` directory. Apply them in order:

```bash
# Option A: Using Drizzle Kit (recommended)
pnpm drizzle-kit migrate

# Option B: Apply SQL files manually in order
mysql -u user -p kennelsync < drizzle/0000_loose_brood.sql
mysql -u user -p kennelsync < drizzle/0001_fluffy_king_cobra.sql
mysql -u user -p kennelsync < drizzle/0002_glamorous_warstar.sql
mysql -u user -p kennelsync < drizzle/0003_colossal_micromacro.sql
mysql -u user -p kennelsync < drizzle/0004_yielding_midnight.sql
mysql -u user -p kennelsync < drizzle/0005_colorful_nighthawk.sql
mysql -u user -p kennelsync < drizzle/0006_free_sandman.sql
```

### 3. Database Tables

The schema includes 17 tables covering all application domains:

| Table | Purpose |
|-------|---------|
| `users` | User accounts with role (owner/employee/customer) |
| `kennels` | Kennel profiles with contact info and capacity |
| `services` | Kennel services (boarding, daycare, grooming) |
| `dogs` | Dog profiles linked to customer accounts |
| `vaccinations` | Vaccination records for dogs |
| `bookings` | Booking records with status tracking |
| `bookingDogs` | Many-to-many: dogs assigned to bookings |
| `payments` | Payment records linked to bookings |
| `alerts` | System alerts for owners/employees |
| `rooms` | Kennel room/run definitions |
| `roomAssignmentHistory` | Room assignment tracking |
| `kennelFavorites` | Customer favorite kennels |
| `kennelRequiredVaccines` | Required vaccines per kennel |
| `customerKennels` | Customer-kennel associations |
| `checkoutAddOns` | Add-on services (bath, nails) |
| `bookingAddOns` | Add-ons selected per booking |
| `businessHours` | Per-day business hours per kennel |

---

## Build and Deploy

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build for Production

```bash
pnpm build
```

This produces two outputs:
- `dist/client/` — Static frontend assets (served by Express)
- `dist/index.js` — Compiled server bundle

### 3. Start the Production Server

```bash
pnpm start
```

The server listens on the port defined by the `PORT` environment variable (defaults to 3000). It serves both the API (`/api/trpc/*`) and the static frontend.

### 4. Stripe Webhook Setup

In your Stripe Dashboard, create a webhook endpoint pointing to:

```
https://your-domain.com/api/stripe/webhook
```

Subscribe to the following events:
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `invoice.paid`
- `customer.created`

Copy the webhook signing secret to the `STRIPE_WEBHOOK_SECRET` environment variable.

---

## Deployment Options

### Docker (Recommended)

Create a `Dockerfile` in the project root:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

Build and run:

```bash
docker build -t kennelsync .
docker run -p 3000:3000 --env-file .env kennelsync
```

### Platform-as-a-Service

The application is compatible with platforms like Railway, Render, or Fly.io. Set the build command to `pnpm build` and the start command to `pnpm start`. Configure all environment variables through the platform's dashboard.

### Manus Hosting

KennelSync was built on the Manus platform, which provides built-in hosting with custom domain support. To publish, click the **Publish** button in the Manus Management UI after creating a checkpoint.

---

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm vitest

# Run a specific test file
pnpm vitest run server/addons.test.ts
```

The test suite includes 89 tests covering authentication, bookings, rooms, add-ons, business hours, and date utilities.

---

## User Roles

Roles are assigned at the database level in the `users` table. The first user who matches `OWNER_OPEN_ID` is automatically assigned the `owner` role.

| Role | Access Level |
|------|-------------|
| `owner` | Full admin: financials, bookings, kennel management, employee management |
| `employee` | Operational: check-in/out, daily schedule, dog care, alerts |
| `customer` | Personal: dog profiles, bookings, payments, stay history |

To promote a user to owner or employee, update the `role` field directly in the database:

```sql
UPDATE users SET role = 'owner' WHERE id = <user_id>;
UPDATE users SET role = 'employee' WHERE id = <user_id>;
```

---

## Key Features Summary

- **Splash/Login Screen** — Branded landing page for unauthenticated users
- **Role-Based Interfaces** — Separate dashboards for owners, employees, and customers
- **Booking Flow** — Guided multi-step booking with dog selection, service selection, calendar, add-ons, and review
- **Checkout Add-Ons** — Optional extras (bath, nail trim) selectable during booking and at checkout
- **Room Management** — Room/run tracking with assignment history
- **Vaccination Tracking** — Required vaccines, expiration alerts, record uploads
- **Stripe Payments** — Checkout sessions, payment tracking, invoice management
- **Business Hours** — Per-day scheduling with open/close times
- **Contact Kennel** — Customer-facing kennel contact dialog with phone, email, and hours
- **Today View** — Employee daily overview with arriving/departing dogs and service tasks
- **Alerts System** — Vaccination alerts, booking notifications, and action items

---

## Replacing Manus OAuth

If deploying outside the Manus platform, you will need to replace the OAuth integration. The authentication logic is isolated in `server/_core/oauth.ts` and `server/_core/sdk.ts`. To use a different provider:

1. Replace the OAuth callback handler in `server/_core/oauth.ts` with your provider's flow.
2. Update `server/_core/sdk.ts` to issue and verify JWT tokens using your own signing key.
3. Update `client/src/const.ts` to point `getLoginUrl()` to your provider's login page.
4. Ensure the session cookie mechanism in `server/_core/cookies.ts` remains compatible.

The rest of the application (tRPC procedures, database queries, frontend components) does not depend on the specific OAuth provider and will work without changes.
