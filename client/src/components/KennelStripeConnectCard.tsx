import { useEffect } from "react";
import { Landmark } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Stripe Connect onboarding for kennel owners (customer booking payouts).
 * Shown on Settings and Kennel Profile; return URL from Stripe should land on `/settings?connect=return`.
 */
export function KennelStripeConnectCard({ kennelId }: { kennelId: number }) {
  const utils = trpc.useUtils();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const { data, isLoading } = trpc.stripeConnect.status.useQuery({ kennelId });
  const linkMut = trpc.stripeConnect.createOnboardingLink.useMutation({
    onSuccess: (r) => {
      if (r.url) window.location.href = r.url;
    },
    onError: (e) => toast.error(e.message || "Could not start Stripe onboarding"),
  });
  const syncMut = trpc.stripeConnect.syncFromStripe.useMutation({
    onSuccess: () => {
      void utils.stripeConnect.status.invalidate({ kennelId });
      void utils.ownerBilling.access.invalidate({ kennelId });
    },
    onError: (e) => toast.error(e.message || "Could not sync payout status from Stripe."),
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const c = sp.get("connect");
    if (c !== "return" && c !== "refresh") return;
    let cancelled = false;
    void syncMut.mutateAsync({ kennelId }).then(() => {
      if (cancelled) return;
      sp.delete("connect");
      const q = sp.toString();
      window.history.replaceState({}, "", window.location.pathname + (q ? `?${q}` : ""));
      toast.success("Payment account status updated.");
    });
    return () => {
      cancelled = true;
    };
  }, [kennelId, syncMut.mutateAsync]);

  if (!data?.stripeConfigured) {
    return (
      <Card id="stripe-connect-payouts" className="border border-dashed border-muted bg-muted/15">
        <CardContent className="flex gap-3 p-4">
          <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Online customer payments are unavailable until the server is configured with Stripe (
            <code className="text-xs">STRIPE_SECRET_KEY</code>).
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="stripe-connect-payouts" className="border-0 bg-white shadow-sm ring-1 ring-border/60">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold tracking-tight">Customer booking payouts (Stripe Connect)</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Link your bank through Stripe so payments from pet parents for stays are deposited to you. This is separate
              from your KennelSync subscription.
            </p>
          </div>
        </div>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading status…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Card charges</span>
              <span className={data.chargesEnabled ? "font-medium text-emerald-700" : ""}>
                {data.chargesEnabled ? "Ready" : "Not ready"}
              </span>
              <span>Bank payouts</span>
              <span className={data.payoutsEnabled ? "font-medium text-emerald-700" : ""}>
                {data.payoutsEnabled ? "Enabled" : "Pending"}
              </span>
            </div>
            {!data.canAcceptBookingPayments ? (
              <Button
                size="sm"
                variant="default"
                className="w-full sm:w-auto"
                onClick={() => linkMut.mutate({ kennelId, origin })}
                disabled={linkMut.isPending}
              >
                {linkMut.isPending ? "Opening Stripe…" : data.accountId ? "Continue Stripe setup" : "Link bank account with Stripe"}
              </Button>
            ) : (
              <p className="text-xs font-medium text-emerald-800">Online customer payments are enabled for this kennel.</p>
            )}
            {data.bookingsRequireConnect && !data.canAcceptBookingPayments ? (
              <p className="rounded-md border border-amber-200/80 bg-amber-50 px-2 py-1.5 text-xs text-amber-900/90">
                Customer payments are turned off until Connect is complete. Finish setup above.
              </p>
            ) : null}
            {data.accountId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => syncMut.mutate({ kennelId })}
                disabled={syncMut.isPending}
              >
                {syncMut.isPending ? "Refreshing…" : "Refresh status from Stripe"}
              </Button>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
