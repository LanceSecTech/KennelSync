-- ============================================================
-- KennelSync / PawSuite — Migration R26: booking_dogs join table
-- Run in Supabase: Dashboard → SQL Editor → New query → Run
--
-- Required for multi-dog bookings: extra dogs are stored here;
-- bookings.dog_id remains the "primary" dog for legacy joins.
-- Safe to run once; uses IF NOT EXISTS where applicable.
-- After running: Settings → API → Reload schema (or wait ~1 min).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.booking_dogs (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  dog_id INTEGER NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  room_id INTEGER REFERENCES public.rooms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT booking_dogs_booking_dog_unique UNIQUE (booking_id, dog_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_dogs_booking_id ON public.booking_dogs(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_dogs_dog_id ON public.booking_dogs(dog_id);

ALTER TABLE public.booking_dogs ENABLE ROW LEVEL SECURITY;

-- Service role (used by the app server) bypasses RLS; policies cover direct client access.

DROP POLICY IF EXISTS "Customers can read own booking_dogs" ON public.booking_dogs;
DROP POLICY IF EXISTS "Customers can insert own booking_dogs" ON public.booking_dogs;
DROP POLICY IF EXISTS "Customers can delete own booking_dogs" ON public.booking_dogs;
DROP POLICY IF EXISTS "Owners can manage kennel booking_dogs" ON public.booking_dogs;
DROP POLICY IF EXISTS "Employees can read kennel booking_dogs" ON public.booking_dogs;

CREATE POLICY "Customers can read own booking_dogs"
  ON public.booking_dogs
  FOR SELECT
  USING (
    booking_id IN (SELECT id FROM public.bookings WHERE customer_id = auth.uid())
  );

CREATE POLICY "Customers can insert own booking_dogs"
  ON public.booking_dogs
  FOR INSERT
  WITH CHECK (
    booking_id IN (SELECT id FROM public.bookings WHERE customer_id = auth.uid())
    AND dog_id IN (SELECT id FROM public.dogs WHERE owner_id = auth.uid())
  );

CREATE POLICY "Customers can delete own booking_dogs"
  ON public.booking_dogs
  FOR DELETE
  USING (
    booking_id IN (SELECT id FROM public.bookings WHERE customer_id = auth.uid())
  );

CREATE POLICY "Owners can manage kennel booking_dogs"
  ON public.booking_dogs
  FOR ALL
  USING (
    booking_id IN (
      SELECT id FROM public.bookings
      WHERE kennel_id IN (SELECT id FROM public.kennels WHERE owner_id = auth.uid())
    )
  );

CREATE POLICY "Employees can read kennel booking_dogs"
  ON public.booking_dogs
  FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM public.bookings
      WHERE kennel_id IN (SELECT kennel_id FROM public.users WHERE id = auth.uid())
    )
  );

-- ============================================================
-- After this migration:
-- 1. Multi-dog booking create (booking_dogs inserts) will succeed.
-- 2. API enrichment loads all dog names for owner/employee/customer lists.
-- ============================================================
