-- ============================================================
-- KennelSync — Migration R28: add dogs.birthday
-- Run in Supabase SQL Editor, then reload API schema.
-- ============================================================

ALTER TABLE public.dogs
  ADD COLUMN IF NOT EXISTS birthday DATE;

CREATE INDEX IF NOT EXISTS idx_dogs_birthday ON public.dogs(birthday);
