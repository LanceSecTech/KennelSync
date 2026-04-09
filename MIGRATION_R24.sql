-- ============================================================
-- PawSuite Migration R24
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- ============================================================

-- 1. Add description and unit_type columns to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS unit_type TEXT CHECK (unit_type IN ('per_night', 'per_day', 'per_session'));

-- 2. Add notes column to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Create kennel_required_vaccines table
CREATE TABLE IF NOT EXISTS kennel_required_vaccines (
  id SERIAL PRIMARY KEY,
  kennel_id INTEGER NOT NULL REFERENCES kennels(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(kennel_id, vaccine_name)
);

CREATE INDEX IF NOT EXISTS idx_kennel_required_vaccines_kennel_id ON kennel_required_vaccines(kennel_id);

ALTER TABLE kennel_required_vaccines ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid duplicate errors
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

-- ============================================================
-- After running this migration:
-- 1. Service creation will support description and unit_type fields
-- 2. Required vaccines feature will be fully functional
-- 3. Room creation will support notes field
-- ============================================================
