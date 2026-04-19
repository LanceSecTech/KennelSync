import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";

function useOwnerCheckout() {
  const utils = trpc.useUtils();
  return trpc.ownerBilling.createSubscriptionCheckout.useMutation({
    onSuccess: () => {
      void utils.ownerBilling.access.invalidate();
    },
    onError: (e) => toast.error(e.message || "Could not start checkout"),
  });
}

function humanizeSubscriptionStatus(status: string | null | undefined): string {
  if (status == null || String(status).trim() === "") return "None";
  const key = String(status).toLowerCase();
  const map: Record<string, string> = {
    active: "Active",
    trialing: "Trialing",
    past_due: "Past due",
    canceled: "Canceled",
    cancelled: "Canceled",
    incomplete: "Incomplete",
    unpaid: "Unpaid",
    paused: "Paused",
  };
  return map[key] ?? String(status);
}

export function OwnerSubscriptionTrialBanner({ kennelId }: { kennelId: number | null }) {
  const { data, isLoading } = trpc.ownerBilling.access.useQuery(
    { kennelId: kennelId! },
    { enabled: kennelId != null },
  );
  const checkout = useOwnerCheckout();

  if (kennelId == null || isLoading || !data?.enforced || !data.showTrialBanner) {
    return null;
  }

  const upgrade = async () => {
    try {
      const r = await checkout.mutateAsync({
        kennelId,
        origin: typeof window !== "undefined" ? window.location.origin : "",
      });
      if (r.url) window.location.href = r.url;
    } catch {
      /* handled */
    }
  };

  return (
    <Card className="border-primary/25 bg-primary/5 shadow-sm">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">You&apos;re on a trial</p>
            <p className="text-xs text-muted-foreground">
              Subscribe for free for 30 days, then $50/month, to keep uninterrupted access after your app trial ends.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="shrink-0"
          disabled={checkout.isPending || !data.stripeConfigured || !data.subscriptionPriceConfigured}
          onClick={() => void upgrade()}
        >
          {checkout.isPending ? "Opening…" : "Subscribe — free 30 days, then $50/mo"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function OwnerSubscriptionSettingsCard({ kennelId }: { kennelId: number | null }) {
  const utils = trpc.useUtils();
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data, isLoading } = trpc.ownerBilling.access.useQuery(
    { kennelId: kennelId!, enrichFromStripe: true },
    { enabled: kennelId != null },
  );

  const checkout = useOwnerCheckout();
  const portal = trpc.ownerBilling.createBillingPortalSession.useMutation({
    onError: (e) => toast.error(e.message || "Could not open billing portal"),
  });
  const cancelMut = trpc.ownerBilling.cancelSubscriptionAtPeriodEnd.useMutation({
    onSuccess: () => {
      toast.success("Your subscription will end after the current billing period.");
      void utils.ownerBilling.access.invalidate();
      setCancelOpen(false);
    },
    onError: (e) => toast.error(e.message || "Could not cancel subscription"),
  });

  if (kennelId == null || isLoading || !data) {
    return null;
  }

  const upgrade = async () => {
    try {
      const r = await checkout.mutateAsync({
        kennelId,
        origin: typeof window !== "undefined" ? window.location.origin : "",
      });
      if (r.url) window.location.href = r.url;
    } catch {
      /* handled */
    }
  };

  const openPortal = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const returnUrl = `${origin}/settings`;
    try {
      const r = await portal.mutateAsync({ kennelId, returnUrl });
      if (r.url) window.location.href = r.url;
    } catch {
      /* toast in mutation */
    }
  };

  const planLabel = data.subscriptionTier?.trim() ? String(data.subscriptionTier) : "KennelSync";
  const statusLabel = humanizeSubscriptionStatus(
    typeof data.subscriptionStatus === "string" ? data.subscriptionStatus : null,
  );
  const trialEnd =
    data.trialEndsAt != null && String(data.trialEndsAt).trim() !== "" ? formatDate(String(data.trialEndsAt)) : null;
  const renewalEnd =
    data.stripeCurrentPeriodEnd != null && String(data.stripeCurrentPeriodEnd).trim() !== ""
      ? formatDate(String(data.stripeCurrentPeriodEnd))
      : null;

  const canManageBilling = Boolean(data.stripeConfigured);
  const hasStripeSubscription = Boolean(data.stripeSubscriptionId);
  const cancelScheduled = Boolean(data.stripeCancelAtPeriodEnd);
  const statusKey = String(data.subscriptionStatus ?? "").toLowerCase();
  const subscriptionInactive = ["canceled", "cancelled", "incomplete_expired"].includes(statusKey);
  const canCancelStripe =
    hasStripeSubscription && canManageBilling && !cancelScheduled && !subscriptionInactive;

  return (
    <>
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            Billing &amp; subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {!data.enforced ? (
            <p className="text-xs text-muted-foreground">
              Owner subscription enforcement is off in this environment (no{" "}
              <code className="rounded bg-muted px-1">STRIPE_SECRET_KEY</code> or{" "}
              <code className="rounded bg-muted px-1">OWNER_SUBSCRIPTION_ENFORCE=off</code>). Status below is informational.
            </p>
          ) : null}

          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="text-right font-medium text-foreground">{planLabel}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="text-right font-medium text-foreground">{statusLabel}</dd>
            </div>
            {trialEnd ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">App trial ends</dt>
                <dd className="text-right font-medium text-foreground">{trialEnd}</dd>
              </div>
            ) : null}
            {renewalEnd ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  {cancelScheduled ? "Access through" : "Next billing / renewal"}
                </dt>
                <dd className="text-right font-medium text-foreground">{renewalEnd}</dd>
              </div>
            ) : null}
            {cancelScheduled ? (
              <p className="text-xs text-amber-800">
                Cancellation is scheduled: your subscription stays active until the end of the current period, then access
                follows your billing rules.
              </p>
            ) : null}
          </dl>

          {data.showTrialBanner && data.enforced ? (
            <p className="text-xs text-muted-foreground">
              You&apos;re in an app trial window—subscribe for free for 30 days, then $50/month, to keep access when
              billing is enforced.
            </p>
          ) : null}

          {!data.stripeConfigured || !data.subscriptionPriceConfigured ? (
            <p className="text-xs text-amber-800">
              Stripe SaaS billing is not fully configured. Set <code className="rounded bg-muted px-1">STRIPE_SECRET_KEY</code>{" "}
              and <code className="rounded bg-muted px-1">STRIPE_OWNER_SUBSCRIPTION_PRICE_ID</code> on the server.
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="sm:flex-1"
              disabled={!canManageBilling || portal.isPending}
              onClick={() => void openPortal()}
            >
              {portal.isPending ? "Opening…" : "Manage subscription"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/5 sm:flex-1"
              disabled={!canCancelStripe || cancelMut.isPending}
              onClick={() => setCancelOpen(true)}
            >
              Cancel subscription
            </Button>
          </div>

          {(data.showTrialBanner || !data.hasAccess) && data.enforced ? (
            <Button
              size="sm"
              className="w-full"
              disabled={checkout.isPending || !data.stripeConfigured || !data.subscriptionPriceConfigured}
              onClick={() => void upgrade()}
            >
              {checkout.isPending ? "Opening checkout…" : "Subscribe — free 30 days, then $50/mo"}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This schedules cancellation at the end of the current billing period. You keep access until then. Billing
              changes are processed securely on Stripe—this cannot be undone from here without using the billing portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMut.isPending}>Keep subscription</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelMut.isPending}
              onClick={(e) => {
                e.preventDefault();
                cancelMut.mutate({ kennelId });
              }}
            >
              {cancelMut.isPending ? "Canceling…" : "Confirm cancel at period end"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
