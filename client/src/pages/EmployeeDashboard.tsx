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
  ShieldAlert,
  Info,
} from "lucide-react";
import { toDateString, todayString, formatDate } from "@/lib/dateUtils";

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
  const { data: rooms } = trpc.room.byKennel.useQuery(
    { kennelId: kennelId!, asOfDate: today },
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
  const totalCapacity = (rooms || []).reduce((sum, r) => sum + (r.capacity || 0), 0);
  const occupied = (rooms || []).reduce((sum, r) => sum + (r.currentOccupancy ?? 0), 0);
  const openSpots = Math.max(0, totalCapacity - occupied);
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
          Hey {user?.name?.split(" ")[0] || "there"} 👋
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

      {(missingInfoAlerts?.length ?? 0) > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-800" />
              <p className="text-sm font-semibold text-amber-900">Missing dog profile info</p>
              <span className="ml-auto text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                {missingInfoAlerts!.length}
              </span>
            </div>
            <ul className="space-y-1.5 max-h-40 overflow-y-auto">
              {missingInfoAlerts!.slice(0, 6).map((row) => (
                <li key={row.bookingId} className="text-xs rounded-md bg-white/80 px-2 py-1.5 border border-amber-100">
                  <span className="font-semibold">{row.dogName}</span>
                  <span className="text-muted-foreground"> · </span>
                  <span className="text-[10px] text-muted-foreground">{row.details}</span>
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs w-full sm:w-auto"
              onClick={() => setLocation("/alerts")}
            >
              View all alerts
            </Button>
          </CardContent>
        </Card>
      )}

      {(vaccineIssues?.length ?? 0) > 0 && (
        <Card className="border-red-200 bg-red-50/60">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-700" />
              <p className="text-sm font-semibold text-red-900">Vaccine compliance</p>
              <span className="ml-auto text-xs font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded-full">
                {vaccineIssues!.length}
              </span>
            </div>
            <ul className="space-y-1.5 max-h-44 overflow-y-auto">
              {vaccineIssues!.slice(0, 6).map((row, i) => (
                <li key={`${row.bookingId}-${row.dogId}-${i}`} className="text-xs rounded-md bg-white/80 px-2 py-1.5 border border-red-100">
                  <span className="font-semibold">{row.dogName}</span>
                  <span className="text-muted-foreground"> · {row.vaccineLabel}</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{row.detail}</p>
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-red-300 text-red-900 w-full sm:w-auto"
              onClick={() => setLocation("/alerts")}
            >
              View all alerts
            </Button>
          </CardContent>
        </Card>
      )}

      {unreadSystemAlerts.length > 0 && (
        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">System alerts</p>
              <Badge variant="secondary" className="text-[10px]">
                {unreadSystemAlerts.length} unread
              </Badge>
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {unreadSystemAlerts.slice(0, 4).map((a) => (
                <li key={a.id} className="truncate">
                  · {a.title || a.type}
                </li>
              ))}
            </ul>
            <Button size="sm" variant="ghost" className="h-8 text-xs w-full sm:w-auto" onClick={() => setLocation("/alerts")}>
              Open full alerts
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card
          className="border-0 shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setLocation("/checkin")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ClipboardCheck className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">{todayCheckIns.length}</p>
            <p className="text-[10px] text-muted-foreground">Check-ins Today</p>
          </CardContent>
        </Card>

        <Card
          className="border-0 shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setLocation("/checkin")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-chart-5/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-chart-5" />
              </div>
            </div>
            <p className="text-2xl font-bold">{todayCheckOuts.length}</p>
            <p className="text-[10px] text-muted-foreground">Check-outs Today</p>
          </CardContent>
        </Card>

        <Card
          className="border-0 shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setLocation("/dogs")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-chart-4/10 flex items-center justify-center">
                <Dog className="h-4 w-4 text-chart-4" />
              </div>
            </div>
            <p className="text-2xl font-bold">{currentlyBoarded.length}</p>
            <p className="text-[10px] text-muted-foreground">Dogs Boarded</p>
          </CardContent>
        </Card>

        <Card
          className="border-0 shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setLocation("/rooms")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <DoorOpen className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">{rooms?.length ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Rooms</p>
            <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">
              {occupied}/{totalCapacity} occupied today
            </p>
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

      <Card
        className="border-0 shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setLocation("/rooms")}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <DoorOpen className="h-4 w-4 text-primary" /> Room Overview
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {rooms?.length || 0} rooms · {occupied}/{totalCapacity} occupied · {openSpots} open
              </p>
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs">
              Open
            </Button>
          </div>
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
