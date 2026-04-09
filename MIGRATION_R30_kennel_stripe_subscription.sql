-- Kennel owner SaaS subscription (Stripe) columns on kennels
-- Run in Supabase SQL Editor after prior migrations.

ALTER TABLE kennels ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE kennels ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE kennels ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE kennels ADD COLUMN IF NOT EXISTS subscription_tier TEXT;
ALTER TABLE kennels ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_kennels_stripe_subscription_id ON kennels(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_kennels_stripe_customer_id ON kennels(stripe_customer_id);
