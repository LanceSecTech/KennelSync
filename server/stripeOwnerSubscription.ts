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
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }
  if (!PRICE_ID) {
    throw new Error("STRIPE_OWNER_SUBSCRIPTION_PRICE_ID is not set");
  }
  const kennel = await db.getKennelById(params.kennelId);
  const name = String((kennel as Record<string, unknown>).name || "Kennel");
  const custId = await ensureStripeCustomerForKennel(
    params.kennelId,
    params.userEmail?.trim() || "",
    name,
  );
  if (!custId) {
    throw new Error("Could not create or load Stripe customer for kennel");
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
