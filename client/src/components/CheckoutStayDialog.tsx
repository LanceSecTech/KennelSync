import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bath, CreditCard, LogOut, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/dateUtils";
import {
  MANUAL_PAYMENT_METHODS,
  MANUAL_PAYMENT_LABELS,
  type ManualPaymentMethod,
} from "@shared/manualPayment";

export type CheckoutStayBooking = {
  id: number;
  checkInDate: string;
  checkOutDate?: string | null;
  totalPrice?: number;
  serviceName?: string;
  serviceType?: string;
  paymentStatus?: string;
  dogName?: string;
  dogNames?: string[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kennelId: number;
  booking: CheckoutStayBooking | null;
  dogLabel: string;
  onCompleted?: () => void;
};

export function CheckoutStayDialog({
  open,
  onOpenChange,
  kennelId,
  booking,
  dogLabel,
  onCompleted,
}: Props) {
  const bookingId = booking?.id ?? 0;
  const utils = trpc.useUtils();
  const [selectedAddOns, setSelectedAddOns] = useState<Record<number, boolean>>({});
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>("none");
  const [discountNotes, setDiscountNotes] = useState("");
  const [paymentMode, setPaymentMode] = useState<"manual" | "saved_card">("manual");
  const [manualPaymentMethod, setManualPaymentMethod] = useState<ManualPaymentMethod>("cash");

  const { data: availableAddOns } = trpc.addOn.activeByKennel.useQuery(
    { kennelId },
    { enabled: open && !!kennelId },
  );
  const { data: discounts } = trpc.discount.listByKennel.useQuery(
    { kennelId },
    { enabled: open && !!kennelId },
  );

  const { data: cardEligibility } = trpc.booking.checkoutSavedCardEligibility.useQuery(
    { bookingId },
    { enabled: open && !!bookingId },
  );

  useEffect(() => {
    if (!open) return;
    setSelectedAddOns({});
    setSelectedDiscountId("none");
    setDiscountNotes("");
    setPaymentMode("manual");
    setManualPaymentMethod("cash");
  }, [open, bookingId]);

  const selectedAddOnIds = useMemo(
    () => Object.entries(selectedAddOns).filter(([, v]) => v).map(([k]) => parseInt(k, 10)),
    [selectedAddOns],
  );

  const checkoutQuote = trpc.booking.checkoutQuote.useQuery(
    {
      bookingId,
      addOnIds: selectedAddOnIds,
      discountId: selectedDiscountId !== "none" ? parseInt(selectedDiscountId, 10) : null,
      discountNotes: discountNotes || undefined,
    },
    { enabled: open && !!bookingId },
  );

  const finalizeCheckout = trpc.booking.checkoutFinalize.useMutation({
    onSuccess: (res, vars) => {
      if (res.paymentCharged) {
        toast.success("Checked out and card charged.");
      } else {
        const method = (vars.manualPaymentMethod ?? "other") as ManualPaymentMethod;
        const label = vars.paymentMode === "manual" ? MANUAL_PAYMENT_LABELS[method] : "offline";
        toast.success(`Checked out — marked paid (${label}).`);
      }
      onOpenChange(false);
      utils.booking.byKennel.invalidate();
      utils.booking.todayTasks.invalidate();
      utils.room.byKennel.invalidate();
      utils.room.currentAssignments.invalidate();
      onCompleted?.();
    },
    onError: (e) => toast.error(e.message || "Checkout failed"),
  });

  const addOnTotal = useMemo(() => {
    return Object.entries(selectedAddOns)
      .filter(([, v]) => v)
      .reduce((sum, [k]) => {
        const addOn = availableAddOns?.find((a) => a.id === parseInt(k, 10));
        return sum + (addOn ? parseFloat(String(addOn.price)) : 0);
      }, 0);
  }, [selectedAddOns, availableAddOns]);

  const stripeOk = cardEligibility?.stripeConfigured === true;
  const hasCard = cardEligibility?.hasSavedCard === true;
  const canChargeCard = stripeOk && hasCard;

  const handleConfirm = () => {
    if (!bookingId) return;
    if (paymentMode === "saved_card" && !canChargeCard) {
      toast.error(
        !stripeOk
          ? "Stripe is not configured — use “Mark paid manually” or set STRIPE_SECRET_KEY on the server."
          : "This customer has no saved card on file — use “Mark paid manually” or collect payment another way.",
      );
      return;
    }
    finalizeCheckout.mutate({
      bookingId,
      addOnIds: selectedAddOnIds,
      discountId: selectedDiscountId !== "none" ? parseInt(selectedDiscountId, 10) : null,
      discountNotes: discountNotes || undefined,
      paymentMode,
      manualPaymentMethod: paymentMode === "manual" ? manualPaymentMethod : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-primary" />
            Checkout summary
          </DialogTitle>
        </DialogHeader>
        {open && !booking && (
          <p className="text-sm text-destructive">This booking could not be loaded. Close and try again.</p>
        )}
        {booking && (
          <div className="space-y-3">
            <Card className="border bg-muted/30">
              <CardContent className="p-3 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Dog(s): </span>
                  <span className="font-semibold">{dogLabel}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Stay: </span>
                  {formatDate(booking.checkInDate)}
                  {booking.checkOutDate ? ` → ${formatDate(booking.checkOutDate)}` : ""}
                </p>
                {booking.serviceName && (
                  <p>
                    <span className="text-muted-foreground">Service: </span>
                    {booking.serviceName}
                    {booking.serviceType ? ` (${booking.serviceType})` : ""}
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">Booking: </span>#{booking.id}
                </p>
                {booking.paymentStatus && (
                  <p className="text-xs text-muted-foreground">Payment status: {booking.paymentStatus}</p>
                )}
              </CardContent>
            </Card>

            {availableAddOns && availableAddOns.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Bath className="h-3 w-3" /> Add-ons
                </p>
                <p className="text-[11px] text-muted-foreground">Tap to include on this checkout.</p>
                {availableAddOns.map((addOn) => (
                  <Card
                    key={addOn.id}
                    className={`cursor-pointer transition-all border-2 ${
                      selectedAddOns[addOn.id] ? "border-primary bg-primary/5" : "border-transparent bg-white shadow-sm"
                    }`}
                    onClick={() => setSelectedAddOns((prev) => ({ ...prev, [addOn.id]: !prev[addOn.id] }))}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <Checkbox checked={!!selectedAddOns[addOn.id]} className="pointer-events-none" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{addOn.name}</p>
                      </div>
                      <span className="text-sm font-bold text-primary">${String(addOn.price)}</span>
                    </CardContent>
                  </Card>
                ))}
                {addOnTotal > 0 && (
                  <div className="flex justify-between items-center pt-1 text-sm">
                    <span className="font-medium">Add-ons subtotal</span>
                    <span className="font-bold text-primary">${addOnTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1 pt-1 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Discount</p>
              {(discounts || []).filter((d: { isActive: boolean }) => d.isActive).length > 0 ? (
                <>
                  <Select value={selectedDiscountId} onValueChange={setSelectedDiscountId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="No discount" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No discount</SelectItem>
                      {(discounts || [])
                        .filter((d: { isActive: boolean }) => d.isActive)
                        .map((d: any) => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {d.name} · {d.discountType === "percent" ? `${d.amount}%` : `$${Number(d.amount).toFixed(2)}`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {selectedDiscountId !== "none" && (
                    <Input
                      value={discountNotes}
                      onChange={(e) => setDiscountNotes(e.target.value)}
                      className="h-9 text-xs"
                      placeholder="Reason / note (optional)"
                    />
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No active discounts — add some under Kennel → Discounts.</p>
              )}
            </div>

            <div className="space-y-1 pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Payment
              </p>
              <Select
                value={paymentMode}
                onValueChange={(v) => setPaymentMode(v as "manual" | "saved_card")}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Mark paid manually / offline</SelectItem>
                  <SelectItem value="saved_card" disabled={!canChargeCard}>
                    Charge saved card (Stripe)
                  </SelectItem>
                </SelectContent>
              </Select>
              {paymentMode === "manual" && (
                <Select
                  value={manualPaymentMethod}
                  onValueChange={(v) => setManualPaymentMethod(v as ManualPaymentMethod)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="How was it paid?" />
                  </SelectTrigger>
                  <SelectContent>
                    {MANUAL_PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {MANUAL_PAYMENT_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!stripeOk && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2 flex gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  Stripe is not configured on the server. Only manual checkout is available until STRIPE_SECRET_KEY is set.
                </p>
              )}
              {stripeOk && !hasCard && (
                <p className="text-[11px] text-muted-foreground">
                  This customer has no saved card. They can add one from their account, or mark paid manually after taking payment at the desk.
                </p>
              )}
            </div>

            {checkoutQuote.data && (
              <div className="space-y-1 rounded-lg border bg-card p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base stay</span>
                  <span>${Number(checkoutQuote.data.baseTotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Add-ons</span>
                  <span>${Number(checkoutQuote.data.addOnsTotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${Number(checkoutQuote.data.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Discount</span>
                  <span>- ${Number(checkoutQuote.data.discountAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2 text-base">
                  <span>Total due</span>
                  <span>${Number(checkoutQuote.data.finalTotal || 0).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}
        <DialogFooter className="gap-2 flex-col sm:flex-row sm:justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="font-semibold"
            onClick={handleConfirm}
            disabled={!bookingId || finalizeCheckout.isPending || checkoutQuote.isLoading}
          >
            {finalizeCheckout.isPending
              ? "Processing…"
              : paymentMode === "saved_card"
                ? "Confirm & charge card"
                : "Confirm checkout (mark paid)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
