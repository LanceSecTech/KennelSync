import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function PaymentSuccess() {
  const utils = trpc.useUtils();

  useEffect(() => {
    toast.success("Payment successful. Your booking will show as paid once processing finishes.");
    void utils.payment.myPayments.invalidate();
    void utils.booking.myBookings.invalidate();
    void utils.payment.balanceSummary.invalidate();
  }, [utils]);

  return (
    <div className="p-4 max-w-md mx-auto pt-12">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center space-y-4">
          <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto" />
          <h1 className="text-xl font-semibold">Payment received</h1>
          <p className="text-sm text-muted-foreground">
            Thanks — you can confirm status on Payments or My Stays. If it still shows unpaid, wait a few seconds and refresh.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild variant="default">
              <Link href="/payments">View payments</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/stays">My stays</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
