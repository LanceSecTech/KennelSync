# KennelSync Supabase Migration Guide

This guide provides complete instructions for migrating KennelSync from Manus infrastructure (MySQL/OAuth/S3) to Supabase (Postgres/Auth/Storage).

## Overview

KennelSync will be refactored to use:

| Component | Old | New |
|-----------|-----|-----|
| **Database** | MySQL/TiDB | Supabase Postgres |
| **Authentication** | Manus OAuth | Supabase Auth (email/password) |
| **File Storage** | Amazon S3 / Forge | Supabase Storage |
| **Hosting** | Manus | Self-hosted (Docker, Railway, Vercel, etc.) |

---

## Part 1: Supabase Project Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Enter project name: `kennelsync`
4. Choose a strong database password (save this securely)
5. Select your region (choose closest to your users)
6. Click "Create new project" and wait for provisioning (5-10 minutes)

### 1.2 Get Connection Details

Once your project is ready:

1. Go to **Settings > Database**
2. Copy the following:
   - **Host**: `db.xxxxx.supabase.co`
   - **Port**: `5432`
   - **Database**: `postgres`
   - **User**: `postgres`
   - **Password**: (the one you set during creation)

3. Go to **Settings > API**
4. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon Key**: (public key for frontend)
   - **Service Role Key**: (secret key for backend)

---

## Part 2: Database Schema

### 2.1 Create Tables in Supabase

