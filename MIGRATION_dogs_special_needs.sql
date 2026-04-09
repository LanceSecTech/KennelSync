-- Optional: run in Supabase SQL Editor if `special_needs` is not already on `dogs`.
-- Required for persisting "Special needs" from Dog Profile (dog.update / dog.create).

ALTER TABLE dogs ADD COLUMN IF NOT EXISTS special_needs TEXT;
