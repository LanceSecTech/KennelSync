import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  Shield,
  CreditCard,
  CalendarDays,
  Users,
  Dog,
  ChevronRight,
  X,
} from "lucide-react";
import { useLocation } from "wouter";

/**
 * Alert presentation & navigation (client-side).
 *
 * To add a persisted DB type: ensure `alerts.type` matches a key in `typeIcons` and extend
 * `getAlertTargetPath` below. Server types (schema) use snake_case, e.g. `vaccination_missing`.
 */
const typeIcons: Record<string, React.ElementType> = {
  vaccination_expiring: Shield,
  vaccination_expiring_soon: Shield,
  vaccination_expired: AlertCircle,
  vaccination_missing: AlertCircle,
  booking_conflict: CalendarDays,
  booking_pending: CalendarDays,
  payment_due: CreditCard,
  check_in_reminder: CalendarDays,
  capacity_warning: Users,
  missing_dog_info: Dog,
  dog_info_incomplete: Dog,
  general: Info,
};

const severityStyles: Record<string, string> = {
  info: "border-l-primary bg-primary/5",
  warning: "border-l-warning bg-warning/5",
  critical: "border-l-destructive bg-destructive/5",
};

/** Title Case from snake_case or spaced words (e.g. vaccination_missing → Vaccination Missing). */
function alertTypeToTitleCase(type: string): string {
  return String(type || "alert")
    .split(/_+|\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function bookingSuffix(bookingId?: number | null): string {
  if (bookingId == null || !Number.isFinite(bookingId)) return "";
  return ` (Booking #${bookingId})`;
}

/** Human headline: "Type Label — Dog (Booking #n)" */
function buildPersistedAlertHeadline(alert: {
  type: string;
  title: string;
  dogName?: string | null;
  dogId?: number | null;
  bookingId?: number | null;
}): string {
  const fromType = alertTypeToTitleCase(alert.type);
  const rawTitle = String(alert.title || "").trim();
  const titleWords = rawTitle.split(/\s+/).filter(Boolean);
  const looksLikeSnakeEcho =
    titleWords.length > 0 && titleWords.every((w) => w === w.toLowerCase() && !/[A-Z]/.test(w));
  const typeLabel =
    rawTitle && !looksLikeSnakeEcho ? alertTypeToTitleCase(rawTitle.replace(/_/g, " ")) : fromType;
  const dogLabel = alert.dogName?.trim() || (alert.dogId ? `Dog #${alert.dogId}` : "Guest");
  return `${typeLabel} — ${dogLabel}${bookingSuffix(alert.bookingId)}`;
}

type AppRole = "owner" | "employee" | "customer" | undefined;

type ComputedKind = "no_room" | "vaccine" | "missing_info";

type UnifiedAlert = {
  id: number;
  type: string;
  severity: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  isComputed?: boolean;
  kind?: ComputedKind;
  bookingId?: number;
  dogId?: number | null;
  dogName?: string | null;
  bookingStatus?: string;
};

/** Primary navigation for an alert — extend when adding new `alerts.type` or computed kinds. */
function getAlertTargetPath(role: AppRole, alert: UnifiedAlert): string {
  const a = alert as UnifiedAlert;
  if (a.kind === "no_room" && a.bookingId && a.dogId != null) {
    return `/rooms?assignBooking=${a.bookingId}&dogId=${a.dogId}`;
  }
  if (a.kind === "vaccine") {
    if (role === "customer" && a.dogId) return `/dogs/${a.dogId}`;
    if (role === "employee" && a.dogId) return `/dogs?dogId=${a.dogId}`;
    return "/bookings";
  }
  if (a.isComputed && a.kind === "missing_info") {
    if (role === "customer" && a.dogId) return `/dogs/${a.dogId}`;
    if (role === "employee" && a.dogId) return `/dogs?dogId=${a.dogId}`;
    return "/bookings";
  }

  const t = String(a.type || "").toLowerCase();
  if (t === "payment_due") return role === "customer" ? "/payments" : "/bookings";
  if (t === "booking_pending") return role === "customer" ? "/stays" : "/bookings";
  if (t === "dog_info_incomplete" || t === "missing_dog_info") {
    if (role === "customer" && a.dogId) return `/dogs/${a.dogId}`;
    if (role === "employee" && a.dogId) return `/dogs?dogId=${a.dogId}`;
    return "/bookings";
  }
  if (t.includes("vaccination")) {
    if (role === "customer" && a.dogId) return `/dogs/${a.dogId}`;
    if (role === "employee" && a.dogId) return `/dogs?dogId=${a.dogId}`;
    return "/bookings";
  }
  if (role === "customer" && a.dogId) return `/dogs/${a.dogId}`;
  if (role === "employee" && a.dogId) return `/dogs?dogId=${a.dogId}`;
  if (a.bookingId) return "/bookings";
  return "/bookings";
}

/** Short label for the footer hint (not raw path). */
function alertDestinationHint(path: string): string {
  if (path.startsWith("/rooms?")) return "room assignment";
  if (path.startsWith("/dogs?")) return "dogs in care";
  if (path.startsWith("/dogs/")) return "dog profile";
  if (path === "/payments") return "payments";
  if (path === "/stays") return "my stays";
  if (path === "/bookings") return "bookings";
  return "app";
}

function vaccineKindLabel(kind: string): string {
  if (kind === "missing") return "Vaccination Missing";
  if (kind === "expired") return "Vaccination Expired";
  return "Vaccination Expiring Soon";
}

export default function Alerts() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { activeKennelId: kennelId } = useKennel();
  const role = user?.role as AppRole;

  const { data: alerts, isLoading } = trpc.alert.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId && (user?.role === "owner" || user?.role === "employee") },
  );

  const { data: myAlerts } = trpc.alert.myAlerts.useQuery(undefined, {
    enabled: user?.role === "customer",
  });

  const { data: missingInfoAlerts } = trpc.alert.missingDogInfo.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId && (user?.role === "owner" || user?.role === "employee") },
  );
  const { data: unassignedRoomAlerts } = trpc.alert.unassignedRooms.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId && (user?.role === "owner" || user?.role === "employee") },
  );
  const { data: vaccineRows } = trpc.alert.vaccineCompliance.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId && (user?.role === "owner" || user?.role === "employee") },
  );

  const utils = trpc.useUtils();
  const markRead = trpc.alert.markRead.useMutation({
    onSuccess: () => {
      utils.alert.byKennel.invalidate();
      utils.alert.myAlerts.invalidate();
    },
  });

  const computedAlerts: UnifiedAlert[] = (missingInfoAlerts || []).map((issue, idx) => ({
    id: -(idx + 1),
    type: "dog_info_incomplete",
    severity: issue.bookingStatus === "checked_in" ? "critical" : "warning",
    title: `Dog Info Incomplete — ${issue.dogName}${bookingSuffix(issue.bookingId)}`,
    message:
      "Update the dog’s profile or booking so required fields are complete before check-in or while the guest is on site.",
    isRead: false,
    createdAt: issue.checkInDate,
    isComputed: true,
    kind: "missing_info",
    bookingId: issue.bookingId,
    dogId: issue.dogId,
    dogName: issue.dogName,
    bookingStatus: issue.bookingStatus,
  }));

  const noRoomComputed: UnifiedAlert[] = (unassignedRoomAlerts || []).map((item, idx) => ({
    id: -(1000 + idx + 1),
    type: "missing_dog_info",
    severity: "critical",
    title: `Room Not Assigned — ${item.dogName}${bookingSuffix(item.bookingId)}`,
    message: "Assign a room for this checked-in stay so staff know where the guest is housed.",
    isRead: false,
    createdAt: item.checkInDate,
    isComputed: true,
    bookingId: item.bookingId,
    dogId: item.dogId,
    dogName: item.dogName,
    bookingStatus: "checked_in",
    kind: "no_room",
  }));

  const vaccineComputed: UnifiedAlert[] = (vaccineRows || []).map((row, idx) => ({
    id: -(3000 + idx + 1),
    type: row.kind === "expired" ? "vaccination_expired" : row.kind === "missing" ? "vaccination_missing" : "vaccination_expiring_soon",
    severity: row.kind === "missing" || row.kind === "expired" ? "critical" : "warning",
    title: `${vaccineKindLabel(row.kind)} — ${row.dogName}${bookingSuffix(row.bookingId)}`,
    message: `Fix ${row.vaccineLabel} before check-in: ${row.detail}. Open the dog’s record or booking to update vaccines.`,
    isRead: false,
    createdAt: row.checkInDate,
    isComputed: true,
    bookingId: row.bookingId,
    dogId: row.dogId,
    dogName: row.dogName,
    bookingStatus: row.bookingStatus,
    kind: "vaccine",
  }));

  const persistedRaw = user?.role === "customer" ? myAlerts : alerts;
  const persistedMapped: UnifiedAlert[] = (persistedRaw || []).map((a: any) => ({
    id: a.id,
    type: a.type,
    severity: a.severity,
    title: buildPersistedAlertHeadline({
      type: a.type,
      title: a.title,
      dogName: a.dogName,
      dogId: a.dogId,
      bookingId: a.bookingId,
    }),
    message: a.message,
    isRead: a.isRead,
    createdAt: a.createdAt,
    dogId: a.dogId ?? null,
    bookingId: a.bookingId ?? null,
    dogName: a.dogName ?? null,
  }));

  const allAlerts: UnifiedAlert[] = [...vaccineComputed, ...noRoomComputed, ...computedAlerts, ...persistedMapped];

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-8 bg-muted rounded animate-pulse w-32" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const unread = allAlerts.filter((a) => !a.isRead);
  const read = allAlerts.filter((a) => a.isRead);

  const openAlert = (alert: UnifiedAlert) => {
    setLocation(getAlertTargetPath(role, alert));
  };

  const canDismissPersisted = (alert: UnifiedAlert) => !alert.isComputed && alert.id > 0;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Alerts</h1>
        {unread.length > 0 && (
          <span className="px-2.5 py-0.5 text-xs font-medium bg-destructive/10 text-destructive rounded-full shrink-0">
            {unread.length} new
          </span>
        )}
      </div>

      {allAlerts.length === 0 && (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="p-8 text-center">
            <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No alerts</p>
            <p className="text-xs text-muted-foreground mt-1">You&apos;re all caught up!</p>
          </CardContent>
        </Card>
      )}

      {unread.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New</h2>
          {unread.map((alert) => (
            <AlertItemCard
              key={alert.id}
              alert={alert}
              role={role}
              variant="unread"
              onOpen={() => openAlert(alert)}
              onDismiss={
                canDismissPersisted(alert)
                  ? (e) => {
                      e.stopPropagation();
                      markRead.mutate({ id: alert.id });
                    }
                  : undefined
              }
              dismissPending={markRead.isPending}
            />
          ))}
        </div>
      )}

      {read.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Earlier</h2>
          {read.map((alert) => (
            <AlertItemCard
              key={alert.id}
              alert={alert}
              role={role}
              variant="read"
              onOpen={() => openAlert(alert)}
              onDismiss={undefined}
              dismissPending={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertItemCard({
  alert,
  role,
  variant,
  onOpen,
  onDismiss,
  dismissPending,
}: {
  alert: UnifiedAlert;
  role: AppRole;
  variant: "unread" | "read";
  onOpen: () => void;
  onDismiss?: (e: React.MouseEvent) => void;
  dismissPending: boolean;
}) {
  const Icon = typeIcons[alert.type] || Info;
  const isUnread = variant === "unread";
  const target = getAlertTargetPath(role, alert);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={[
        "border-0 border-l-4 shadow-sm text-left w-full transition-all select-none",
        "cursor-pointer",
        "hover:shadow-md active:scale-[0.99] motion-safe:active:scale-[0.99]",
        severityStyles[alert.severity] || severityStyles.info,
        isUnread ? "" : "bg-white opacity-80",
      ].join(" ")}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <Icon
            className={`h-4 w-4 mt-0.5 shrink-0 ${
              isUnread
                ? alert.severity === "critical"
                  ? "text-destructive"
                  : alert.severity === "warning"
                    ? "text-warning"
                    : "text-primary"
                : "text-muted-foreground"
            }`}
          />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold leading-snug text-foreground">{alert.title}</p>
                  {alert.isComputed && (
                    <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-amber-100 text-amber-800 shrink-0">
                      ACTION NEEDED
                    </span>
                  )}
                </div>
                {alert.message ? (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{alert.message}</p>
                ) : null}
                {alert.bookingStatus && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Booking status: {alert.bookingStatus.replace(/_/g, " ")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onDismiss && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Dismiss alert"
                    disabled={dismissPending}
                    onClick={onDismiss}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Dismiss</span>
                  </Button>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" aria-hidden />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[10px] text-muted-foreground">
              <span>
                Tap anywhere to open <span className="font-medium text-foreground/80">{alertDestinationHint(target)}</span>
              </span>
              {onDismiss && <span className="hidden sm:inline">· ✕ dismisses</span>}
            </div>
            <p className="text-[10px] text-muted-foreground/80">{new Date(alert.createdAt).toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
