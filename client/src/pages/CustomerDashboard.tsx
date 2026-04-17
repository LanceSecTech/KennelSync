import { useAuth } from "@/_core/hooks/useAuth";
import { accountGreetingFirstName } from "@/lib/accountDisplayName";
import { isNativeAppClient } from "@/lib/capacitorPlatform";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMemo } from "react";
import { useLocation } from "wouter";
import {
  Dog,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronRight,
  Plus,
  MessageCircle,
} from "lucide-react";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isNative = useMemo(() => isNativeAppClient(), []);
  const { data: dashboard, isLoading } = trpc.stats.customerDashboard.useQuery();
  const { data: myBookings } = trpc.booking.myBookings.useQuery();

  const nextUpcoming = useMemo(() => {
    const list = myBookings || [];
    const upcoming = list
      .filter((b) => b.status === "pending" || b.status === "confirmed" || b.status === "checked_in")
      .sort((a, b) => String(a.checkInDate).localeCompare(String(b.checkInDate)));
    return upcoming[0] || null;
  }, [myBookings]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-48" />
        <div className="h-6 bg-muted rounded animate-pulse w-32" />
        <div className="grid grid-cols-1 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Hey {accountGreetingFirstName(user)} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Ready to book?</p>
      </div>

      {isNative && (
        <Card className="border-0 shadow-sm bg-white rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button className="h-11 rounded-xl justify-start gap-2" onClick={() => setLocation("/dogs")}>
                <Plus className="h-4 w-4" />
                Add Pet
              </Button>
              <Button
                variant="secondary"
                className="h-11 rounded-xl justify-start gap-2"
                onClick={() => setLocation("/book")}
              >
                <CalendarDays className="h-4 w-4" />
                New Booking
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isNative && (
        <Card className="border-0 shadow-sm bg-white rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Upcoming Booking</h3>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setLocation("/stays")}>
                View all
              </Button>
            </div>
            {nextUpcoming ? (
              <button className="w-full text-left rounded-xl bg-muted/40 p-3" onClick={() => setLocation("/stays")}>
                <p className="text-sm font-semibold">{(nextUpcoming as any).dogName || "Your dog"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Check-in {(nextUpcoming as any).checkInDate} · {(nextUpcoming as any).status.replace("_", " ")}
                </p>
              </button>
            ) : (
              <div className="rounded-xl border border-dashed p-3 text-center">
                <p className="text-sm text-muted-foreground">No upcoming bookings yet</p>
                <Button size="sm" className="mt-2" onClick={() => setLocation("/book")}>
                  Create your first booking
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* My Dogs Card */}
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm bg-white"
        onClick={() => setLocation("/dogs")}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Dog className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">My Dogs</h3>
                <p className="text-xs text-muted-foreground">
                  {dashboard?.dogsCount || 0} dog{(dashboard?.dogsCount || 0) !== 1 ? "s" : ""} on file
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {dashboard?.dogStatuses?.some(d => d.status === "action_needed") && (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-destructive/10 text-destructive rounded-full">
                  Action needed
                </span>
              )}
              {dashboard?.dogStatuses?.every(d => d.status === "ready") && dashboard.dogsCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-success/10 text-success rounded-full">
                  All good
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {isNative && (!dashboard?.dogsCount || dashboard.dogsCount === 0) && (
        <Card className="border-dashed border-2 bg-muted/30 rounded-2xl">
          <CardContent className="p-5 text-center">
            <Dog className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No pets yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add your first pet to start booking stays.</p>
            <Button size="sm" className="mt-3" onClick={() => setLocation("/dogs")}>
              Add Pet
            </Button>
          </CardContent>
        </Card>
      )}

      {/* My Stays Card */}
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm bg-white"
        onClick={() => setLocation("/stays")}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-chart-4/10 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">My Stays</h3>
                <p className="text-xs text-muted-foreground">
                  {dashboard?.upcomingStays || 0} upcoming
                  {dashboard?.activeStays ? ` · ${dashboard.activeStays} active` : ""}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {isNative && (!dashboard?.upcomingStays || dashboard.upcomingStays === 0) && (
        <Card className="border-dashed border-2 bg-muted/30 rounded-2xl">
          <CardContent className="p-5 text-center">
            <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No upcoming bookings</p>
            <p className="text-xs text-muted-foreground mt-1">Book a stay to see it here.</p>
            <Button size="sm" className="mt-3" onClick={() => setLocation("/book")}>
              New Booking
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Action Needed Card */}
      {dashboard?.actionItems && dashboard.actionItems.length > 0 && (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h3 className="font-semibold text-sm">Action Needed</h3>
              <span className="ml-auto px-2 py-0.5 text-[10px] font-medium bg-warning/10 text-warning-foreground rounded-full">
                {dashboard.actionItems.length}
              </span>
            </div>
            <div className="space-y-2">
              {dashboard.actionItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => item.dogId && setLocation(`/dogs/${item.dogId}`)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  {item.severity === "critical" ? (
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  ) : item.severity === "warning" ? (
                    <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                  ) : (
                    <Info className="h-4 w-4 text-primary shrink-0" />
                  )}
                  <span className="text-xs text-foreground">{item.message}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Good State */}
      {(!dashboard?.actionItems || dashboard.actionItems.length === 0) && (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">All Good!</h3>
                <p className="text-xs text-muted-foreground">No action items at this time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isNative && (
        <Card className="border-0 shadow-sm bg-white rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Recent Activity</h3>
            </div>
            <div className="space-y-2">
              {(dashboard?.actionItems || []).slice(0, 3).map((item, i) => (
                <div key={i} className="rounded-lg bg-muted/40 p-2.5 text-xs text-foreground">
                  {item.message}
                </div>
              ))}
              {(!dashboard?.actionItems || dashboard.actionItems.length === 0) && (
                <p className="text-xs text-muted-foreground">No recent activity yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
