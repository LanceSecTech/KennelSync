import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Receipt, Clock, CheckCircle2 } from "lucide-react";
import { CustomerBookingPayButton } from "@/components/CustomerBookingPayButton";
import { toast } from "sonner";
import { formatDate, parseLocalDate } from "@/lib/dateUtils";
import { useEffect } from "react";
import { useSearch } from "wouter";

export default function Payments() {
  const { data: payments, isLoading } = trpc.payment.myPayments.useQuery();
  const { data: bookings } = trpc.booking.myBookings.useQuery();
  const { data: dogs } = trpc.dog.myDogs.useQuery();
  const { data: balanceSummary } = trpc.payment.balanceSummary.useQuery();
  const utils = trpc.useUtils();
  const search = useSearch();

  const unpaidBookings =
    bookings?.filter((b) => {
      if (b.status === "cancelled") return false;
      return b.paymentStatus === "unpaid" || b.paymentStatus === "partial";
    }) || [];
  const firstUnpaidId = unpaidBookings[0]?.id;
  const { data: firstUnpaidEligibility } = trpc.payment.bookingOnlinePayEligibility.useQuery(
    { bookingId: firstUnpaidId! },
    { enabled: !!firstUnpaidId },
  );

  // Handle payment success/cancel URL params
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get('payment') === 'success') {
      toast.success("Payment successful! Your booking is now paid.");
      utils.payment.myPayments.invalidate();
      utils.payment.balanceSummary.invalidate();
      utils.booking.myBookings.invalidate();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('payment') === 'cancelled') {
      toast.info("Payment was cancelled.");
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [search, utils.booking.myBookings, utils.payment.balanceSummary, utils.payment.myPayments]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-8 bg-muted rounded animate-pulse w-32" />
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
      </div>
    );
  }

  const summary = balanceSummary || { balanceDue: 0, upcomingCharges: 0, paidThisMonth: 0 };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Payments</h1>

      {/* Balance Summary */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-destructive">${summary.balanceDue.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">Balance Due</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">${summary.upcomingCharges.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">Upcoming</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">${summary.paidThisMonth.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">Paid This Month</p>
            </div>
          </div>
          {summary.balanceDue > 0 && unpaidBookings.length > 0 && firstUnpaidId != null && (
            <div className="w-full mt-3 space-y-2">
              {firstUnpaidEligibility?.onlinePayAvailable ? (
                <CustomerBookingPayButton bookingId={firstUnpaidId} className="w-full h-10 font-semibold" />
              ) : (
                <p className="text-xs text-muted-foreground text-center leading-relaxed px-1">
                  {firstUnpaidEligibility?.message ??
                    "Online payment is not available for this kennel yet. Payment will be collected directly by the kennel."}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <div>
        <h2 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Invoices</h2>
        {bookings?.filter(b => b.status !== "cancelled" && parseFloat(String(b.totalPrice || "0")) > 0).length === 0 && (
          <Card className="border-dashed border-2 bg-muted/30">
            <CardContent className="p-6 text-center">
              <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No invoices yet</p>
            </CardContent>
          </Card>
        )}
        {bookings?.filter(b => b.status !== "cancelled" && parseFloat(String(b.totalPrice || "0")) > 0).map(booking => {
          const dogLabel = (booking as any).dogNames?.length > 0
            ? (booking as any).dogNames.join(", ")
            : ((booking as any).dogName || dogs?.find(d => d.id === booking.dogId)?.name || "Dog");
          const total = parseFloat(String(booking.totalPrice || "0"));
          const isPaid = booking.paymentStatus === 'paid';

          return (
            <Card key={booking.id} className="border-0 shadow-sm bg-white mb-2">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{dogLabel} · #{booking.id}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(booking.checkInDate)}
                      {booking.checkOutDate && ` - ${formatDate(booking.checkOutDate)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">${total.toFixed(2)}</p>
                    {isPaid ? (
                      <span className="text-[10px] text-green-600 font-medium flex items-center gap-0.5 justify-end">
                        <CheckCircle2 className="h-3 w-3" /> Paid
                      </span>
                    ) : (
                      <div className="flex flex-col items-end gap-1 max-w-[min(100%,220px)]">
                        <span className="text-[10px] text-amber-600 font-medium flex items-center gap-0.5">
                          <Clock className="h-3 w-3" /> {booking.paymentStatus === 'partial' ? 'Partial' : 'Unpaid'}
                        </span>
                        <CustomerBookingPayButton bookingId={booking.id} className="h-6 text-[10px] px-2" />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Payment Info */}
      <div>
        <h2 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Payment Methods</h2>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Stripe Checkout</p>
                <p className="text-[10px] text-muted-foreground">Payments are processed securely via Stripe</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
