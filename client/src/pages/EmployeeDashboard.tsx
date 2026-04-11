import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Clock,
  ClipboardCheck,
  Dog,
  CalendarDays,
  AlertTriangle,
  DoorOpen,
  Sparkles,
  Bell,
} from "lucide-react";
import { toDateString, todayString, formatDate } from "@/lib/dateUtils";
import { accountGreetingFirstName } from "@/lib/accountDisplayName";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { activeKennelId: kennelId } = useKennel();
  const today = todayString();

  const { data: bookings, isLoading } = trpc.booking.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const { data: todayTasks } = trpc.booking.todayTasks.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const { data: noRoomAlerts } = trpc.alert.unassignedRooms.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const { data: vaccineIssues } = trpc.alert.vaccineCompliance.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const { data: missingInfoAlerts } = trpc.alert.missingDogInfo.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const { data: persistedAlerts } = trpc.alert.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const [, setLocation] = useLocation();

  const todayCheckIns =
    bookings?.filter(
      (b) => b.status === "confirmed" && toDateString(b.checkInDate) === today
    ) || [];

  const todayCheckOuts =
    bookings?.filter((b) => {
      if (b.status !== "checked_in") return false;
      const isDaycare = (b as any).serviceType === "daycare";
      if (isDaycare) return toDateString(b.checkInDate) === today;
      return !!b.checkOutDate && toDateString(b.checkOutDate) === today;
    }) || [];

  const currentlyBoarded = bookings?.filter((b) => b.status === "checked_in") || [];
  const noRoomItems = noRoomAlerts || [];
  const unreadSystemAlerts = (persistedAlerts || []).filter((a) => !a.isRead);
  const listAlertCount =
    (missingInfoAlerts?.length ?? 0) + (vaccineIssues?.length ?? 0) + unreadSystemAlerts.length;
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-48" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">
          Hey {accountGreetingFirstName(user)} 👋
        </h1>
        <p className="text-sm text-muted-foreground">Here's your day at a glance</p>
      </div>

      {noRoomItems.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/70">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <p className="text-sm font-semibold text-amber-800">
                Dogs checked in without room assignment
              </p>
            </div>
            {noRoomItems.map((alert) => (
              <div
                key={alert.bookingId}
                className="flex items-center justify-between gap-2 rounded-md bg-white px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{alert.dogName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{alert.customerLabel}</p>
                </div>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    setLocation(`/rooms?assignBooking=${alert.bookingId}&dogId=${alert.dogId}`)
                  }
                >
                  <DoorOpen className="h-3 w-3 mr-1" /> Assign Room
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {listAlertCount > 0 && (
        <button
          type="button"
          onClick={() => setLocation("/alerts")}
          className="w-full text-left rounded-xl border border-red-200/80 bg-red-50/70 shadow-sm px-4 py-3 flex items-center justify-between gap-3 hover:bg-red-50 hover:shadow-md transition-[box-shadow,background-color] touch-manipulation"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Bell className="h-4 w-4 text-red-700 shrink-0" aria-hidden />
            <span className="text-sm font-semibold text-red-950 truncate">Alerts</span>
          </span>
          {/* Employee dashboard — alert count badge: tweak `h-8 min-w-8`, `bg-red-600`, `text-sm` here */}
          <span
            className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-red-600 px-2 text-sm font-bold tabular-nums text-white shadow-sm"
            aria-label={`${listAlertCount} items on Alerts`}
          >
            {listAlertCount}
          </span>
        </button>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card
          className="border-0 shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setLocation("/checkin")}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold tabular-nums">{todayCheckIns.length}</p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight">Check-ins today</p>
          </CardContent>
        </Card>

        <Card
          className="border-0 shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setLocation("/checkin")}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-chart-5/10 flex items-center justify-center shrink-0">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-chart-5" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold tabular-nums">{todayCheckOuts.length}</p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight">Check-outs today</p>
          </CardContent>
        </Card>

        <Card
          className="border-0 shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setLocation("/dogs")}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-chart-4/10 flex items-center justify-center shrink-0">
                <Dog className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-chart-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold tabular-nums">{currentlyBoarded.length}</p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight">Dogs boarded</p>
          </CardContent>
        </Card>

      </div>

      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" /> Today&apos;s Bath/Nail Tasks (Checkout)
          </h3>
          {!todayTasks || todayTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No bath/nail tasks for today&apos;s check-outs.</p>
          ) : (
            <div className="space-y-2">
              {todayTasks.slice(0, 6).map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{task.taskName} · {task.dogName}</p>
                    <p className="text-[10px] text-muted-foreground">Booking #{task.bookingId}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {task.taskStatus.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-primary" /> Today&apos;s Schedule
          </h3>
          {todayCheckIns.length === 0 && todayCheckOuts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No scheduled activity today</p>
          ) : (
            <div className="space-y-2">
              {todayCheckIns.map((b) => (
                <div key={`in-${b.id}`} className="flex items-center gap-2 p-2 rounded-lg bg-primary/5">
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded">IN</span>
                  <span className="text-xs font-medium min-w-0 truncate">
                    {(b as any).dogNames?.length > 0 ? (b as any).dogNames.join(", ") : ((b as any).dogName || `Booking #${b.id}`)}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{formatDate(b.checkInDate)}</span>
                </div>
              ))}
              {todayCheckOuts.map((b) => (
                <div key={`out-${b.id}`} className="flex items-center gap-2 p-2 rounded-lg bg-chart-5/5">
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-chart-5/10 text-chart-5 rounded">OUT</span>
                  <span className="text-xs font-medium min-w-0 truncate">
                    {(b as any).dogNames?.length > 0 ? (b as any).dogNames.join(", ") : ((b as any).dogName || `Booking #${b.id}`)}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    {b.checkOutDate && formatDate(b.checkOutDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
