-- Stripe Connect: customer booking payouts to kennel owners (Express connected accounts).
-- Run in Supabase SQL Editor; then Settings → API → Reload schema if needed.

ALTER TABLE public.kennels ADD COLUMN IF NOT EXISTS stripe_connected_account_id TEXT;
ALTER TABLE public.kennels ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.kennels ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.kennels ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_kennels_stripe_connected_account_id
  ON public.kennels (stripe_connected_account_id)
  WHERE stripe_connected_account_id IS NOT NULL AND trim(stripe_connected_account_id) <> '';

COMMENT ON COLUMN public.kennels.stripe_connected_account_id IS 'Stripe Connect Express account id (acct_...) for receiving booking payments.';
COMMENT ON COLUMN public.kennels.stripe_connect_charges_enabled IS 'Synced from Stripe account.updated; true when the connected account can accept charges.';
COMMENT ON COLUMN public.kennels.stripe_connect_payouts_enabled IS 'Synced from Stripe; true when Stripe can pay out to the connected account bank.';
COMMENT ON COLUMN public.kennels.stripe_connect_details_submitted IS 'Synced from Stripe; onboarding form submitted (may still be pending verification).';
