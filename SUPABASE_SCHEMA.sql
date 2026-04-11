-- KennelSync Supabase Postgres Schema
-- Copy and paste this entire file into Supabase SQL Editor
-- This creates all tables, indexes, and Row Level Security policies

-- ============================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 2. USERS TABLE (linked to Supabase Auth)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'employee', 'customer')) DEFAULT 'customer',
  kennel_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Display name (sync from auth user_metadata.name via trigger / app; see MIGRATION_R31_users_display_name.sql)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT;

-- One-time onboarding gate (see MIGRATION_R32_users_onboarding_completed.sql)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_kennel_id ON users(kennel_id);

-- ============================================
-- 3. KENNELS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS kennels (
  id SERIAL PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  email TEXT,
  total_capacity INTEGER DEFAULT 10,
  policies TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kennels_owner_id ON kennels(owner_id);
CREATE INDEX IF NOT EXISTS idx_kennels_is_active ON kennels(is_active);

-- ============================================
-- 4. SERVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  kennel_id INTEGER NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('boarding', 'daycare', 'grooming')),
  price_per_unit DECIMAL(10, 2) NOT NULL,
  description TEXT,
  unit_type TEXT CHECK (unit_type IN ('per_night', 'per_day', 'per_session')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_services_kennel_id ON services(kennel_id);
CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);

