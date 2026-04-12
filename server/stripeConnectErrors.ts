/**
 * Maps Stripe Connect onboarding/API errors to owner-safe copy.
 * Never forward raw Stripe messages to the client.
 */

/** @deprecated Prefer actionable UI in KennelStripeConnectCard; kept for generic error `detail` text. */
export const OWNER_STRIPE_CONNECT_PLATFORM_SETUP_MESSAGE =
  "Online payouts are not ready yet. Please complete Stripe platform payout setup in the Stripe Dashboard (Connect → Settings) before connecting owner payout accounts. After your platform is configured, use “Link bank account with Stripe” below to try again.";

export const OWNER_STRIPE_CONNECT_GENERIC_MESSAGE =
  "We couldn’t open Stripe Connect onboarding. Please try again in a few minutes. If this keeps happening, contact support.";

function collectStripeText(err: unknown): string {
  const e = err as {
    message?: string;
    raw?: { message?: string };
    detail?: string;
  };
  const parts = [e?.message, e?.raw?.message, e?.detail].filter(Boolean).map((s) => String(s).toLowerCase());
  return parts.join(" ");
}

/** Stripe blocks Express onboarding until platform accepts Connect loss liability / terms. */
export function isPlatformConnectTermsError(err: unknown): boolean {
  const t = collectStripeText(err);
  if (!t) return false;
  return (
    (t.includes("loss") && (t.includes("connected") || t.includes("connect"))) ||
    (t.includes("responsibilit") && t.includes("connected")) ||
    t.includes("losses for connected") ||
    (t.includes("platform") && t.includes("terms") && t.includes("connect"))
  );
}

export function ownerFacingStripeConnectMessage(err: unknown): string {
  if (isPlatformConnectTermsError(err)) {
    return OWNER_STRIPE_CONNECT_PLATFORM_SETUP_MESSAGE;
  }
  const t = collectStripeText(err);
  if (t.includes("verification") && t.includes("required")) {
    return "Stripe needs additional verification for your platform account before Connect onboarding can continue. Check the Stripe Dashboard, then try again.";
  }
  if (t.includes("invalid") && t.includes("country")) {
    return "Stripe rejected the account country setting. Check STRIPE_CONNECT_DEFAULT_COUNTRY and your Stripe account settings, then try again.";
  }
  return OWNER_STRIPE_CONNECT_GENERIC_MESSAGE;
}
