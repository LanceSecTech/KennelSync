/** Owner SaaS billing: kennel row must have active/trialing Stripe subscription or valid app trial. */

export function isOwnerSubscriptionEnforced(): boolean {
  const v = (process.env.OWNER_SUBSCRIPTION_ENFORCE || "").toLowerCase();
  if (v === "0" || v === "false" || v === "off") return false;
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function kennelRowHasOwnerAppAccess(row: Record<string, unknown> | null | undefined): boolean {
  if (!row) return false;
  const status = String(row.subscription_status ?? row.subscriptionStatus ?? "").toLowerCase();
  if (status === "active" || status === "trialing") return true;
  const te = row.trial_ends_at ?? row.trialEndsAt;
  if (te != null && te !== "") {
    const end = new Date(String(te)).getTime();
    if (Number.isFinite(end) && end > Date.now()) return true;
  }
  return false;
}

export function kennelShowTrialUpgradeBanner(row: Record<string, unknown> | null | undefined): boolean {
  if (!row) return false;
  const te = row.trial_ends_at ?? row.trialEndsAt;
  if (te == null || te === "") return false;
  const end = new Date(String(te)).getTime();
  if (!Number.isFinite(end) || end <= Date.now()) return false;
  const status = String(row.subscription_status ?? row.subscriptionStatus ?? "").toLowerCase();
  if (status === "active" || status === "trialing") return false;
  return true;
}
