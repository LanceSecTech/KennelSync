/**
 * Encodes Stripe Connect owner-only TRPC errors so the client can show actionable UI
 * without relying on fragile message substring matching.
 * Customers never receive these procedures; still, messages remain non-technical.
 */

const PREFIX = "KS_STRIPE_OWNER_v1:";

export type StripeConnectOwnerTrpcKind = "platform_connect_setup" | "generic";

export function encodeStripeOwnerConnectError(kind: StripeConnectOwnerTrpcKind, detail: string): string {
  const safeDetail = detail.replace(/\r?\n/g, " ").trim();
  return `${PREFIX}${kind}|${safeDetail}`;
}

export function parseStripeOwnerConnectError(message: string | undefined): {
  kind: StripeConnectOwnerTrpcKind;
  detail: string;
} | null {
  if (!message || !message.startsWith(PREFIX)) return null;
  const rest = message.slice(PREFIX.length);
  const pipe = rest.indexOf("|");
  if (pipe < 0) return null;
  const kind = rest.slice(0, pipe) as StripeConnectOwnerTrpcKind;
  const detail = rest.slice(pipe + 1);
  if (kind !== "platform_connect_setup" && kind !== "generic") return null;
  return { kind, detail };
}