Go to **SQL Editor** in your Supabase dashboard and run the following SQL:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (integrates with Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(320) NOT NULL UNIQUE,
  name TEXT,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('owner', 'employee', 'customer')),
  kennel_id INT,
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_signed_in TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kennels table
CREATE TABLE kennels (
  id SERIAL PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(320),
  logo_url TEXT,
  total_capacity INT DEFAULT 20,
  policies TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services table
CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  kennel_id INT NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('boarding', 'daycare', 'grooming')),
  description TEXT,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  unit_type VARCHAR(20) NOT NULL DEFAULT 'per_day' CHECK (unit_type IN ('per_night', 'per_day', 'per_session')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dogs table
CREATE TABLE dogs (
  id SERIAL PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  breed VARCHAR(100),
  age INT,
  weight DECIMAL(5, 1),
  sex VARCHAR(10) CHECK (sex IN ('male', 'female')),
  is_spayed_neutered BOOLEAN DEFAULT FALSE,
  photo_url TEXT,
  feeding_instructions TEXT,
  medications TEXT,
  behavior_notes TEXT,
  special_needs TEXT,
  vet_name VARCHAR(200),
  vet_phone VARCHAR(20),
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vaccinations table
CREATE TABLE vaccinations (
  id SERIAL PRIMARY KEY,
  dog_id INT NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  vaccine_name VARCHAR(100) NOT NULL,
  date_administered DATE,
  expiration_date DATE,
  document_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'missing' CHECK (status IN ('current', 'expiring_soon', 'expired', 'missing')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  kennel_id INT NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dog_id INT NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  service_id INT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'completed')),
  check_in_date DATE NOT NULL,
  check_out_date DATE,
  total_price DECIMAL(10, 2),
  notes TEXT,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_out_at TIMESTAMP WITH TIME ZONE,
  checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL,
  checked_out_by UUID REFERENCES users(id) ON DELETE SET NULL,
  room_id INT,
  payment_option VARCHAR(20) NOT NULL DEFAULT 'pay_later' CHECK (payment_option IN ('pay_now', 'pay_later')),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'deposit_paid', 'paid', 'partial')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kennel_id INT NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'full' CHECK (type IN ('full', 'deposit', 'balance', 'refund')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_payment_id VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alerts table
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  kennel_id INT NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('vaccination_expiring', 'vaccination_expired', 'booking_conflict', 'payment_due', 'check_in_reminder', 'capacity_warning', 'general')),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  severity VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  is_read BOOLEAN DEFAULT FALSE,
  related_dog_id INT REFERENCES dogs(id) ON DELETE SET NULL,
  related_booking_id INT REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rooms table
CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  kennel_id INT NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  building VARCHAR(100),
  size_type VARCHAR(20) NOT NULL DEFAULT 'mixed' CHECK (size_type IN ('small', 'medium', 'large', 'mixed', 'special_care')),
  capacity INT DEFAULT 1,
  notes TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Room assignment history table
CREATE TABLE room_assignment_history (
  id SERIAL PRIMARY KEY,
  room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  dog_id INT NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  removed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Kennel favorites table
CREATE TABLE kennel_favorites (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kennel_id INT NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, kennel_id)
);

-- Kennel required vaccines table
CREATE TABLE kennel_required_vaccines (
  id SERIAL PRIMARY KEY,
  kennel_id INT NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  vaccine_name VARCHAR(100) NOT NULL,
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Booking dogs join table (supports multiple dogs per booking)
CREATE TABLE booking_dogs (
  id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  dog_id INT NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  room_id INT REFERENCES rooms(id) ON DELETE SET NULL,
  UNIQUE(booking_id, dog_id)
);

-- Customer-kennel association table
CREATE TABLE customer_kennels (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kennel_id INT NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, kennel_id)
);

-- Checkout add-ons table (baths, nails, etc.)
CREATE TABLE checkout_add_ons (
  id SERIAL PRIMARY KEY,
  kennel_id INT NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Booking add-ons table (tracks selected add-ons for a booking)
CREATE TABLE booking_add_ons (
  id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  add_on_id INT NOT NULL REFERENCES checkout_add_ons(id) ON DELETE CASCADE,
  dog_id INT REFERENCES dogs(id) ON DELETE SET NULL,
  price DECIMAL(10, 2) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business hours table (per day of week)
CREATE TABLE business_hours (
  id SERIAL PRIMARY KEY,
  kennel_id INT NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time VARCHAR(10),
  close_time VARCHAR(10),
  is_closed BOOLEAN DEFAULT FALSE,
  UNIQUE(kennel_id, day_of_week)
);

-- Create indexes for common queries
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_kennel_id ON users(kennel_id);
CREATE INDEX idx_kennels_owner_id ON kennels(owner_id);
CREATE INDEX idx_services_kennel_id ON services(kennel_id);
CREATE INDEX idx_dogs_owner_id ON dogs(owner_id);
CREATE INDEX idx_vaccinations_dog_id ON vaccinations(dog_id);
CREATE INDEX idx_bookings_kennel_id ON bookings(kennel_id);
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_dog_id ON bookings(dog_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_alerts_kennel_id ON alerts(kennel_id);
CREATE INDEX idx_alerts_target_user_id ON alerts(target_user_id);
CREATE INDEX idx_rooms_kennel_id ON rooms(kennel_id);
CREATE INDEX idx_kennel_favorites_user_id ON kennel_favorites(user_id);
CREATE INDEX idx_customer_kennels_user_id ON customer_kennels(user_id);
CREATE INDEX idx_checkout_add_ons_kennel_id ON checkout_add_ons(kennel_id);
CREATE INDEX idx_booking_add_ons_booking_id ON booking_add_ons(booking_id);
CREATE INDEX idx_business_hours_kennel_id ON business_hours(kennel_id);
```

---

## Part 3: Row Level Security (RLS) Policies

RLS ensures users can only access their own data. Run this SQL in the Supabase SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE kennels ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE kennel_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE kennel_required_vaccines ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_kennels ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

-- Users: can read own profile, service role can update
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Service role can manage users" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- Kennels: owners can read/update own, customers can read public
CREATE POLICY "Owners can read own kennels" ON kennels
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Customers can read kennels with bookings" ON kennels
  FOR SELECT USING (
    id IN (SELECT kennel_id FROM bookings WHERE customer_id = auth.uid())
  );

CREATE POLICY "Owners can update own kennels" ON kennels
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Service role can manage kennels" ON kennels
  FOR ALL USING (auth.role() = 'service_role');

-- Services: anyone can read, owners can manage own
CREATE POLICY "Anyone can read services" ON services
  FOR SELECT USING (TRUE);

CREATE POLICY "Owners can manage own services" ON services
  FOR ALL USING (
    kennel_id IN (SELECT id FROM kennels WHERE owner_id = auth.uid())
  );

-- Dogs: customers can read own, employees/owners can read kennel dogs
CREATE POLICY "Customers can read own dogs" ON dogs
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Employees can read kennel dogs" ON dogs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee'
    )
  );

CREATE POLICY "Customers can create dogs" ON dogs
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Customers can update own dogs" ON dogs
  FOR UPDATE USING (owner_id = auth.uid());

-- Vaccinations: customers can read own, employees can read kennel dogs
CREATE POLICY "Customers can read own dog vaccinations" ON vaccinations
  FOR SELECT USING (
    dog_id IN (SELECT id FROM dogs WHERE owner_id = auth.uid())
  );

CREATE POLICY "Employees can read kennel dog vaccinations" ON vaccinations
  FOR SELECT USING (
    dog_id IN (
      SELECT dogs.id FROM dogs
      JOIN users ON users.kennel_id = (SELECT kennel_id FROM bookings WHERE dog_id = dogs.id LIMIT 1)
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Customers can manage own dog vaccinations" ON vaccinations
  FOR ALL USING (
    dog_id IN (SELECT id FROM dogs WHERE owner_id = auth.uid())
  );

-- Bookings: customers can read own, owners/employees can read kennel bookings
CREATE POLICY "Customers can read own bookings" ON bookings
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Owners can read kennel bookings" ON bookings
  FOR SELECT USING (
    kennel_id IN (SELECT id FROM kennels WHERE owner_id = auth.uid())
  );

CREATE POLICY "Employees can read kennel bookings" ON bookings
  FOR SELECT USING (
    kennel_id IN (SELECT kennel_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Customers can create bookings" ON bookings
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Owners can update kennel bookings" ON bookings
  FOR UPDATE USING (
    kennel_id IN (SELECT id FROM kennels WHERE owner_id = auth.uid())
  );

-- Payments: customers can read own, owners can read kennel payments
CREATE POLICY "Customers can read own payments" ON payments
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Owners can read kennel payments" ON payments
  FOR SELECT USING (
    kennel_id IN (SELECT id FROM kennels WHERE owner_id = auth.uid())
  );

-- Alerts: users can read own, owners can read kennel alerts
CREATE POLICY "Users can read own alerts" ON alerts
  FOR SELECT USING (target_user_id = auth.uid());

CREATE POLICY "Owners can read kennel alerts" ON alerts
  FOR SELECT USING (
    kennel_id IN (SELECT id FROM kennels WHERE owner_id = auth.uid())
  );

-- Rooms: owners/employees can read own kennel
CREATE POLICY "Owners can manage kennel rooms" ON rooms
  FOR ALL USING (
    kennel_id IN (SELECT id FROM kennels WHERE owner_id = auth.uid())
  );

CREATE POLICY "Employees can read kennel rooms" ON rooms
  FOR SELECT USING (
    kennel_id IN (SELECT kennel_id FROM users WHERE id = auth.uid())
  );

-- Room assignment history: owners/employees can read own kennel
CREATE POLICY "Owners can read room assignments" ON room_assignment_history
  FOR SELECT USING (
    room_id IN (
      SELECT id FROM rooms WHERE kennel_id IN (
        SELECT id FROM kennels WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Employees can read room assignments" ON room_assignment_history
  FOR SELECT USING (
    room_id IN (
      SELECT id FROM rooms WHERE kennel_id IN (
        SELECT kennel_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Kennel favorites: users can manage own
CREATE POLICY "Users can manage own favorites" ON kennel_favorites
  FOR ALL USING (user_id = auth.uid());

-- Customer kennels: users can manage own
CREATE POLICY "Users can manage own kennel associations" ON customer_kennels
  FOR ALL USING (user_id = auth.uid());

-- Checkout add-ons: anyone can read, owners can manage
CREATE POLICY "Anyone can read add-ons" ON checkout_add_ons
  FOR SELECT USING (TRUE);

CREATE POLICY "Owners can manage add-ons" ON checkout_add_ons
  FOR ALL USING (
    kennel_id IN (SELECT id FROM kennels WHERE owner_id = auth.uid())
  );

-- Booking add-ons: customers can read own, owners can read kennel
CREATE POLICY "Customers can read own booking add-ons" ON booking_add_ons
  FOR SELECT USING (
    booking_id IN (SELECT id FROM bookings WHERE customer_id = auth.uid())
  );

CREATE POLICY "Owners can read kennel booking add-ons" ON booking_add_ons
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings WHERE kennel_id IN (
        SELECT id FROM kennels WHERE owner_id = auth.uid()
      )
    )
  );

-- Business hours: anyone can read, owners can manage
CREATE POLICY "Anyone can read business hours" ON business_hours
  FOR SELECT USING (TRUE);

CREATE POLICY "Owners can manage business hours" ON business_hours
  FOR ALL USING (
    kennel_id IN (SELECT id FROM kennels WHERE owner_id = auth.uid())
  );
```

---

## Part 4: Supabase Storage Buckets

Go to **Storage** in your Supabase dashboard and create these buckets:

| Bucket Name | Public | Purpose |
|------------|--------|---------|
| `dog-photos` | Yes | Dog profile pictures |
| `vaccination-docs` | No | Vaccination certificates (private) |
| `kennel-logos` | Yes | Kennel branding images |

For each bucket:
1. Click "New Bucket"
2. Enter the name
3. Set "Public bucket" toggle as indicated above
4. Click "Create bucket"

---

## Part 5: Environment Variables

Create a `.env.local` file in your project root with these variables:

```bash
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend (server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres

# Stripe (keep existing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NODE_ENV=development
VITE_APP_TITLE=KennelSync
```

---

## Part 6: Code Changes Required

### 6.1 Backend Changes (server/)

**1. Replace database connection** (`server/_core/env.ts`):
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
```

**2. Replace authentication** (`server/_core/context.ts`):
- Remove Manus OAuth logic
- Use Supabase JWT from Authorization header
- Verify JWT with Supabase

**3. Replace database queries** (`server/db.ts`):
- Replace Drizzle MySQL queries with Supabase client queries
- Use snake_case column names (Postgres convention)

**4. Replace storage** (`server/storage.ts`):
- Replace S3 calls with Supabase Storage API
- Upload to appropriate buckets

### 6.2 Frontend Changes (client/)

**1. Replace authentication** (`client/src/_core/hooks/useAuth.ts`):
```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}
```

**2. Create Supabase client** (`client/src/lib/supabase.ts`):
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**3. Update login/signup** (`client/src/components/AppLayout.tsx`):
- Replace OAuth redirect with Supabase Auth form
- Use email/password instead of OAuth

---

## Part 7: Deployment

### Option A: Docker (Self-hosted)

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
```

Deploy to Railway, Render, or your own server.

### Option B: Vercel (Frontend) + Cloud Run (Backend)

- Deploy frontend to Vercel
- Deploy backend to Google Cloud Run
- Connect via API endpoints

### Option C: Docker Compose (Local Development)

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
      VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      DATABASE_URL: ${DATABASE_URL}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
```

---

## Part 8: Data Migration (if migrating from existing Manus deployment)

1. Export data from Manus MySQL database
2. Transform to match Supabase schema (UUID for users, snake_case columns)
3. Import to Supabase using SQL Editor or `psql`

---

## Part 9: Testing Checklist

- [ ] User sign-up works
- [ ] User login works
- [ ] Owner can create kennel
- [ ] Owner can manage services
- [ ] Customer can view kennels
- [ ] Customer can create booking
- [ ] Employee can check in/out dogs
- [ ] Payments work with Stripe
- [ ] File uploads work (dog photos, vaccination docs)
- [ ] Business hours display correctly
- [ ] Add-ons work end-to-end

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "JWT expired" errors | Check that SUPABASE_SERVICE_ROLE_KEY is correct |
| RLS blocks all queries | Verify RLS policies are created and auth.uid() is set |
| Storage uploads fail | Check bucket names and permissions |
| Auth state not persisting | Ensure localStorage is enabled in browser |

---

## Support

For Supabase documentation, visit [supabase.com/docs](https://supabase.com/docs).

For KennelSync issues, check the GitHub repository.
