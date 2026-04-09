import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, Receipt, Clock, CheckCircle2, ArrowDownRight } from "lucide-react";
import { useMemo } from "react";
import { formatDate } from "@/lib/dateUtils";

/** Owner financials content (embedded in Settings or standalone page). */
export function FinancialsPanel() {
  const { activeKennelId: kennelId } = useKennel();
  const { data: payments, isLoading } = trpc.payment.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const { data: stats } = trpc.stats.ownerDashboard.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );

  const breakdown = useMemo(() => {
    if (!payments) return { completed: 0, pending: 0, refunded: 0, recentPayments: [] };
    const completed = payments.filter(p => p.status === "completed").reduce((s, p) => s + parseFloat(String(p.amount)), 0);
    const pending = payments.filter(p => p.status === "pending").reduce((s, p) => s + parseFloat(String(p.amount)), 0);
    const refunded = payments.filter(p => p.status === "refunded").reduce((s, p) => s + parseFloat(String(p.amount)), 0);
    const recentPayments = payments.slice(0, 10);
    return { completed, pending, refunded, recentPayments };
  }, [payments]);

  if (!kennelId) {
    return <p className="text-sm text-muted-foreground">Select a kennel to view financials.</p>;
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-8 bg-muted rounded animate-pulse w-32" />
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Revenue Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Total Revenue</span>
            </div>
            <p className="text-xl font-bold text-success">${(stats?.totalRevenue || 0).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">This Month</span>
            </div>
            <p className="text-xl font-bold">${(stats?.monthRevenue || 0).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Status Breakdown */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Payment Breakdown</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-success">${breakdown.completed.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">Collected</p>
            </div>
            <div>
              <p className="text-lg font-bold text-warning">${breakdown.pending.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">Pending</p>
            </div>
            <div>
              <p className="text-lg font-bold text-destructive">${breakdown.refunded.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">Refunded</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <div>
        <h2 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Recent Payments</h2>
        {breakdown.recentPayments.length === 0 && (
          <Card className="border-dashed border-2 bg-muted/30">
            <CardContent className="p-6 text-center">
              <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No payments yet</p>
            </CardContent>
          </Card>
        )}
        {breakdown.recentPayments.map(payment => (
          <Card key={payment.id} className="border-0 shadow-sm bg-white mb-2">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {payment.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : payment.status === "refunded" ? (
                    <ArrowDownRight className="h-4 w-4 text-destructive" />
                  ) : (
                    <Clock className="h-4 w-4 text-warning" />
                  )}
                  <div>
                    <p className="text-sm font-medium capitalize">{payment.type} Payment</p>
                    <p className="text-[10px] text-muted-foreground">
                      {payment.paidAt ? formatDate(payment.paidAt) : "Pending"}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${
                  payment.status === "refunded" ? "text-destructive" : "text-foreground"
                }`}>
                  {payment.status === "refunded" ? "-" : "+"}${String(payment.amount)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function Financials() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Financials</h1>
      <FinancialsPanel />
    </div>
  );
}
