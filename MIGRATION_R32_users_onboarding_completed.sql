-- Persist onboarding completion per account (survives new device / cleared localStorage).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.users.onboarding_completed IS 'Set true when the user finishes the in-app onboarding flow once.';
