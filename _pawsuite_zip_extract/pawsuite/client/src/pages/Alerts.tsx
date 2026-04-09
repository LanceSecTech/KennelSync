import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, Shield, CreditCard, CalendarDays, Users, Dog } from "lucide-react";
import { toast } from "sonner";

const typeIcons: Record<string, React.ElementType> = {
  vaccination_expiring: Shield,
  vaccination_expired: AlertCircle,
  booking_conflict: CalendarDays,
  payment_due: CreditCard,
  check_in_reminder: CalendarDays,
  capacity_warning: Users,
  missing_dog_info: Dog,
  general: Info,
};

const severityStyles: Record<string, string> = {
  info: "border-l-primary bg-primary/5",
  warning: "border-l-warning bg-warning/5",
  critical: "border-l-destructive bg-destructive/5",
};

export default function Alerts() {
  const { user } = useAuth();
  const { activeKennelId: kennelId } = useKennel();

  const { data: alerts, isLoading } = trpc.alert.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId && (user?.role === "owner" || user?.role === "employee") }
  );

  const { data: myAlerts } = trpc.alert.myAlerts.useQuery(undefined, {
    enabled: user?.role === "customer",
  });

  // Fetch computed missing dog info alerts for owner/employee
  const { data: missingInfoAlerts } = trpc.alert.missingDogInfo.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId && (user?.role === "owner" || user?.role === "employee") }
  );

  const utils = trpc.useUtils();
  const markRead = trpc.alert.markRead.useMutation({
    onSuccess: () => {
      utils.alert.byKennel.invalidate();
      utils.alert.myAlerts.invalidate();
    },
  });

  // Build computed missing info alerts as virtual alert objects
  const computedAlerts = (missingInfoAlerts || []).map((issue, idx) => ({
    id: -(idx + 1), // negative IDs for computed alerts
    type: "missing_dog_info" as const,
    severity: issue.bookingStatus === "checked_in" ? "critical" as const : "warning" as const,
    title: `${issue.dogName} — Missing Required Info`,
    message: String(issue.details),
    isRead: false,
    createdAt: issue.checkInDate,
    isComputed: true,
    bookingId: issue.bookingId,
    bookingStatus: issue.bookingStatus,
  }));

  const persistedAlerts = user?.role === "customer" ? myAlerts : alerts;
  // Merge computed alerts at the top of unread
  const allAlerts = [...computedAlerts, ...(persistedAlerts || [])];

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-8 bg-muted rounded animate-pulse w-32" />
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
      </div>
    );
  }

  const unread = allAlerts.filter(a => !a.isRead);
  const read = allAlerts.filter(a => a.isRead);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Alerts</h1>
        {unread.length > 0 && (
          <span className="px-2.5 py-0.5 text-xs font-medium bg-destructive/10 text-destructive rounded-full">
            {unread.length} new
          </span>
        )}
      </div>

      {allAlerts.length === 0 && (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="p-8 text-center">
            <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No alerts</p>
            <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
          </CardContent>
        </Card>
      )}

      {/* Unread */}
      {unread.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New</h2>
          {unread.map(alert => {
            const Icon = typeIcons[alert.type] || Info;
            const isComputed = (alert as any).isComputed;
            return (
              <Card
                key={alert.id}
                className={`border-0 border-l-4 shadow-sm ${!isComputed ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow ${severityStyles[alert.severity]}`}
                onClick={() => !isComputed && markRead.mutate({ id: alert.id })}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${
                      alert.severity === "critical" ? "text-destructive" :
                      alert.severity === "warning" ? "text-warning" : "text-primary"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{alert.title}</p>
                        {isComputed && (
                          <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-amber-100 text-amber-800">
                            ACTION NEEDED
                          </span>
                        )}
                      </div>
                      {alert.message && <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>}
                      {isComputed && (alert as any).bookingStatus && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Booking #{(alert as any).bookingId} · Status: {(alert as any).bookingStatus.replace("_", " ")}
                        </p>
                      )}
                      {!isComputed && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(alert.createdAt).toLocaleString()} · Click to dismiss
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Read */}
      {read.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Earlier</h2>
          {read.map(alert => {
            const Icon = typeIcons[alert.type] || Info;
            return (
              <Card key={alert.id} className="border-0 shadow-sm bg-white opacity-70">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alert.title}</p>
                      {alert.message && <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