-- ============================================
-- 5. DOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS dogs (
  id SERIAL PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kennel_id INTEGER REFERENCES kennels(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  breed TEXT,
  age INTEGER,
  weight DECIMAL(5, 2),
  birthday DATE,
  sex TEXT CHECK (sex IN ('male', 'female', NULL)),
  is_spayed_neutered BOOLEAN DEFAULT FALSE,
  photo_url TEXT,
  feeding_instructions TEXT,
  medications TEXT,
  behavior_notes TEXT,
  vet_name TEXT,
  vet_phone TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  special_needs TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dogs_owner_id ON dogs(owner_id);
CREATE INDEX IF NOT EXISTS idx_dogs_kennel_id ON dogs(kennel_id);
CREATE INDEX IF NOT EXISTS idx_dogs_name ON dogs(name);

-- ============================================
-- 6. VACCINATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vaccinations (
  id SERIAL PRIMARY KEY,
  dog_id INTEGER NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  date_administered DATE,
  expiration_date DATE NOT NULL,
  document_url TEXT,
  status TEXT DEFAULT 'current' CHECK (status IN ('current', 'expiring_soon', 'expired', 'missing')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vaccinations_dog_id ON vaccinations(dog_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_status ON vaccinations(status);
CREATE INDEX IF NOT EXISTS idx_vaccinations_expiration_date ON vaccinations(expiration_date);

-- ============================================
-- 7. BOOKINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  kennel_id INTEGER NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dog_id INTEGER NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'completed')) DEFAULT 'pending',
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'deposit_paid', 'paid', 'partial')),
  total_price DECIMAL(10, 2) NOT NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_out_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_kennel_id ON bookings(kennel_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dog_id ON bookings(dog_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in_date ON bookings(check_in_date);
CREATE INDEX IF NOT EXISTS idx_bookings_check_out_date ON bookings(check_out_date);

-- ============================================
-- 8. PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kennel_id INTEGER NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  stripe_payment_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_kennel_id ON payments(kennel_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_id ON payments(stripe_payment_id);

-- ============================================
-- 9. ROOMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  kennel_id INTEGER NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  building TEXT,
  size_type TEXT CHECK (size_type IN ('small', 'medium', 'large', 'mixed', 'special_care')),
  capacity INTEGER DEFAULT 1,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rooms_kennel_id ON rooms(kennel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_is_available ON rooms(is_available);

-- ============================================
-- 10. ROOM ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS room_assignments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  unassigned_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_room_assignments_booking_id ON room_assignments(booking_id);
CREATE INDEX IF NOT EXISTS idx_room_assignments_room_id ON room_assignments(room_id);

-- ============================================
-- 10b. ROOM ASSIGNMENT DAYS (per-calendar-day overrides)
-- ============================================
CREATE TABLE IF NOT EXISTS room_assignment_days (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  stay_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT room_assignment_days_booking_date_unique UNIQUE (booking_id, stay_date)
);

CREATE INDEX IF NOT EXISTS idx_room_assignment_days_booking_id ON room_assignment_days(booking_id);
CREATE INDEX IF NOT EXISTS idx_room_assignment_days_stay_date ON room_assignment_days(stay_date);
CREATE INDEX IF NOT EXISTS idx_room_assignment_days_room_id ON room_assignment_days(room_id);

-- ============================================
-- 11. CHECKOUT ADD-ONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS checkout_add_ons (
  id SERIAL PRIMARY KEY,
  kennel_id INTEGER NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_checkout_add_ons_kennel_id ON checkout_add_ons(kennel_id);
CREATE INDEX IF NOT EXISTS idx_checkout_add_ons_is_active ON checkout_add_ons(is_active);

-- ============================================
-- 12. BOOKING ADD-ONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS booking_add_ons (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  add_on_id INTEGER NOT NULL REFERENCES checkout_add_ons(id) ON DELETE CASCADE,
  dog_id INTEGER NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_booking_add_ons_booking_id ON booking_add_ons(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_add_ons_add_on_id ON booking_add_ons(add_on_id);
CREATE INDEX IF NOT EXISTS idx_booking_add_ons_dog_id ON booking_add_ons(dog_id);

-- ============================================
-- 13. BUSINESS HOURS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS business_hours (
  id SERIAL PRIMARY KEY,
  kennel_id INTEGER NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  is_closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(kennel_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_business_hours_kennel_id ON business_hours(kennel_id);

-- ============================================
-- 14. KENNEL FAVORITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS kennel_favorites (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kennel_id INTEGER NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, kennel_id)
);

CREATE INDEX IF NOT EXISTS idx_kennel_favorites_user_id ON kennel_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_kennel_favorites_kennel_id ON kennel_favorites(kennel_id);

-- ============================================
-- 14b. KENNEL REQUIRED VACCINES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS kennel_required_vaccines (
  id SERIAL PRIMARY KEY,
  kennel_id INTEGER NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(kennel_id, vaccine_name)
);

CREATE INDEX IF NOT EXISTS idx_kennel_required_vaccines_kennel_id ON kennel_required_vaccines(kennel_id);

ALTER TABLE kennel_required_vaccines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage required vaccines" ON kennel_required_vaccines;
DROP POLICY IF EXISTS "Anyone can view required vaccines" ON kennel_required_vaccines;

CREATE POLICY "Owners can manage required vaccines"
  ON kennel_required_vaccines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = kennel_required_vaccines.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view required vaccines"
  ON kennel_required_vaccines FOR SELECT
  USING (TRUE);

-- Dog badges + assignments (owner/employee operational metadata)
CREATE TABLE IF NOT EXISTS dog_badges (
  id SERIAL PRIMARY KEY,
  kennel_id INTEGER NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (kennel_id, key)
);

CREATE TABLE IF NOT EXISTS dog_badge_assignments (
  id SERIAL PRIMARY KEY,
  dog_id INTEGER NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (dog_id, badge_key)
);

-- Checkout discounts + booking discount audit
CREATE TABLE IF NOT EXISTS checkout_discounts (
  id SERIAL PRIMARY KEY,
  kennel_id INTEGER NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percent')),
  amount DECIMAL(10,2) NOT NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booking_discounts (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  discount_id INTEGER REFERENCES checkout_discounts(id) ON DELETE SET NULL,
  discount_name TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percent')),
  discount_amount DECIMAL(10,2) NOT NULL,
  discount_rate DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Owner SaaS subscription + trial on kennels (required for onboarding / ownerBilling.startTrial)
-- Idempotent; same as MIGRATION_R30_kennel_stripe_subscription.sql
ALTER TABLE kennels ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE kennels ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE kennels ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE kennels ADD COLUMN IF NOT EXISTS subscription_tier TEXT;
ALTER TABLE kennels ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_kennels_stripe_subscription_id ON kennels(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_kennels_stripe_customer_id ON kennels(stripe_customer_id);

-- ============================================
-- 15. CUSTOMER-KENNEL ASSOCIATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customer_kennel_associations (
  id SERIAL PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kennel_id INTEGER NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id, kennel_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_kennel_associations_customer_id ON customer_kennel_associations(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_kennel_associations_kennel_id ON customer_kennel_associations(kennel_id);

-- ============================================
-- 16. ALERTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  kennel_id INTEGER NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('vaccination_missing', 'vaccination_expired', 'vaccination_expiring_soon', 'booking_pending', 'payment_due', 'dog_info_incomplete')),
  dog_id INTEGER REFERENCES dogs(id) ON DELETE CASCADE,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_kennel_id ON alerts(kennel_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_is_resolved ON alerts(is_resolved);

-- ============================================
-- 17. AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id INTEGER,
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE kennels ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_assignment_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE kennel_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_kennel_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS RLS POLICIES
-- ============================================
-- Idempotent: allow re-running this script without 42710 policy errors
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Owners can view their own kennels" ON kennels;
DROP POLICY IF EXISTS "Employees can view their kennel" ON kennels;
DROP POLICY IF EXISTS "Customers can view kennels they have bookings with" ON kennels;
DROP POLICY IF EXISTS "Public can view active kennels" ON kennels;
DROP POLICY IF EXISTS "Owners can update their own kennels" ON kennels;
DROP POLICY IF EXISTS "Owners can create kennels" ON kennels;
DROP POLICY IF EXISTS "Anyone can view active services" ON services;
DROP POLICY IF EXISTS "Owners can view all services of their kennel" ON services;
DROP POLICY IF EXISTS "Owners can manage services of their kennel" ON services;
DROP POLICY IF EXISTS "Owners can update services of their kennel" ON services;
DROP POLICY IF EXISTS "Owners can delete services of their kennel" ON services;
DROP POLICY IF EXISTS "Customers can view their own dogs" ON dogs;
DROP POLICY IF EXISTS "Employees can view dogs in their kennel" ON dogs;
DROP POLICY IF EXISTS "Customers can create dogs" ON dogs;
DROP POLICY IF EXISTS "Customers can update their own dogs" ON dogs;
DROP POLICY IF EXISTS "Customers can view their dog's vaccinations" ON vaccinations;
DROP POLICY IF EXISTS "Employees can view vaccinations of dogs in their kennel" ON vaccinations;
DROP POLICY IF EXISTS "Customers can manage their dog's vaccinations" ON vaccinations;
DROP POLICY IF EXISTS "Customers can update their dog's vaccinations" ON vaccinations;
DROP POLICY IF EXISTS "Customers can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Owners can view bookings for their kennel" ON bookings;
DROP POLICY IF EXISTS "Employees can view bookings for their kennel" ON bookings;
DROP POLICY IF EXISTS "Customers can create bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can update their own bookings" ON bookings;
DROP POLICY IF EXISTS "Owners can update bookings for their kennel" ON bookings;
DROP POLICY IF EXISTS "Employees can update bookings for their kennel" ON bookings;
DROP POLICY IF EXISTS "Customers can view their own payments" ON payments;
DROP POLICY IF EXISTS "Owners can view payments for their kennel" ON payments;
DROP POLICY IF EXISTS "Customers can create payments" ON payments;
DROP POLICY IF EXISTS "Owners can update payments for their kennel" ON payments;
DROP POLICY IF EXISTS "Owners can view rooms of their kennel" ON rooms;
DROP POLICY IF EXISTS "Employees can view rooms of their kennel" ON rooms;
DROP POLICY IF EXISTS "Owners can manage rooms of their kennel" ON rooms;
DROP POLICY IF EXISTS "Owners can update rooms of their kennel" ON rooms;
DROP POLICY IF EXISTS "Owners can view room assignments for their kennel" ON room_assignments;
DROP POLICY IF EXISTS "Employees can view room assignments for their kennel" ON room_assignments;
DROP POLICY IF EXISTS "Owners can manage room assignments for their kennel" ON room_assignments;
DROP POLICY IF EXISTS "Owners can view room_assignment_days for their kennel" ON room_assignment_days;
DROP POLICY IF EXISTS "Employees can view room_assignment_days for their kennel" ON room_assignment_days;
DROP POLICY IF EXISTS "Owners can manage room_assignment_days for their kennel" ON room_assignment_days;
DROP POLICY IF EXISTS "Anyone can view active add-ons" ON checkout_add_ons;
DROP POLICY IF EXISTS "Owners can view all add-ons of their kennel" ON checkout_add_ons;
DROP POLICY IF EXISTS "Owners can manage add-ons of their kennel" ON checkout_add_ons;
DROP POLICY IF EXISTS "Owners can update add-ons of their kennel" ON checkout_add_ons;
DROP POLICY IF EXISTS "Owners can delete add-ons of their kennel" ON checkout_add_ons;
DROP POLICY IF EXISTS "Customers can view add-ons of their bookings" ON booking_add_ons;
DROP POLICY IF EXISTS "Owners can view add-ons of bookings for their kennel" ON booking_add_ons;
DROP POLICY IF EXISTS "Employees can view add-ons of bookings for their kennel" ON booking_add_ons;
DROP POLICY IF EXISTS "Customers can create add-ons for their bookings" ON booking_add_ons;
DROP POLICY IF EXISTS "Employees can manage add-ons for bookings in their kennel" ON booking_add_ons;
DROP POLICY IF EXISTS "Employees can update add-ons for bookings in their kennel" ON booking_add_ons;
DROP POLICY IF EXISTS "Anyone can view business hours" ON business_hours;
DROP POLICY IF EXISTS "Owners can manage business hours for their kennel" ON business_hours;
DROP POLICY IF EXISTS "Owners can update business hours for their kennel" ON business_hours;
DROP POLICY IF EXISTS "Users can view their own favorites" ON kennel_favorites;
DROP POLICY IF EXISTS "Users can add favorites" ON kennel_favorites;
DROP POLICY IF EXISTS "Users can remove their own favorites" ON kennel_favorites;
DROP POLICY IF EXISTS "Customers can view their kennel associations" ON customer_kennel_associations;
DROP POLICY IF EXISTS "Owners can view customer associations for their kennel" ON customer_kennel_associations;
DROP POLICY IF EXISTS "System can create customer associations" ON customer_kennel_associations;
DROP POLICY IF EXISTS "Owners can view alerts for their kennel" ON alerts;
DROP POLICY IF EXISTS "Employees can view alerts for their kennel" ON alerts;
DROP POLICY IF EXISTS "System can create alerts" ON alerts;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can create audit logs" ON audit_logs;

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- KENNELS RLS POLICIES
-- ============================================
CREATE POLICY "Owners can view their own kennels"
  ON kennels FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Employees can view their kennel"
  ON kennels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.kennel_id = kennels.id
      AND users.role = 'employee'
    )
  );

CREATE POLICY "Customers can view kennels they have bookings with"
  ON kennels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customer_kennel_associations
      WHERE customer_kennel_associations.customer_id = auth.uid()
      AND customer_kennel_associations.kennel_id = kennels.id
    )
  );

CREATE POLICY "Public can view active kennels"
  ON kennels FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Owners can update their own kennels"
  ON kennels FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can create kennels"
  ON kennels FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- ============================================
-- SERVICES RLS POLICIES
-- ============================================
CREATE POLICY "Anyone can view active services"
  ON services FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Owners can view all services of their kennel"
  ON services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = services.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage services of their kennel"
  ON services FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = services.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update services of their kennel"
  ON services FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = services.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete services of their kennel"
  ON services FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = services.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

-- ============================================
-- DOGS RLS POLICIES
-- ============================================
CREATE POLICY "Customers can view their own dogs"
  ON dogs FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Employees can view dogs in their kennel"
  ON dogs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.kennel_id = dogs.kennel_id
      AND users.role = 'employee'
    )
  );

CREATE POLICY "Customers can create dogs"
  ON dogs FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Customers can update their own dogs"
  ON dogs FOR UPDATE
  USING (auth.uid() = owner_id);

-- ============================================
-- VACCINATIONS RLS POLICIES
-- ============================================
CREATE POLICY "Customers can view their dog's vaccinations"
  ON vaccinations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dogs
      WHERE dogs.id = vaccinations.dog_id
      AND dogs.owner_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view vaccinations of dogs in their kennel"
  ON vaccinations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dogs
      WHERE dogs.id = vaccinations.dog_id
      AND dogs.kennel_id = (
        SELECT kennel_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Customers can manage their dog's vaccinations"
  ON vaccinations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dogs
      WHERE dogs.id = vaccinations.dog_id
      AND dogs.owner_id = auth.uid()
    )
  );

CREATE POLICY "Customers can update their dog's vaccinations"
  ON vaccinations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM dogs
      WHERE dogs.id = vaccinations.dog_id
      AND dogs.owner_id = auth.uid()
    )
  );

-- ============================================
-- BOOKINGS RLS POLICIES
-- ============================================
CREATE POLICY "Customers can view their own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Owners can view bookings for their kennel"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = bookings.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view bookings for their kennel"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.kennel_id = bookings.kennel_id
      AND users.role = 'employee'
    )
  );

CREATE POLICY "Customers can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their own bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = customer_id);

CREATE POLICY "Owners can update bookings for their kennel"
  ON bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = bookings.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Employees can update bookings for their kennel"
  ON bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.kennel_id = bookings.kennel_id
      AND users.role = 'employee'
    )
  );

-- ============================================
-- PAYMENTS RLS POLICIES
-- ============================================
CREATE POLICY "Customers can view their own payments"
  ON payments FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Owners can view payments for their kennel"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = payments.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Customers can create payments"
  ON payments FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Owners can update payments for their kennel"
  ON payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = payments.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

-- ============================================
-- ROOMS RLS POLICIES
-- ============================================
CREATE POLICY "Owners can view rooms of their kennel"
  ON rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = rooms.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view rooms of their kennel"
  ON rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.kennel_id = rooms.kennel_id
      AND users.role = 'employee'
    )
  );

