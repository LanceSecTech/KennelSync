/**
 * Stripe Connect (Express) for routing customer booking Checkout to kennel owners.
 *
 * Separated from:
 * - `stripeOwnerSubscription.ts` — KennelSync SaaS subscription (Checkout on platform customer).
 * - `payment.createCheckoutSession` — Customer booking pay; uses destination charges when Connect is ready.
 */
import type Stripe from "stripe";
import { stripe } from "./stripe";
import * as db from "./db";

function kennelRowAccountId(row: Record<string, unknown>): string | null {
  const v = row.stripe_connected_account_id ?? row.stripeConnectedAccountId;
  if (v == null || String(v).trim() === "") return null;
  return String(v).trim();
}

export function stripeConnectModuleAvailable(): boolean {
  return Boolean(stripe);
}

/** Basis points (1/100 of 1%). Example: 250 = 2.5% platform fee on booking Checkout. */
export function connectApplicationFeeCents(totalCents: number): number {
  const raw = (process.env.STRIPE_CONNECT_APPLICATION_FEE_BPS || "").trim();
  const bps = parseInt(raw, 10);
  if (!Number.isFinite(bps) || bps <= 0) return 0;
  const fee = Math.floor((totalCents * bps) / 10_000);
  const maxFee = Math.max(0, totalCents - 50);
  return Math.min(fee, maxFee);
}

/** Shown in owner Connect UI; customer booking Checkout always requires a Connect-ready kennel (see payment.createCheckoutSession). */
export function bookingPaymentsRequireConnect(): boolean {
  return String(process.env.STRIPE_CONNECT_REQUIRED_FOR_BOOKINGS || "")
    .trim()
    .toLowerCase() === "true";
}

export function mapStripeAccountToKennelConnectFields(acct: Stripe.Account): Record<string, unknown> {
  return {
    stripe_connect_charges_enabled: Boolean(acct.charges_enabled),
    stripe_connect_payouts_enabled: Boolean(acct.payouts_enabled),
    stripe_connect_details_submitted: Boolean(acct.details_submitted),
  };
}

export async function syncConnectAccountFromStripe(connectedAccountId: string): Promise<void> {
  if (!stripe) return;
  const acct = await stripe.accounts.retrieve(connectedAccountId);
  const kennel = await db.getKennelByStripeConnectedAccountId(connectedAccountId);
  if (!kennel || typeof (kennel as { id?: unknown }).id !== "number") return;
  await db.updateKennel((kennel as { id: number }).id, mapStripeAccountToKennelConnectFields(acct));
}

/**
 * Creates a Connect Express account if the kennel has none; persists `stripe_connected_account_id`
 * and initial capability flags from Stripe.
 */
export async function ensureStripeConnectExpressAccount(
  kennelId: number,
  ownerEmail?: string | null,
): Promise<{ accountId: string; created: boolean }> {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }
  const kennel = await db.getKennelById(kennelId);
  const row = kennel as Record<string, unknown>;
  const existing = kennelRowAccountId(row);
  if (existing) {
    return { accountId: existing, created: false };
  }
  const country = (process.env.STRIPE_CONNECT_DEFAULT_COUNTRY || "US").trim().toUpperCase().slice(0, 2) || "US";
  const account = await stripe.accounts.create({
    type: "express",
    country,
    email: ownerEmail?.trim() || undefined,
    metadata: { kennel_id: String(kennelId) },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
  await db.updateKennel(kennelId, {
    stripe_connected_account_id: account.id,
    ...mapStripeAccountToKennelConnectFields(account),
  });
  return { accountId: account.id, created: true };
}

export async function createStripeConnectOnboardingLink(params: {
  kennelId: number;
  returnUrl: string;
  refreshUrl: string;
  ownerEmail?: string | null;
}): Promise<string> {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }
  const { accountId } = await ensureStripeConnectExpressAccount(params.kennelId, params.ownerEmail);
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: "account_onboarding",
  });
  return link.url;
}

/** Whether booking Checkout should attach a destination transfer to this kennel row. */
export function kennelCanReceiveBookingDestinations(row: Record<string, unknown>): boolean {
  const id = kennelRowAccountId(row);
  const charges = Boolean(row.stripe_connect_charges_enabled ?? row.stripeConnectChargesEnabled);
  return Boolean(id && charges);
}
