import { messageContainsStripeOwnerConnectCode } from "./stripeConnectOwnerTrpc";

/** Shown to pet parents when Connect isn’t ready or online pay can’t start. */
export const CUSTOMER_ONLINE_PAYMENT_UNAVAILABLE =
  "Online payment is not available for this kennel yet. Payment will be collected directly by the kennel.";

export const CUSTOMER_CHECKOUT_START_FAILED =
  "We couldn’t start online payment. Please try again in a moment, or arrange payment directly with the kennel.";

export const CUSTOMER_STRIPE_NOT_CONFIGURED =
  "Online payment isn’t available right now. Please contact the kennel to pay for your stay.";

/**
 * Never show internal owner Connect codes to customers (defense in depth).
 * If the payload looks like an owner-only encoded error, use the standard kennel fallback copy.
 */
export function customerSafePaymentErrorMessage(raw: string | undefined, fallback: string): string {
  const m = (raw ?? "").trim();
  if (messageContainsStripeOwnerConnectCode(m)) {
    return CUSTOMER_ONLINE_PAYMENT_UNAVAILABLE;
  }
  return m || fallback;
}