CREATE POLICY "Owners can manage rooms of their kennel"
  ON rooms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = rooms.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update rooms of their kennel"
  ON rooms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = rooms.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

-- ============================================
-- ROOM ASSIGNMENTS RLS POLICIES
-- ============================================
CREATE POLICY "Owners can view room assignments for their kennel"
  ON room_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = room_assignments.booking_id
      AND EXISTS (
        SELECT 1 FROM kennels
        WHERE kennels.id = bookings.kennel_id
        AND kennels.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Employees can view room assignments for their kennel"
  ON room_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = room_assignments.booking_id
      AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.kennel_id = bookings.kennel_id
        AND users.role = 'employee'
      )
    )
  );

CREATE POLICY "Owners can manage room assignments for their kennel"
  ON room_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = room_assignments.booking_id
      AND EXISTS (
        SELECT 1 FROM kennels
        WHERE kennels.id = bookings.kennel_id
        AND kennels.owner_id = auth.uid()
      )
    )
  );

-- ============================================
-- ROOM ASSIGNMENT DAYS RLS POLICIES
-- ============================================
CREATE POLICY "Owners can view room_assignment_days for their kennel"
  ON room_assignment_days FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE kennel_id IN (SELECT id FROM kennels WHERE owner_id = auth.uid())
    )
  );

