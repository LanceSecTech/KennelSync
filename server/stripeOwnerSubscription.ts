import { stripe } from "./stripe";
import * as db from "./db";

const PRICE_ID = (process.env.STRIPE_OWNER_SUBSCRIPTION_PRICE_ID || "").trim();

export function getOwnerSubscriptionPriceId(): string {
  return PRICE_ID;
}

/** Ensures a Stripe Customer exists for this kennel; persists stripe_customer_id on the row. */
export async function ensureStripeCustomerForKennel(
  kennelId: number,
  billingEmail: string,
  kennelName: string,
): Promise<string | null> {
  if (!stripe) return null;
  const kennel = await db.getKennelById(kennelId);
  const existing = (kennel as Record<string, unknown>).stripe_customer_id ?? (kennel as Record<string, unknown>).stripeCustomerId;
  if (existing && String(existing).trim()) {
    return String(existing).trim();
  }
  const customer = await stripe.customers.create({
    email: billingEmail?.trim() || undefined,
    name: kennelName?.trim() || undefined,
    metadata: { kennel_id: String(kennelId) },
  });
  await db.updateKennel(kennelId, { stripe_customer_id: customer.id });
  return customer.id;
}

export async function createOwnerSubscriptionCheckoutSession(params: {
  kennelId: number;
  userId: string;
  userEmail: string | null | undefined;
  origin: string;
}): Promise<string | null> {
  if (!stripe || !PRICE_ID) {
    return null;
  }
  const kennel = await db.getKennelById(params.kennelId);
  const name = String((kennel as Record<string, unknown>).name || "Kennel");
  const custId = await ensureStripeCustomerForKennel(
    params.kennelId,
    params.userEmail?.trim() || "",
    name,
  );
  if (!custId) {
    return null;
  }
  const base = params.origin.replace(/\/$/, "");
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: custId,
    client_reference_id: params.userId,
    line_items: [{ price: PRICE_ID, quantity: 1 }],
    success_url: `${base}/app?subscription=success`,
    cancel_url: `${base}/app?subscription=cancelled`,
    metadata: {
      checkout_flow: "owner_subscription",
      kennel_id: String(params.kennelId),
      user_id: params.userId,
    },
    subscription_data: {
      metadata: {
        kennel_id: String(params.kennelId),
        user_id: params.userId,
      },
    },
  });
  return session.url;
}

/** Opens Stripe Customer Billing Portal for the kennel’s platform customer (SaaS subscription). */
export async function createOwnerBillingPortalSession(params: {
  kennelId: number;
  userEmail: string;
  kennelName: string;
  returnUrl: string;
}): Promise<string | null> {
  if (!stripe) return null;
  const custId = await ensureStripeCustomerForKennel(
    params.kennelId,
    params.userEmail?.trim() || "",
    params.kennelName?.trim() || "Kennel",
  );
  if (!custId) return null;
  const configuration = (process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID || "").trim() || undefined;
  const session = await stripe.billingPortal.sessions.create({
    customer: custId,
    return_url: params.returnUrl.replace(/\/$/, ""),
    ...(configuration ? { configuration } : {}),
  });
  return session.url;
}

/**
 * Cancels the KennelSync SaaS subscription at the end of the current billing period (Stripe default UX).
 * Requires a real `stripe_subscription_id` on the kennel row.
 */
export async function cancelOwnerSaaSSubscriptionAtPeriodEnd(kennelId: number): Promise<{
  cancelAtPeriodEnd: boolean;
  status: string;
}> {
  if (!stripe) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY).");
  }
  const kennel = await db.getKennelById(kennelId);
  const row = kennel as Record<string, unknown>;
  const subIdRaw = row.stripe_subscription_id ?? row.stripeSubscriptionId;
  const subId = subIdRaw != null ? String(subIdRaw).trim() : "";
  if (!subId || subId.includes("placeholder")) {
    throw new Error("No Stripe subscription is linked to this kennel. Use checkout to subscribe first.");
  }
  const updated = await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
  await db.updateKennel(kennelId, {
    subscription_status: updated.status,
  });
  return { cancelAtPeriodEnd: Boolean(updated.cancel_at_period_end), status: updated.status };
}
