import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  CUSTOMER_CHECKOUT_START_FAILED,
  CUSTOMER_ONLINE_PAYMENT_UNAVAILABLE,
  customerSafePaymentErrorMessage,
} from "@shared/paymentMessages";
import { trpcErrorMessage } from "@/lib/trpcErrorMessage";

type Props = {
  bookingId: number;
  disabled?: boolean;
  onCheckoutStart?: () => void;
  /** Applied to the Pay Now button when online pay is available. */
  className?: string;
};

/**
 * Pay Now for customers: hidden when Connect/Stripe isn’t ready; shows a short fallback instead.
 */
export function CustomerBookingPayButton({ bookingId, disabled, onCheckoutStart, className }: Props) {
  const { data, isLoading } = trpc.payment.bookingOnlinePayEligibility.useQuery({ bookingId });
  const createCheckout = trpc.payment.createCheckoutSession.useMutation({
    onSuccess: (res) => {
      if (res.url) {
        toast.info("Redirecting to secure checkout…");
        window.location.assign(res.url);
      }
    },
    onError: (e) =>
      toast.error(
        customerSafePaymentErrorMessage(trpcErrorMessage(e), CUSTOMER_CHECKOUT_START_FAILED),
      ),
  });

  if (isLoading) {
    return (
      <Button size="sm" className={className ?? "h-7 text-xs gap-1"} disabled variant="secondary">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking…
      </Button>
    );
  }

  if (!data?.onlinePayAvailable) {
    return (
      <p className="text-[10px] text-muted-foreground leading-snug max-w-[220px] text-right sm:text-left">
        {data?.message ?? CUSTOMER_ONLINE_PAYMENT_UNAVAILABLE}
      </p>
    );
  }

  return (
    <Button
      size="sm"
      className={className ?? "h-7 text-xs gap-1"}
      disabled={disabled || createCheckout.isPending}
      onClick={() => {
        onCheckoutStart?.();
        createCheckout.mutate({ bookingId, origin: window.location.origin });
      }}
    >
      {createCheckout.isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <ExternalLink className="h-3 w-3" />
      )}
      Pay Now
    </Button>
  );
}
