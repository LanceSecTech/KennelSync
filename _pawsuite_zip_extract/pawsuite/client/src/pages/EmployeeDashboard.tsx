import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Clock, ClipboardCheck, Dog, Bell, CalendarDays, Users, AlertTriangle, DoorOpen } from "lucide-react";
import { toDateString, todayString, formatDate } from "@/lib/dateUtils";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { activeKennelId: kennelId } = useKennel();
  const { data: bookings, isLoading } = trpc.booking.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const [, setLocation] = useLocation();

  const today = todayString();

  const todayCheckIns = bookings?.filter(b =>
    (b.status === "confirmed") &&
    toDateString(b.checkInDate) === today
  ) || [];

  const todayCheckOuts = bookings?.filter(b =>
    (b.status === "checked_in") &&
    b.checkOutDate && toDateString(b.checkOutDate) === today
  ) || [];

  const currentlyBoarded = bookings?.filter(b => b.status === "checked_in") || [];

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-48" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
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

      {/* Quick Stats */}
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
          onClick={() => setLocation("/alerts")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <Bell className="h-4 w-4 text-warning" />
              </div>
            </div>
            <p className="text-2xl font-bold">—</p>
            <p className="text-[10px] text-muted-foreground">Alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Room Overview Link */}
      <Card className="border-0 shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/rooms")}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <DoorOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Room Overview</p>
            <p className="text-xs text-muted-foreground">View room assignments and availability</p>
          </div>
        </CardContent>
      </Card>

      {/* Today's Schedule */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-primary" /> Today's Schedule
          </h3>
          {todayCheckIns.length === 0 && todayCheckOuts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No scheduled activity today</p>
          ) : (
            <div className="space-y-2">
              {todayCheckIns.map(b => (
                <div key={`in-${b.id}`} className="flex items-center gap-2 p-2 rounded-lg bg-primary/5">
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded">IN</span>
                  <span className="text-xs font-medium">Booking #{b.id}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {formatDate(b.checkInDate)}
                  </span>
                </div>
              ))}
              {todayCheckOuts.map(b => (
                <div key={`out-${b.id}`} className="flex items-center gap-2 p-2 rounded-lg bg-chart-5/5">
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-chart-5/10 text-chart-5 rounded">OUT</span>
                  <span className="text-xs font-medium">Booking #{b.id}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
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