CREATE POLICY "Employees can view room_assignment_days for their kennel"
  ON room_assignment_days FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE kennel_id IN (SELECT kennel_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Owners can manage room_assignment_days for their kennel"
  ON room_assignment_days FOR ALL
  USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE kennel_id IN (SELECT id FROM kennels WHERE owner_id = auth.uid())
    )
  );

-- ============================================
-- CHECKOUT ADD-ONS RLS POLICIES
-- ============================================
CREATE POLICY "Anyone can view active add-ons"
  ON checkout_add_ons FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Owners can view all add-ons of their kennel"
  ON checkout_add_ons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = checkout_add_ons.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage add-ons of their kennel"
  ON checkout_add_ons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = checkout_add_ons.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update add-ons of their kennel"
  ON checkout_add_ons FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = checkout_add_ons.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete add-ons of their kennel"
  ON checkout_add_ons FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = checkout_add_ons.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

-- ============================================
-- BOOKING ADD-ONS RLS POLICIES
-- ============================================
CREATE POLICY "Customers can view add-ons of their bookings"
  ON booking_add_ons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_add_ons.booking_id
      AND bookings.customer_id = auth.uid()
    )
  );

CREATE POLICY "Owners can view add-ons of bookings for their kennel"
  ON booking_add_ons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_add_ons.booking_id
      AND EXISTS (
        SELECT 1 FROM kennels
        WHERE kennels.id = bookings.kennel_id
        AND kennels.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Employees can view add-ons of bookings for their kennel"
  ON booking_add_ons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_add_ons.booking_id
      AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.kennel_id = bookings.kennel_id
        AND users.role = 'employee'
      )
    )
  );

