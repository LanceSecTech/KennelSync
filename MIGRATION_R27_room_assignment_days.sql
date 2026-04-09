-- ============================================================
-- KennelSync — Migration R27: per-day room placement overrides
-- Run in Supabase: SQL Editor → New query → Run
--
-- Calendar "move dog" writes here so one day can differ from the
-- stay-wide default in room_assignments.
-- Safe to run once; uses IF NOT EXISTS where applicable.
-- After running: Settings → API → Reload schema (or wait ~1 min).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.room_assignment_days (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  room_id INTEGER NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  stay_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT room_assignment_days_booking_date_unique UNIQUE (booking_id, stay_date)
);

CREATE INDEX IF NOT EXISTS idx_room_assignment_days_booking_id ON public.room_assignment_days(booking_id);
CREATE INDEX IF NOT EXISTS idx_room_assignment_days_stay_date ON public.room_assignment_days(stay_date);
CREATE INDEX IF NOT EXISTS idx_room_assignment_days_room_id ON public.room_assignment_days(room_id);

ALTER TABLE public.room_assignment_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view room_assignment_days for their kennel" ON public.room_assignment_days;
DROP POLICY IF EXISTS "Employees can view room_assignment_days for their kennel" ON public.room_assignment_days;
DROP POLICY IF EXISTS "Owners can manage room_assignment_days for their kennel" ON public.room_assignment_days;

CREATE POLICY "Owners can view room_assignment_days for their kennel"
  ON public.room_assignment_days
  FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM public.bookings
      WHERE kennel_id IN (SELECT id FROM public.kennels WHERE owner_id = auth.uid())
    )
  );

CREATE POLICY "Employees can view room_assignment_days for their kennel"
  ON public.room_assignment_days
  FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM public.bookings
      WHERE kennel_id IN (SELECT kennel_id FROM public.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Owners can manage room_assignment_days for their kennel"
  ON public.room_assignment_days
  FOR ALL
  USING (
    booking_id IN (
      SELECT id FROM public.bookings
      WHERE kennel_id IN (SELECT id FROM public.kennels WHERE owner_id = auth.uid())
    )
  );

-- ============================================================
-- After this migration:
-- 1. room.dailyAvailability uses overrides per stay_date.
-- 2. room.assignForDay upserts into this table (API uses service role).
-- ============================================================
