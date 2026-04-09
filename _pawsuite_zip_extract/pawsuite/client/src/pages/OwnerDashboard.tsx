import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { DollarSign, CalendarDays, Users, TrendingUp, Clock, AlertCircle, Building2, DoorOpen } from "lucide-react";

export default function OwnerDashboard() {
  const [, setLocation] = useLocation();
  const { activeKennelId: kennelId, activeKennelName } = useKennel();
  const { data: stats, isLoading } = trpc.stats.ownerDashboard.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );

  if (!kennelId && !isLoading) {
    return <SetupKennel />;
  }

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

  const occupancyPct = stats ? Math.round((stats.todayOccupancy / Math.max(stats.totalCapacity, 1)) * 100) : 0;

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{activeKennelName || "Your Kennel"}</p>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/financials")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-success" />
              </div>
            </div>
            <p className="text-xl font-bold">${(stats?.monthRevenue || 0).toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">This Month</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/financials")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-xl font-bold">${(stats?.totalRevenue || 0).toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Occupancy */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-primary" /> Today's Occupancy
            </h3>
            <span className="text-sm font-bold text-primary">{occupancyPct}%</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                occupancyPct >= 90 ? "bg-destructive" : occupancyPct >= 70 ? "bg-warning" : "bg-primary"
              }`}
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {stats?.todayOccupancy || 0} of {stats?.totalCapacity || 0} spots filled
          </p>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-0 shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/bookings")}>
          <CardContent className="p-3 text-center">
            <Clock className="h-4 w-4 text-warning mx-auto mb-1" />
            <p className="text-lg font-bold">{stats?.pendingBookings || 0}</p>
            <p className="text-[10px] text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/bookings")}>
          <CardContent className="p-3 text-center">
            <CalendarDays className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">{stats?.activeBookings || 0}</p>
            <p className="text-[10px] text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/bookings")}>
          <CardContent className="p-3 text-center">
            <Users className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-lg font-bold">{stats?.totalBookings || 0}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Room Management Link */}
      <Card className="border-0 shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/rooms")}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <DoorOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Room Management</p>
            <p className="text-xs text-muted-foreground">Add, edit, and manage kennel rooms</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SetupKennel() {
  const [, setLocation] = useLocation();
  return (
    <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
      <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-lg font-bold mb-1">Set Up Your Kennel</h2>
      <p className="text-sm text-muted-foreground text-center mb-4">Create your kennel profile to start managing bookings</p>
      <button
        onClick={() => setLocation("/kennel")}
        className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
      >
        Create Kennel
      </button>
    </div>
  );
}
