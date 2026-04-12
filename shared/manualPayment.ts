/** Recorded when staff mark a booking paid outside Stripe Checkout / saved card. */
export const MANUAL_PAYMENT_METHODS = [
  "cash",
  "card_in_person",
  "owner_external_processor",
  "bank_transfer",
  "check",
  "other",
] as const;

export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

export const MANUAL_PAYMENT_LABELS: Record<ManualPaymentMethod, string> = {
  cash: "Cash",
  card_in_person: "Card (in person)",
  owner_external_processor: "External / Square / other processor",
  bank_transfer: "Bank transfer (ACH / wire)",
  check: "Check",
  other: "Other",
};
