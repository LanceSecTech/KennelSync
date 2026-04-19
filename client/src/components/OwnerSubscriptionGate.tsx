import { useAuth } from "@/_core/hooks/useAuth";
import { useKennel } from "@/contexts/KennelContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useLocation } from "wouter";

/** While paywalled, owners can still open Settings (and log out from the top bar). */
function isDashboardSettingsPath(location: string): boolean {
  return location === "/settings" || location.startsWith("/settings/") || location.startsWith("/settings?");
}

export default function OwnerSubscriptionGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { activeKennelId } = useKennel();
  const [location] = useLocation();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.ownerBilling.access.useQuery(
    { kennelId: activeKennelId! },
    { enabled: user?.role === "owner" && activeKennelId != null },
  );

  const checkout = trpc.ownerBilling.createSubscriptionCheckout.useMutation({
    onError: (e) => toast.error(e.message || "Could not start checkout"),
  });

  const startTrial = trpc.ownerBilling.startTrial.useMutation({
    onSuccess: () => {
      toast.success("Free trial started");
      void utils.ownerBilling.access.invalidate();
    },
    onError: (e) => toast.error(e.message || "Could not start trial"),
  });

  if (user?.role !== "owner") {
    return children;
  }

  if (activeKennelId == null) {
    return children;
  }

  const settingsBypass = isDashboardSettingsPath(location);

  if (isLoading) {
    if (settingsBypass) {
      return <>{children}</>;
    }
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Checking your plan…</p>
      </div>
    );
  }

  if (!data?.enforced || data.hasAccess) {
    return children;
  }

  if (settingsBypass) {
    return <>{children}</>;
  }

  const startUpgrade = async () => {
    try {
      const r = await checkout.mutateAsync({
        kennelId: activeKennelId,
        origin: typeof window !== "undefined" ? window.location.origin : "",
      });
      if (r.url) {
        window.location.href = r.url;
      }
    } catch {
      /* toast via onError */
    }
  };

  return (
    <div className="mx-auto max-w-lg py-8 px-4">
      <Card className="border-amber-200 bg-amber-50/80 shadow-sm">
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-amber-950">Upgrade required</h2>
            <p className="mt-2 text-sm text-amber-900/90">
              Your KennelSync access requires an active subscription or free trial for this kennel. Subscribe or start a
              free trial to continue managing bookings, rooms, and customers.
            </p>
          </div>
          {!data.stripeConfigured || !data.subscriptionPriceConfigured ? (
            <p className="text-xs text-amber-800">
              Billing is not fully configured on the server (Stripe keys or price ID). Contact support or set{" "}
              <code className="rounded bg-amber-100 px-1">STRIPE_OWNER_SUBSCRIPTION_PRICE_ID</code>.
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button className="w-full sm:w-auto" disabled={checkout.isPending} onClick={() => void startUpgrade()}>
              {checkout.isPending ? "Opening checkout…" : "Subscribe — free 30 days, then $50/mo"}
            </Button>
            {data.canStartAppTrial ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={startTrial.isPending || checkout.isPending}
                onClick={() => startTrial.mutate({ kennelId: activeKennelId })}
              >
                {startTrial.isPending ? "Starting…" : "Start Free Trial"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="w-full border-amber-300 sm:w-auto"
              disabled={checkout.isPending}
              onClick={() => void utils.ownerBilling.access.invalidate()}
            >
              I completed payment — refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
