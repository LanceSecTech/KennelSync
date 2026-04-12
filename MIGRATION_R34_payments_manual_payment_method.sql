-- Optional column for staff-recorded offline payments (checkout or “mark paid”).
-- Run in Supabase SQL Editor if not already applied.

ALTER TABLE payments ADD COLUMN IF NOT EXISTS manual_payment_method TEXT;

COMMENT ON COLUMN payments.manual_payment_method IS
  'When set, payment was recorded offline: cash, card_in_person, owner_external_processor, bank_transfer, check, other';
