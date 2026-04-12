/**
 * Encodes Stripe Connect owner-only TRPC errors so the client can show actionable UI
 * without relying on fragile message substring matching.
 * Customers never receive these procedures; still, messages remain non-technical.
 */

/** Machine-readable prefix for owner-only Stripe Connect TRPC errors (never show raw to users). */
export const STRIPE_OWNER_TRPC_PREFIX = "KS_STRIPE_OWNER_v1:";

/** Detect encoded payload anywhere in a string (handles wrappers or concatenated messages). */
export function messageContainsStripeOwnerConnectCode(message: string | undefined): boolean {
  if (!message) return false;
  return message.includes(STRIPE_OWNER_TRPC_PREFIX);
}

export type StripeConnectOwnerTrpcKind = "platform_connect_setup" | "generic";

export function encodeStripeOwnerConnectError(kind: StripeConnectOwnerTrpcKind, detail: string): string {
  const safeDetail = detail.replace(/\r?\n/g, " ").trim();
  return `${STRIPE_OWNER_TRPC_PREFIX}${kind}|${safeDetail}`;
}

export function parseStripeOwnerConnectError(message: string | undefined): {
  kind: StripeConnectOwnerTrpcKind;
  detail: string;
} | null {
  const trimmed = message?.trim() ?? "";
  if (!trimmed) return null;

  let payload = trimmed;
  if (!payload.startsWith(STRIPE_OWNER_TRPC_PREFIX)) {
    const at = payload.indexOf(STRIPE_OWNER_TRPC_PREFIX);
    if (at < 0) return null;
    payload = payload.slice(at);
  }

  const rest = payload.slice(STRIPE_OWNER_TRPC_PREFIX.length);
  const pipe = rest.indexOf("|");
  if (pipe < 0) return null;
  const kind = rest.slice(0, pipe) as StripeConnectOwnerTrpcKind;
  const detail = rest.slice(pipe + 1);
  if (kind !== "platform_connect_setup" && kind !== "generic") return null;
  return { kind, detail };
}
