import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

function useOwnerCheckout() {
  const utils = trpc.useUtils();
  return trpc.ownerBilling.createSubscriptionCheckout.useMutation({
    onSuccess: () => {
      void utils.ownerBilling.access.invalidate();
    },
    onError: (e) => toast.error(e.message || "Could not start checkout"),
  });
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
              Upgrade to continue using KennelSync after your trial ends.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="shrink-0"
          disabled={checkout.isPending || !data.stripeConfigured || !data.subscriptionPriceConfigured}
          onClick={() => void upgrade()}
        >
          {checkout.isPending ? "Opening…" : "Upgrade"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function OwnerSubscriptionSettingsCard({ kennelId }: { kennelId: number | null }) {
  const { data, isLoading } = trpc.ownerBilling.access.useQuery(
    { kennelId: kennelId! },
    { enabled: kennelId != null },
  );
  const checkout = useOwnerCheckout();

  if (kennelId == null || isLoading || !data?.enforced) {
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

  const trial = data.showTrialBanner;
  const sub = data.subscriptionStatus ? String(data.subscriptionStatus) : "none";

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">KennelSync plan</p>
            {trial ? (
              <p className="text-xs text-muted-foreground mt-1">
                You&apos;re on a trial. Upgrade to continue using KennelSync.
              </p>
            ) : data.hasAccess ? (
              <p className="text-xs text-muted-foreground mt-1">
                Status: <span className="font-medium text-foreground">{sub}</span>
                {data.trialEndsAt ? ` · Trial data: ${new Date(String(data.trialEndsAt)).toLocaleDateString()}` : null}
              </p>
            ) : (
              <p className="text-xs text-destructive mt-1">No active subscription or trial — upgrade to restore access.</p>
            )}
            {!data.stripeConfigured || !data.subscriptionPriceConfigured ? (
              <p className="text-[10px] text-amber-700 mt-2">
                Stripe billing is not configured. Set STRIPE_SECRET_KEY and STRIPE_OWNER_SUBSCRIPTION_PRICE_ID on the
                server.
              </p>
            ) : null}
          </div>
        </div>
        {(trial || !data.hasAccess) && (
          <Button
            size="sm"
            className="w-full"
            disabled={checkout.isPending || !data.stripeConfigured || !data.subscriptionPriceConfigured}
            onClick={() => void upgrade()}
          >
            {checkout.isPending ? "Opening checkout…" : "Upgrade"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