CREATE POLICY "Customers can create add-ons for their bookings"
  ON booking_add_ons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_add_ons.booking_id
      AND bookings.customer_id = auth.uid()
    )
  );

CREATE POLICY "Employees can manage add-ons for bookings in their kennel"
  ON booking_add_ons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_add_ons.booking_id
      AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.kennel_id = bookings.kennel_id
        AND users.role = 'employee'
      )
    )
  );

CREATE POLICY "Employees can update add-ons for bookings in their kennel"
  ON booking_add_ons FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_add_ons.booking_id
      AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.kennel_id = bookings.kennel_id
        AND users.role = 'employee'
      )
    )
  );

-- ============================================
-- BUSINESS HOURS RLS POLICIES
-- ============================================
CREATE POLICY "Anyone can view business hours"
  ON business_hours FOR SELECT
  USING (TRUE);

CREATE POLICY "Owners can manage business hours for their kennel"
  ON business_hours FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = business_hours.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update business hours for their kennel"
  ON business_hours FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = business_hours.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

-- ============================================
-- KENNEL FAVORITES RLS POLICIES
-- ============================================
CREATE POLICY "Users can view their own favorites"
  ON kennel_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
  ON kennel_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites"
  ON kennel_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- CUSTOMER-KENNEL ASSOCIATIONS RLS POLICIES
