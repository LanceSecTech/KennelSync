import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  MANUAL_PAYMENT_METHODS,
  MANUAL_PAYMENT_LABELS,
  type ManualPaymentMethod,
} from "@shared/manualPayment";

type BookingLike = { id: number; totalPrice?: number | string | null };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingLike | null;
  kennelId: number;
  onSuccess?: () => void;
};

/** Owner/employee: mark booking paid with an offline payment method (creates payment row + sets booking paid). */
export function RecordManualPaymentDialog({ open, onOpenChange, booking, kennelId, onSuccess }: Props) {
  const [method, setMethod] = useState<ManualPaymentMethod>("cash");
  const utils = trpc.useUtils();

  useEffect(() => {
    if (open) setMethod("cash");
  }, [open, booking?.id]);

  const recordManualPay = trpc.payment.recordManualPayment.useMutation({
    onSuccess: () => {
      void utils.booking.byKennel.invalidate({ kennelId });
      void utils.booking.today.invalidate({ kennelId });
      void utils.booking.todayTasks.invalidate({ kennelId });
      void utils.stats.ownerDashboard.invalidate();
      void utils.payment.byKennel.invalidate({ kennelId });
      onOpenChange(false);
      onSuccess?.();
      toast.success("Offline payment recorded.");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4" /> Record offline payment
          </DialogTitle>
        </DialogHeader>
        {booking && (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground text-xs">
              Mark booking #{booking.id} paid when the customer paid outside KennelSync (cash, external terminal,
              etc.). This does not charge a card in the app.
            </p>
            <p className="font-semibold tabular-nums">${String(booking.totalPrice ?? 0)}</p>
            <div className="space-y-1">
              <Label className="text-xs">Payment method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as ManualPaymentMethod)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {MANUAL_PAYMENT_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!booking || recordManualPay.isPending}
            onClick={() =>
              booking && recordManualPay.mutate({ bookingId: booking.id, manualPaymentMethod: method })
            }
          >
            {recordManualPay.isPending ? "Saving…" : "Mark paid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
