-- R29: Dog badges, owner discounts, checkout discount records, Stripe customer id.

ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

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

CREATE INDEX IF NOT EXISTS idx_dog_badges_kennel_id ON dog_badges(kennel_id);

CREATE TABLE IF NOT EXISTS dog_badge_assignments (
  id SERIAL PRIMARY KEY,
  dog_id INTEGER NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (dog_id, badge_key)
);

CREATE INDEX IF NOT EXISTS idx_dog_badge_assignments_dog_id ON dog_badge_assignments(dog_id);

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

CREATE INDEX IF NOT EXISTS idx_checkout_discounts_kennel_id ON checkout_discounts(kennel_id);
CREATE INDEX IF NOT EXISTS idx_checkout_discounts_is_active ON checkout_discounts(is_active);

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

CREATE INDEX IF NOT EXISTS idx_booking_discounts_booking_id ON booking_discounts(booking_id);

ALTER TABLE dog_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE dog_badge_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_discounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view dog badges" ON dog_badges;
CREATE POLICY "Staff can view dog badges"
  ON dog_badges FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM kennels WHERE kennels.id = dog_badges.kennel_id AND kennels.owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'employee'
        AND users.kennel_id = dog_badges.kennel_id
    )
  );

DROP POLICY IF EXISTS "Owners can manage dog badges" ON dog_badges;
CREATE POLICY "Owners can manage dog badges"
  ON dog_badges FOR ALL
  USING (
    EXISTS (SELECT 1 FROM kennels WHERE kennels.id = dog_badges.kennel_id AND kennels.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Staff can view dog badge assignments" ON dog_badge_assignments;
CREATE POLICY "Staff can view dog badge assignments"
  ON dog_badge_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dogs d
      JOIN kennels k ON k.id = d.kennel_id
      WHERE d.id = dog_badge_assignments.dog_id
        AND k.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM dogs d
      JOIN users u ON u.kennel_id = d.kennel_id
      WHERE d.id = dog_badge_assignments.dog_id
        AND u.id = auth.uid()
        AND u.role = 'employee'
    )
  );

DROP POLICY IF EXISTS "Owners can manage dog badge assignments" ON dog_badge_assignments;
CREATE POLICY "Owners can manage dog badge assignments"
  ON dog_badge_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM dogs d
      JOIN kennels k ON k.id = d.kennel_id
      WHERE d.id = dog_badge_assignments.dog_id
        AND k.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can view checkout discounts" ON checkout_discounts;
CREATE POLICY "Staff can view checkout discounts"
  ON checkout_discounts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM kennels WHERE kennels.id = checkout_discounts.kennel_id AND kennels.owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'employee'
        AND users.kennel_id = checkout_discounts.kennel_id
    )
  );

DROP POLICY IF EXISTS "Owners can manage checkout discounts" ON checkout_discounts;
CREATE POLICY "Owners can manage checkout discounts"
  ON checkout_discounts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM kennels WHERE kennels.id = checkout_discounts.kennel_id AND kennels.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Staff can view booking discounts" ON booking_discounts;
CREATE POLICY "Staff can view booking discounts"
  ON booking_discounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN kennels k ON k.id = b.kennel_id
      WHERE b.id = booking_discounts.booking_id
        AND k.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM bookings b
      JOIN users u ON u.kennel_id = b.kennel_id
      WHERE b.id = booking_discounts.booking_id
        AND u.id = auth.uid()
        AND u.role = 'employee'
    )
  );

DROP POLICY IF EXISTS "Owners can manage booking discounts" ON booking_discounts;
CREATE POLICY "Owners can manage booking discounts"
  ON booking_discounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN kennels k ON k.id = b.kennel_id
      WHERE b.id = booking_discounts.booking_id
        AND k.owner_id = auth.uid()
    )
  );