-- ============================================
CREATE POLICY "Customers can view their kennel associations"
  ON customer_kennel_associations FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Owners can view customer associations for their kennel"
  ON customer_kennel_associations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = customer_kennel_associations.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

CREATE POLICY "System can create customer associations"
  ON customer_kennel_associations FOR INSERT
  WITH CHECK (TRUE);

-- ============================================
-- ALERTS RLS POLICIES
-- ============================================
CREATE POLICY "Owners can view alerts for their kennel"
  ON alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = alerts.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view alerts for their kennel"
  ON alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.kennel_id = alerts.kennel_id
      AND users.role = 'employee'
    )
  );

CREATE POLICY "System can create alerts"
  ON alerts FOR INSERT
  WITH CHECK (TRUE);

-- ============================================
-- AUDIT LOGS RLS POLICIES
-- ============================================
CREATE POLICY "Users can view their own audit logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (TRUE);

-- ============================================
-- DONE
-- ============================================
-- All tables, indexes, and RLS policies have been created.
-- You can now proceed with setting up Supabase Storage buckets and environment variables.

-- ============================================
-- MIGRATION: Add missing columns to existing databases
-- Run these if you already have the schema applied and need to add new columns
-- ============================================

-- Add description and unit_type to services (if not already present)
ALTER TABLE services ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS unit_type TEXT CHECK (unit_type IN ('per_night', 'per_day', 'per_session'));

-- Add notes column to rooms (if not already present)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create kennel_required_vaccines table (if not already present)
CREATE TABLE IF NOT EXISTS kennel_required_vaccines (
  id SERIAL PRIMARY KEY,
  kennel_id INTEGER NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(kennel_id, vaccine_name)
);

CREATE INDEX IF NOT EXISTS idx_kennel_required_vaccines_kennel_id ON kennel_required_vaccines(kennel_id);

ALTER TABLE kennel_required_vaccines ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Owners can manage required vaccines" ON kennel_required_vaccines;
DROP POLICY IF EXISTS "Anyone can view required vaccines" ON kennel_required_vaccines;

CREATE POLICY "Owners can manage required vaccines"
  ON kennel_required_vaccines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM kennels
      WHERE kennels.id = kennel_required_vaccines.kennel_id
      AND kennels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view required vaccines"
  ON kennel_required_vaccines FOR SELECT
  USING (TRUE);
