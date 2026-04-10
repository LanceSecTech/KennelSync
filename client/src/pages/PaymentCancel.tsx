import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { useEffect } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function PaymentCancel() {
  useEffect(() => {
    toast.info("Checkout was cancelled. You can pay anytime from Payments or My Stays.");
  }, []);

  return (
    <div className="p-4 max-w-md mx-auto pt-12">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center space-y-4">
          <XCircle className="h-14 w-14 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-semibold">Payment cancelled</h1>
          <p className="text-sm text-muted-foreground">
            No charge was made. Return when you are ready to complete payment.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild variant="default">
              <Link href="/payments">Payments</Link>
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
