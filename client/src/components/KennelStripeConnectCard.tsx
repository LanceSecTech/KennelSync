import { useEffect, useState } from "react";
import { ExternalLink, Landmark } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpcErrorMessage } from "@/lib/trpcErrorMessage";
import {
  messageContainsStripeOwnerConnectCode,
  parseStripeOwnerConnectError,
} from "@shared/stripeConnectOwnerTrpc";
import { STRIPE_DASHBOARD_CONNECT_SETTINGS_URL_DEFAULT } from "@shared/stripeDashboardUrls";

function stripeDashboardConnectSettingsUrl(): string {
  const fromEnv = import.meta.env.VITE_STRIPE_DASHBOARD_CONNECT_SETTINGS_URL as string | undefined;
  return (fromEnv && String(fromEnv).trim()) || STRIPE_DASHBOARD_CONNECT_SETTINGS_URL_DEFAULT;
}

/**
 * Stripe Connect onboarding for kennel owners (customer booking payouts).
 * Shown on Settings and Kennel Profile; return URL from Stripe should land on `/settings?connect=return`.
 */
export function KennelStripeConnectCard({ kennelId }: { kennelId: number }) {
  const utils = trpc.useUtils();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const { data, isLoading } = trpc.stripeConnect.status.useQuery({ kennelId });
  const [platformSetupBlocked, setPlatformSetupBlocked] = useState(false);

  useEffect(() => {
    setPlatformSetupBlocked(false);
  }, [kennelId]);

  useEffect(() => {
    if (data?.canAcceptBookingPayments) {
      setPlatformSetupBlocked(false);
    }
  }, [data?.canAcceptBookingPayments]);

  const handleOwnerConnectError = (err: unknown) => {
    const message = trpcErrorMessage(err);
    const parsed = parseStripeOwnerConnectError(message);

    if (parsed?.kind === "platform_connect_setup") {
      setPlatformSetupBlocked(true);
      return;
    }

    if (parsed?.kind === "generic") {
      const d = parsed.detail.trim();
      toast.error(d || "We couldn’t complete that Stripe request. Please try again.");
      return;
    }

    if (messageContainsStripeOwnerConnectCode(message)) {
      setPlatformSetupBlocked(true);
      return;
    }

    toast.error(message || "Could not complete that request. Please try again.");
  };

  const linkMut = trpc.stripeConnect.createOnboardingLink.useMutation({
    onSuccess: (r) => {
      setPlatformSetupBlocked(false);
      if (r.url) window.location.href = r.url;
    },
    onError: (e) => handleOwnerConnectError(e),
  });

  const syncMut = trpc.stripeConnect.syncFromStripe.useMutation({
    onSuccess: () => {
      setPlatformSetupBlocked(false);
      void utils.stripeConnect.status.invalidate({ kennelId });
      void utils.ownerBilling.access.invalidate({ kennelId });
    },
    onError: (e) => handleOwnerConnectError(e),
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const c = sp.get("connect");
    if (c !== "return" && c !== "refresh") return;
    let cancelled = false;
    void syncMut
      .mutateAsync({ kennelId })
      .then(() => {
        if (cancelled) return;
        sp.delete("connect");
        const q = sp.toString();
        window.history.replaceState({}, "", window.location.pathname + (q ? `?${q}` : ""));
        toast.success("Payment account status updated.");
      })
      .catch(() => {
        if (cancelled) return;
        // syncMut.onError + handleOwnerConnectError already ran; swallow rejection so the raw TRPCClientError
        // does not surface as an unhandled promise rejection / dev overlay.
      });
    return () => {
      cancelled = true;
    };
  }, [kennelId, syncMut.mutateAsync]);

  const openStripeConnectSettings = () => {
    window.open(stripeDashboardConnectSettingsUrl(), "_blank", "noopener,noreferrer");
  };

  const retryOnboarding = () => {
    linkMut.mutate({ kennelId, origin });
  };

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
      <CardContent className="space-y-4 p-4">
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

        {platformSetupBlocked ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg border border-amber-200/90 bg-amber-50/90 px-4 py-4 shadow-sm space-y-4"
          >
            <div className="space-y-2">
              <p className="text-sm font-semibold text-amber-950 tracking-tight">Online Payouts Aren&apos;t Ready Yet</p>
              <p className="text-xs leading-relaxed text-amber-950/90">
                Stripe needs your platform&apos;s Connect settings finished before you can link a bank account for this
                kennel. In the Stripe Dashboard, open Connect settings and complete any required steps (responsibilities,
                payout configuration, etc.), then return here and try again.
              </p>
              <p className="text-[11px] leading-relaxed text-amber-900/80">
                Customer payouts stay disabled until Stripe marks your platform Connect setup complete.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-stretch">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full border-amber-300 bg-white hover:bg-amber-50/80 sm:w-auto gap-2 h-9 px-3"
                onClick={openStripeConnectSettings}
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Open Stripe Connect Settings
              </Button>
              <Button
                type="button"
                size="sm"
                className="w-full font-semibold sm:w-auto h-9 px-4"
                onClick={retryOnboarding}
                disabled={linkMut.isPending}
              >
                {linkMut.isPending ? "Connecting…" : "Try Again"}
              </Button>
            </div>
          </div>
        ) : null}

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
            {!data.canAcceptBookingPayments && !platformSetupBlocked ? (
              <Button
                size="sm"
                variant="default"
                className="w-full sm:w-auto"
                onClick={() => linkMut.mutate({ kennelId, origin })}
                disabled={linkMut.isPending}
              >
                {linkMut.isPending ? "Opening Stripe…" : data.accountId ? "Continue Stripe setup" : "Link bank account with Stripe"}
              </Button>
            ) : null}
            {data.canAcceptBookingPayments ? (
              <p className="text-xs font-medium text-emerald-800">Online customer payments are enabled for this kennel.</p>
            ) : null}
            {data.bookingsRequireConnect && !data.canAcceptBookingPayments && !platformSetupBlocked ? (
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
