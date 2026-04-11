import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays, CheckCircle2, XCircle, Pencil, AlertTriangle, ShieldAlert, ShieldCheck,
  LayoutList, CalendarRange, Calendar, ChevronLeft, ChevronRight, DoorOpen,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { formatDate, toDateString, todayString, parseLocalDate } from "@/lib/dateUtils";
import { DogBadgesInline } from "@/components/DogBadgesInline";

type FilterType = "all" | "pending" | "confirmed" | "cancelled";
type ScheduleMode = "list" | "day" | "week" | "month";

/**
 * Bookings toolbar: desktop uses pill buttons; mobile uses Selects (see JSX).
 * Adjust labels or add modes here — wire new schedule modes in state + render branches below.
 */
const VIEW_MODE_OPTIONS: { mode: ScheduleMode; label: string; icon: typeof LayoutList }[] = [
  { mode: "list", label: "List", icon: LayoutList },
  { mode: "day", label: "Day", icon: Calendar },
  { mode: "week", label: "Week", icon: CalendarRange },
  { mode: "month", label: "Month", icon: CalendarDays },
];

/** List view status filter — paired with mobile “Status” Select and desktop pills. */
const STATUS_FILTER_OPTIONS: { id: FilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "cancelled", label: "Canceled/Denied" },
];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  checked_in: "bg-green-100 text-green-800",
  checked_out: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-gray-100 text-gray-800",
};

type OwnerEditSavePayload = {
  checkInDate?: string;
  checkOutDate?: string;
  notes?: string | null;
  serviceId?: number;
  dogId?: number;
  addOnIds?: number[];
  totalPrice?: number;
};

export default function OwnerBookings() {
  const { activeKennelId: kennelId } = useKennel();
  const { data: bookings, isLoading } = trpc.booking.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const { data: allDogs } = trpc.dog.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const { data: services } = trpc.service.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const { data: availableAddOns } = trpc.addOn.activeByKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const { data: missingInfo } = trpc.alert.missingDogInfo.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const [filter, setFilter] = useState<FilterType>("all");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("list");
  const [scheduleDay, setScheduleDay] = useState(() => todayString());
  const [weekStart, setWeekStart] = useState(() => {
    const t = parseLocalDate(todayString());
    if (!t) return todayString();
    const d = new Date(t);
    d.setDate(d.getDate() - d.getDay());
    return toDateString(d);
  });
  const [monthCursor, setMonthCursor] = useState(() => {
    const t = parseLocalDate(todayString());
    return t ? new Date(t.getFullYear(), t.getMonth(), 1) : new Date();
  });
  const [editBooking, setEditBooking] = useState<any>(null);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [planningBooking, setPlanningBooking] = useState<any>(null);
  const utils = trpc.useUtils();

  const { data: editBookingAddOns, isLoading: editAddOnsLoading } = trpc.addOn.byBooking.useQuery(
    { bookingId: editBooking?.id ?? 0, kennelId: kennelId! },
    { enabled: !!editBooking && !!kennelId }
  );

  const dogNameMap = useMemo(() => {
    const map = new Map<number, string>();
    if (allDogs) {
      for (const dog of allDogs) {
        map.set(dog.id, dog.name);
      }
    }
    return map;
  }, [allDogs]);

  const missingInfoMap = useMemo(() => {
    const map = new Map<number, { dogName: string; details: string[] }>();
    if (missingInfo) {
      for (const issue of missingInfo) {
        map.set(issue.bookingId, { dogName: issue.dogName, details: [issue.details] });
      }
    }
    return map;
  }, [missingInfo]);
  const dogIdsAcrossBookings = useMemo(
    () =>
      Array.from(
        new Set(
          (bookings || []).flatMap((b: any) =>
            Array.isArray(b.dogIdsOnBooking) && b.dogIdsOnBooking.length ? b.dogIdsOnBooking : [b.dogId],
          ),
        ),
      ),
    [bookings],
  );
  const { data: badgeCatalog } = trpc.dogBadge.listByKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId },
  );
  const { data: badgeAssignments } = trpc.dogBadge.assignedForDogs.useQuery(
    { kennelId: kennelId!, dogIds: dogIdsAcrossBookings },
    { enabled: !!kennelId && dogIdsAcrossBookings.length > 0 },
  );
  const badgeByKey = useMemo(
    () => new Map(((badgeCatalog || []) as any[]).map((b: any) => [String(b.key || "").toLowerCase(), b])),
    [badgeCatalog],
  );
  const badgeKeysForBooking = (b: any) => {
    const ids: number[] = Array.isArray(b.dogIdsOnBooking) && b.dogIdsOnBooking.length ? b.dogIdsOnBooking : [b.dogId];
    return Array.from(
      new Set(ids.flatMap((id) => ((badgeAssignments as any)?.[String(id)] || []).map((k: string) => String(k).toLowerCase()))),
    );
  };

  const updateStatus = trpc.booking.updateStatus.useMutation({
    onSuccess: () => {
      utils.booking.byKennel.invalidate();
      utils.booking.today.invalidate();
      utils.stats.ownerDashboard.invalidate();
      utils.alert.missingDogInfo.invalidate();
      utils.alert.vaccineCompliance.invalidate();
      utils.room.dailyAvailability.invalidate();
      utils.room.byKennel.invalidate();
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  const approveStay = (booking: any) => {
    updateStatus.mutate(
      { id: booking.id, status: "confirmed" },
      {
        onSuccess: () => {
          setPlanningBooking({ ...booking, status: "confirmed" });
          toast.success("Stay approved — plan room placement below.");
        },
      }
    );
  };

  const editMutation = trpc.booking.edit.useMutation({
    onSuccess: () => {
      utils.booking.byKennel.invalidate();
      utils.booking.today.invalidate();
      utils.addOn.byBooking.invalidate();
      utils.stats.ownerDashboard.invalidate();
      utils.alert.missingDogInfo.invalidate();
      utils.alert.vaccineCompliance.invalidate();
      setEditBooking(null);
      toast.success("Booking updated!");
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelMutation = trpc.booking.cancel.useMutation({
    onSuccess: () => {
      utils.booking.byKennel.invalidate();
      utils.booking.today.invalidate();
      utils.stats.ownerDashboard.invalidate();
      setCancelTarget(null);
      toast.success("Booking cancelled");
    },
    onError: (e) => toast.error(e.message),
  });

  const terminalStatuses = useMemo(() => new Set(["cancelled", "completed"]), []);

  const filtered = useMemo(() => {
    if (!bookings) return [];
    if (filter === "all") {
      return bookings.filter((b) => !terminalStatuses.has(b.status));
    }
    if (filter === "pending") {
      return bookings.filter((b) => b.status === "pending");
    }
    if (filter === "confirmed") {
      return bookings.filter((b) => b.status === "confirmed" || b.status === "checked_in");
    }
    if (filter === "cancelled") {
      return bookings.filter((b) => b.status === "cancelled" || b.status === "completed");
    }
    return bookings;
  }, [bookings, filter, terminalStatuses]);

  /** Operational schedule only: approved stays (not pending requests). */
  const scheduleBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter((b) => b.status === "confirmed" || b.status === "checked_in");
  }, [bookings]);

  const dogCountForBooking = (b: any) => {
    if (Array.isArray(b.dogIdsOnBooking) && b.dogIdsOnBooking.length) return b.dogIdsOnBooking.length;
    if (Array.isArray(b.dogNames) && b.dogNames.length) return b.dogNames.length;
    return 1;
  };

  /** Daycare: depart same day as check-in; boarding: scheduled check-out date. */
  const departureDateKey = (b: any): string | null => {
    const isDaycare = b.serviceType === "daycare";
    if (isDaycare) return toDateString(b.checkInDate);
    if (b.checkOutDate) return toDateString(b.checkOutDate);
    return null;
  };

  const bookingsCheckingOutOn = (dateKey: string) =>
    scheduleBookings.filter((b) => departureDateKey(b) === dateKey);

  const weekDates = useMemo(() => {
    const s = parseLocalDate(weekStart);
    if (!s) return [] as string[];
    const out: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(s.getFullYear(), s.getMonth(), s.getDate() + i);
      out.push(toDateString(d));
    }
    return out;
  }, [weekStart]);

  const monthCells = useMemo(() => {
    const y = monthCursor.getFullYear();
    const m = monthCursor.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const pad = first.getDay();
    const dim = last.getDate();
    const cells: { date: string | null; inCount: number; outCount: number }[] = [];
    for (let i = 0; i < pad; i++) cells.push({ date: null, inCount: 0, outCount: 0 });
    for (let d = 1; d <= dim; d++) {
      const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const checkingIn = scheduleBookings.filter((b) => toDateString(b.checkInDate) === ds);
      const checkingOut = bookingsCheckingOutOn(ds);
      const inCount = checkingIn.reduce((sum, b) => sum + dogCountForBooking(b), 0);
      const outCount = checkingOut.reduce((sum, b) => sum + dogCountForBooking(b), 0);
      cells.push({ date: ds, inCount, outCount });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, inCount: 0, outCount: 0 });
    return cells;
  }, [monthCursor, scheduleBookings]);

  const bookingsCheckingInOn = (dateKey: string) =>
    scheduleBookings.filter((b) => toDateString(b.checkInDate) === dateKey);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-8 bg-muted rounded animate-pulse w-32" />
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
      </div>
    );
  }

  const statusFilterCount = (id: FilterType) =>
    id === "all"
      ? (bookings?.filter((b) => !terminalStatuses.has(b.status)).length ?? 0)
      : id === "pending"
        ? (bookings?.filter((b) => b.status === "pending").length ?? 0)
        : id === "confirmed"
          ? (bookings?.filter((b) => b.status === "confirmed" || b.status === "checked_in").length ?? 0)
          : (bookings?.filter((b) => b.status === "cancelled" || b.status === "completed").length ?? 0);

  return (
    <div className="p-4 space-y-3 md:space-y-4">
      <h1 className="text-xl font-bold">Bookings</h1>

      {/* Desktop: view mode pills */}
      <div className="hidden md:flex gap-1 flex-wrap">
        {VIEW_MODE_OPTIONS.map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            type="button"
            onClick={() => setScheduleMode(mode)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              scheduleMode === mode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* Mobile: single View select */}
      <div className="md:hidden space-y-1">
        <Label htmlFor="bookings-view-mode" className="text-xs font-medium text-muted-foreground">
          View
        </Label>
        <Select value={scheduleMode} onValueChange={(v) => setScheduleMode(v as ScheduleMode)}>
          <SelectTrigger id="bookings-view-mode" className="w-full h-9 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VIEW_MODE_OPTIONS.map(({ mode, label }) => (
              <SelectItem key={mode} value={mode}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {scheduleMode === "list" && (
        <>
          {/* Desktop: status pills */}
          <div className="hidden md:flex gap-1.5 flex-wrap">
            {STATUS_FILTER_OPTIONS.map(({ id, label }) => {
              const count = statusFilterCount(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    filter === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
          {/* Mobile: single Status select */}
          <div className="md:hidden space-y-1">
            <Label htmlFor="bookings-status-filter" className="text-xs font-medium text-muted-foreground">
              Status
            </Label>
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
              <SelectTrigger id="bookings-status-filter" className="w-full h-9 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map(({ id, label }) => (
                  <SelectItem key={id} value={id}>
                    {label} ({statusFilterCount(id)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {scheduleMode === "list" && (() => {
        const t = todayString();
        const ins = scheduleBookings.filter((b) => toDateString(b.checkInDate) === t);
        const outs = bookingsCheckingOutOn(t);
        const inDogs = ins.reduce((s, b) => s + dogCountForBooking(b), 0);
        const outDogs = outs.reduce((s, b) => s + dogCountForBooking(b), 0);
        return (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
            <span className="font-semibold text-muted-foreground">Today ({formatDate(t)})</span>
            <span className="font-bold text-primary tabular-nums">{inDogs} In</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-bold text-chart-5 tabular-nums">{outDogs} Out</span>
            <span className="hidden md:inline text-[10px] text-muted-foreground md:ml-auto md:max-w-[min(24rem,100%)]">
              In = check-ins; Out = departures (boarding: checkout date; daycare: same day as check-in).
            </span>
          </div>
        );
      })()}

      {scheduleMode === "day" && (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs font-semibold">Check-ins on</Label>
              <Input
                type="date"
                className="w-auto max-w-[11rem] h-9 text-xs"
                value={scheduleDay}
                onChange={(e) => setScheduleDay(e.target.value)}
              />
            </div>
            {(() => {
              const dayBookings = bookingsCheckingInOn(scheduleDay);
              const outBookings = bookingsCheckingOutOn(scheduleDay);
              const inDogs = dayBookings.reduce((sum, b) => sum + dogCountForBooking(b), 0);
              const outDogs = outBookings.reduce((sum, b) => sum + dogCountForBooking(b), 0);
              return (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
                    <span className="text-xs font-medium text-muted-foreground">Dogs this day</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span>
                        <span className="text-muted-foreground font-normal">In </span>
                        <span className="text-lg font-bold text-primary tabular-nums">{inDogs}</span>
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span>
                        <span className="text-muted-foreground font-normal">Out </span>
                        <span className="text-lg font-bold text-chart-5 tabular-nums">{outDogs}</span>
                      </span>
                    </div>
                  </div>
                  {dayBookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No check-ins this day</p>
                  ) : (
                    <ul className="space-y-2">
                      {dayBookings.map((b) => {
                        const names = (b as any).dogNames?.length
                          ? (b as any).dogNames.join(", ")
                          : (b as any).dogName || dogNameMap.get(b.dogId) || "Dog";
                        const dc = dogCountForBooking(b);
                        return (
                          <li
                            key={b.id}
                            className="rounded-lg border border-border/60 px-3 py-2 text-sm"
                          >
                            <span className="font-semibold">{names}</span>
                            <DogBadgesInline badgeKeys={badgeKeysForBooking(b)} badgeByKey={badgeByKey} className="ml-2" />
                            {dc > 1 && (
                              <span className="ml-2 text-[10px] font-semibold text-primary uppercase">
                                Same reservation · #{b.id}
                              </span>
                            )}
                            <span className="block text-[10px] text-muted-foreground mt-0.5">
                              {(b as any).serviceName || b.status}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {outBookings.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Checking out
                      </p>
                      <ul className="space-y-2">
                        {outBookings.map((b) => {
                          const names = (b as any).dogNames?.length
                            ? (b as any).dogNames.join(", ")
                            : (b as any).dogName || dogNameMap.get(b.dogId) || "Dog";
                          const dc = dogCountForBooking(b);
                          return (
                            <li
                              key={`out-${b.id}`}
                              className="rounded-lg border border-chart-5/30 bg-chart-5/5 px-3 py-2 text-sm"
                            >
                              <span className="font-semibold">{names}</span>
                              <DogBadgesInline badgeKeys={badgeKeysForBooking(b)} badgeByKey={badgeByKey} className="ml-2" />
                              {dc > 1 && (
                                <span className="ml-2 text-[10px] font-semibold text-chart-5 uppercase">
                                  Same reservation · #{b.id}
                                </span>
                              )}
                              <span className="block text-[10px] text-muted-foreground mt-0.5">
                                {(b as any).serviceName || b.status}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {scheduleMode === "week" && (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => {
                  const s = parseLocalDate(weekStart);
                  if (!s) return;
                  s.setDate(s.getDate() - 7);
                  setWeekStart(toDateString(s));
                }}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </Button>
              <span className="text-xs font-medium text-center flex-1">
                {weekDates[0] && weekDates[6] && (
                  <>
                    {formatDate(weekDates[0])} – {formatDate(weekDates[6])}
                  </>
                )}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => {
                  const s = parseLocalDate(weekStart);
                  if (!s) return;
                  s.setDate(s.getDate() + 7);
                  setWeekStart(toDateString(s));
                }}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            {weekStart !== todayString().slice(0, 10) && (
              <button
                type="button"
                className="text-[10px] text-primary font-medium"
                onClick={() => {
                  const t = parseLocalDate(todayString());
                  if (!t) return;
                  const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - t.getDay());
                  setWeekStart(toDateString(d));
                }}
              >
                Jump to this week
              </button>
            )}
            {(() => {
              let weekIn = 0;
              let weekOut = 0;
              const blocks = weekDates.map((d) => {
                const list = bookingsCheckingInOn(d);
                const outList = bookingsCheckingOutOn(d);
                const inDogs = list.reduce((sum, b) => sum + dogCountForBooking(b), 0);
                const outDogs = outList.reduce((sum, b) => sum + dogCountForBooking(b), 0);
                weekIn += inDogs;
                weekOut += outDogs;
                return { d, list, outList, inDogs, outDogs };
              });
              return (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
                    <span className="text-xs font-medium text-muted-foreground">Week totals (dogs)</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span>
                        <span className="text-muted-foreground font-normal">In </span>
                        <span className="text-lg font-bold text-primary tabular-nums">{weekIn}</span>
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span>
                        <span className="text-muted-foreground font-normal">Out </span>
                        <span className="text-lg font-bold text-chart-5 tabular-nums">{weekOut}</span>
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {blocks.map(({ d, list, inDogs, outDogs }) => (
                      <div key={d} className="rounded-lg border border-border/60 p-3">
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                          <span className="text-xs font-bold">{formatDate(d)}</span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            <span className="font-semibold text-primary">{inDogs} In</span>
                            <span className="mx-1">·</span>
                            <span className="font-semibold text-chart-5">{outDogs} Out</span>
                          </span>
                        </div>
                        {list.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground">No check-ins</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {list.map((b) => {
                              const names = (b as any).dogNames?.length
                                ? (b as any).dogNames.join(", ")
                                : (b as any).dogName || dogNameMap.get(b.dogId) || "Dog";
                              const dc = dogCountForBooking(b);
                              return (
                                <li key={b.id} className="text-xs">
                                  <span className="font-medium">{names}</span>
                                  <DogBadgesInline badgeKeys={badgeKeysForBooking(b)} badgeByKey={badgeByKey} className="ml-1" />
                                  {dc > 1 && (
                                    <span className="text-[10px] text-primary ml-1">· together #{b.id}</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {scheduleMode === "month" && (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setMonthCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-sm font-semibold">
                {monthCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setMonthCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            {(() => {
              const dated = monthCells.filter((c) => c.date);
              const monthIn = dated.reduce((s, c) => s + c.inCount, 0);
              const monthOut = dated.reduce((s, c) => s + c.outCount, 0);
              return (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">Month totals (dogs)</span>
                  <div className="flex items-center gap-3 text-sm">
                    <span>
                      <span className="text-muted-foreground font-normal">In </span>
                      <span className="text-lg font-bold text-primary tabular-nums">{monthIn}</span>
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span>
                      <span className="text-muted-foreground font-normal">Out </span>
                      <span className="text-lg font-bold text-chart-5 tabular-nums">{monthOut}</span>
                    </span>
                  </div>
                </div>
              );
            })()}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground uppercase">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((x) => (
                <div key={x}>{x}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((cell, idx) =>
                cell.date ? (
                  <div
                    key={cell.date}
                    className={`min-h-[3rem] rounded-lg border p-1.5 text-left ${
                      cell.date === todayString() ? "border-primary bg-primary/5" : "border-border/60 bg-muted/20"
                    }`}
                  >
                    <div className="text-xs font-bold">{parseInt(cell.date.slice(8), 10)}</div>
                    <div className="text-[9px] font-semibold mt-0.5 leading-tight space-y-0.5">
                      {cell.inCount > 0 || cell.outCount > 0 ? (
                        <>
                          {cell.inCount > 0 && (
                            <div className="text-primary tabular-nums">{cell.inCount} In</div>
                          )}
                          {cell.outCount > 0 && (
                            <div className="text-chart-5 tabular-nums">{cell.outCount} Out</div>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div key={`pad-${idx}`} className="min-h-[3rem]" />
                )
              )}
            </div>
            <p className="hidden md:block text-[10px] text-muted-foreground">
              In = dogs checking in that day. Out = departures that day (boarding: checkout date; daycare: check-in
              day).
            </p>
          </CardContent>
        </Card>
      )}

      {scheduleMode === "list" && filtered.length === 0 && (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="p-6 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No bookings found</p>
          </CardContent>
        </Card>
      )}

      {scheduleMode === "list" && filtered.map(booking => {
        const issues = missingInfoMap.get(booking.id);
        const dogLabel = (booking as any).dogNames?.length > 0
          ? (booking as any).dogNames.join(", ")
          : ((booking as any).dogName || dogNameMap.get(booking.dogId) || "Unknown Dog");
        const dogCount =
          (booking as any).dogIdsOnBooking?.length ||
          (booking as any).dogNames?.length ||
          1;
        const canOwnerEdit = ["pending", "confirmed", "checked_in"].includes(booking.status);

        return (
          <Card key={booking.id} className={`border-0 shadow-sm bg-white ${issues ? 'ring-1 ring-amber-300' : ''}`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 mb-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold leading-tight">{dogLabel}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">#{booking.id}</span>
                    <DogBadgesInline badgeKeys={badgeKeysForBooking(booking)} badgeByKey={badgeByKey} />
                    {dogCount > 1 && (
                      <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-primary/10 text-primary leading-none">
                        {dogCount} dogs
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full leading-none ${statusColors[booking.status]}`}>
                      {booking.status.replace("_", " ")}
                    </span>
                    {(booking as any).serviceName && (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {(booking as any).serviceName}
                      </span>
                    )}
                    {issues && (
                      <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-amber-100 text-amber-800 inline-flex items-center gap-0.5 leading-none">
                        <AlertTriangle className="h-2.5 w-2.5 shrink-0" /> INFO MISSING
                      </span>
                    )}
                    {(booking as any).vaccineStatus === 'incomplete' && (
                      <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-red-100 text-red-800 inline-flex items-center gap-0.5 leading-none">
                        <ShieldAlert className="h-2.5 w-2.5 shrink-0" /> VACCINES
                      </span>
                    )}
                    {(booking as any).vaccineStatus === 'complete' && (
                      <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-green-100 text-green-700 inline-flex items-center gap-0.5 leading-none">
                        <ShieldCheck className="h-2.5 w-2.5 shrink-0" /> VAX OK
                      </span>
                    )}
                  </div>
                </div>
                {booking.totalPrice != null && (
                  <span className="text-base font-bold tabular-nums shrink-0 sm:text-sm sm:pt-0.5">
                    ${String(booking.totalPrice)}
                  </span>
                )}
              </div>

              {(booking as any).vaccineStatus === 'incomplete' && (booking as any).missingVaccines?.length > 0 && (
                <div className="mb-2 p-2 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />
                    <div className="text-xs">
                      <p className="font-semibold text-red-800">Missing required vaccines:</p>
                      <ul className="mt-0.5 space-y-0.5 text-red-700">
                        {(booking as any).missingVaccines.map((v: string, i: number) => (
                          <li key={i}>• {v}</li>
                        ))}
                      </ul>
                      {booking.status === 'pending' && (
                        <p className="mt-1 text-red-600 font-medium">Owner can still approve, but employee cannot check in until vaccines are up to date.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {issues && (
                <div className="mb-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-xs">
                      <p className="font-semibold text-amber-800">{issues.dogName} is missing required info:</p>
                      <ul className="mt-0.5 space-y-0.5 text-amber-700">
                        {issues.details.map((d, i) => (
                          <li key={i}>• {d}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {dogCount > 1 && (
                <p className="hidden sm:block text-[10px] font-medium text-primary/90 mb-1">
                  All dogs above share booking #{booking.id} — arriving together.
                </p>
              )}
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p className="flex items-center gap-1.5 flex-wrap">
                  <CalendarDays className="h-3 w-3 shrink-0" />
                  <span>
                    {formatDate(booking.checkInDate)}
                    {booking.checkOutDate && ` → ${formatDate(booking.checkOutDate)}`}
                  </span>
                </p>
                {booking.notes && (
                  <p className="text-[11px] sm:text-xs mt-1 italic line-clamp-2 sm:line-clamp-none">"{booking.notes}"</p>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2.5 sm:mt-3">
                {booking.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      className="h-9 min-h-9 sm:h-7 sm:min-h-0 text-xs gap-1"
                      onClick={() => approveStay(booking)}
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle2 className="h-3 w-3" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 min-h-9 sm:h-7 sm:min-h-0 text-xs gap-1"
                      onClick={() => setEditBooking(booking)}
                      disabled={!canOwnerEdit}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 min-h-9 sm:h-7 sm:min-h-0 text-xs gap-1 text-destructive border-destructive/30"
                      onClick={() => kennelId && cancelMutation.mutate({ id: booking.id, kennelId })}
                      disabled={!kennelId || cancelMutation.isPending}
                    >
                      <XCircle className="h-3 w-3" /> Decline
                    </Button>
                  </>
                )}

                {booking.status === "confirmed" && (
                  <>
                    <Button
                      size="sm"
                      className="h-9 min-h-9 sm:h-7 sm:min-h-0 text-xs gap-1"
                      onClick={() =>
                        updateStatus.mutate(
                          { id: booking.id, status: "checked_in" },
                          { onSuccess: () => toast.success("Checked in!") }
                        )
                      }
                    >
                      Check In
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 min-h-9 sm:h-7 sm:min-h-0 text-xs gap-1"
                      onClick={() => setEditBooking(booking)}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 min-h-9 sm:h-7 sm:min-h-0 text-xs gap-1 text-destructive border-destructive/30"
                      onClick={() => setCancelTarget(booking)}
                    >
                      <XCircle className="h-3 w-3" /> Cancel booking
                    </Button>
                  </>
                )}

                {booking.status === "checked_in" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 min-h-9 sm:h-7 sm:min-h-0 text-xs gap-1"
                      onClick={() =>
                        updateStatus.mutate(
                          { id: booking.id, status: "checked_out" },
                          { onSuccess: () => toast.success("Checked out!") }
                        )
                      }
                    >
                      Check Out
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 min-h-9 sm:h-7 sm:min-h-0 text-xs gap-1"
                      onClick={() => setEditBooking(booking)}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 min-h-9 sm:h-7 sm:min-h-0 text-xs gap-1 text-destructive border-destructive/30"
                      onClick={() => setCancelTarget(booking)}
                    >
                      <XCircle className="h-3 w-3" /> Cancel booking
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {editBooking && kennelId && (
        <OwnerBookingEditDialog
          booking={editBooking}
          dogName={(editBooking as any).dogNames?.length > 0 ? (editBooking as any).dogNames.join(", ") : ((editBooking as any).dogName || dogNameMap.get(editBooking.dogId) || "Unknown Dog")}
          services={services ?? []}
          dogs={allDogs ?? []}
          availableAddOns={availableAddOns ?? []}
          bookingAddOnRows={editBookingAddOns}
          addOnsReady={!editAddOnsLoading}
          onClose={() => setEditBooking(null)}
          onSave={(data) => editMutation.mutate({ id: editBooking.id, kennelId, ...data })}
          isPending={editMutation.isPending}
        />
      )}

      {planningBooking && kennelId && (
        <OwnerApprovePlanningDialog
          booking={planningBooking}
          kennelId={kennelId}
          open={!!planningBooking}
          onClose={() => setPlanningBooking(null)}
        />
      )}

      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              The stay will be marked cancelled and removed from operational lists. The record is kept for history.
              {cancelTarget && (
                <span className="block mt-2 font-medium text-foreground">
                  Booking #{cancelTarget.id}
                  {cancelTarget.checkInDate && ` · ${formatDate(cancelTarget.checkInDate)}`}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep booking</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (cancelTarget && kennelId) {
                  cancelMutation.mutate({ id: cancelTarget.id, kennelId });
                }
              }}
            >
              Cancel booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function OwnerApprovePlanningDialog({
  booking,
  kennelId,
  open,
  onClose,
}: {
  booking: any;
  kennelId: number;
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  const { startDate, endDate } = useMemo(() => {
    const ci = toDateString(booking?.checkInDate);
    const t = todayString();
    const start = ci && ci < t ? t : ci || t;
    let end = booking?.checkOutDate ? toDateString(booking.checkOutDate) : start;
    if (end < start) end = start;
    return { startDate: start, endDate: end };
  }, [booking]);

  const { data: rooms } = trpc.room.byKennel.useQuery({ kennelId }, { enabled: open && !!kennelId });
  const { data: daily } = trpc.room.dailyAvailability.useQuery(
    { kennelId, startDate, endDate },
    { enabled: open && !!kennelId && !!startDate && !!endDate }
  );

  const assignRoom = trpc.room.assign.useMutation({
    onSuccess: () => {
      utils.room.dailyAvailability.invalidate({ kennelId });
      utils.room.byKennel.invalidate({ kennelId });
      utils.booking.byKennel.invalidate({ kennelId });
      toast.success("Room assigned for this stay.");
      onClose();
    },
    onError: (e) => toast.error(e.message || "Could not assign room"),
  });

  const [roomPick, setRoomPick] = useState("");

  useEffect(() => {
    setRoomPick("");
  }, [booking?.id]);

  const dogLine =
    booking?.dogNames?.length > 0 ? booking.dogNames.join(", ") : booking?.dogName || "Dogs";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4" /> Plan room · Booking #{booking?.id}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <p className="font-semibold">{dogLine}</p>
          <p className="text-muted-foreground">
            {formatDate(booking.checkInDate)}
            {booking.checkOutDate ? ` → ${formatDate(booking.checkOutDate)}` : ""}
          </p>
          <p className="text-muted-foreground">
            Room occupancy by day for this stay window. Assign a room now or from Rooms anytime before check-in.
          </p>
          <div className="space-y-2 max-h-52 overflow-y-auto border rounded-lg p-2 bg-muted/30">
            {!daily?.length ? (
              <p className="text-muted-foreground italic text-[11px]">Loading availability…</p>
            ) : (
              daily.map((day) => (
                <div key={day.date} className="border-b border-border/40 pb-2 last:border-0 last:pb-0">
                  <p className="font-semibold text-[11px]">{formatDate(day.date)}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {day.rooms.map((r) => (
                      <span
                        key={r.roomId}
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          r.booked ? "bg-destructive/15 text-destructive" : "bg-green-100 text-green-800"
                        }`}
                      >
                        {r.roomName}: {r.occupancy}/{r.capacity}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          <div>
            <Label className="text-xs">Assign room (optional)</Label>
            <Select value={roomPick} onValueChange={setRoomPick}>
              <SelectTrigger className="mt-1 h-9 text-xs">
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                {(rooms || []).map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name}
                    {r.building ? ` · ${r.building}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              size="sm"
              className="h-9 text-xs"
              disabled={!roomPick || assignRoom.isPending}
              onClick={() =>
                assignRoom.mutate({ bookingId: booking.id, roomId: parseInt(roomPick, 10) })
              }
            >
              {assignRoom.isPending ? "Saving…" : "Save room assignment"}
            </Button>
            <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => setLocation("/rooms")}>
              Open room management
            </Button>
            <Button size="sm" variant="ghost" className="h-9 text-xs" type="button" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OwnerBookingEditDialog({
  booking,
  dogName,
  services,
  dogs,
  availableAddOns,
  bookingAddOnRows,
  addOnsReady,
  onClose,
  onSave,
  isPending,
}: {
  booking: any;
  dogName: string;
  services: Array<{ id: number; name: string; type: string }>;
  dogs: Array<{ id: number; name: string; ownerId?: string }>;
  availableAddOns: Array<{ id: number; name: string; price: number | string }>;
  bookingAddOnRows?: Array<{ addOnId: number }>;
  addOnsReady: boolean;
  onClose: () => void;
  onSave: (data: OwnerEditSavePayload) => void;
  isPending: boolean;
}) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [notes, setNotes] = useState("");
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [dogId, setDogId] = useState<number | null>(null);
  const [totalPrice, setTotalPrice] = useState("");
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<number[]>([]);

  useEffect(() => {
    setCheckIn(toDateString(booking.checkInDate));
    setCheckOut(toDateString(booking.checkOutDate));
    setNotes(booking.notes ?? "");
    setServiceId(booking.serviceId ?? null);
    setDogId(booking.dogId ?? null);
    setTotalPrice(booking.totalPrice != null ? String(booking.totalPrice) : "");
  }, [booking]);

  useEffect(() => {
    if (bookingAddOnRows === undefined) return;
    setSelectedAddOnIds(bookingAddOnRows.map((r) => r.addOnId));
  }, [booking.id, bookingAddOnRows]);

  const toggleAddOn = (id: number) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const customerDogs = useMemo(
    () => dogs.filter((d) => d.ownerId === booking.customerId),
    [dogs, booking.customerId]
  );
  const dogChoices = customerDogs.length > 0 ? customerDogs : dogs;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit booking · {dogName} #{booking.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs">Check-in date</Label>
            <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Check-out date</Label>
            <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Service</Label>
            <Select
              value={serviceId != null ? String(serviceId) : ""}
              onValueChange={(v) => setServiceId(v ? parseInt(v, 10) : null)}
            >
              <SelectTrigger className="mt-1 h-9 text-xs">
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name} ({s.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Dog</Label>
            <Select
              value={dogId != null ? String(dogId) : ""}
              onValueChange={(v) => setDogId(v ? parseInt(v, 10) : null)}
            >
              <SelectTrigger className="mt-1 h-9 text-xs">
                <SelectValue placeholder="Select dog" />
              </SelectTrigger>
              <SelectContent>
                {dogChoices.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Total price (USD)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Update if you changed dates, service, or add-ons.
            </p>
          </div>
          {availableAddOns.length > 0 && (
            <div>
              <Label className="text-xs">Add-ons</Label>
              <div className="mt-2 space-y-2 rounded-lg border border-border/80 p-2">
                {availableAddOns.map((a) => (
                  <label
                    key={a.id}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedAddOnIds.includes(a.id)}
                      onCheckedChange={() => toggleAddOn(a.id)}
                    />
                    <span className="flex-1">{a.name}</span>
                    <span className="text-muted-foreground">${String(a.price)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs">Internal / status notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1"
              placeholder="Special requests, kennel notes…"
            />
          </div>
        </div>
        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline" size="sm" type="button">
              Close
            </Button>
          </DialogClose>
          <Button
            size="sm"
            type="button"
            onClick={() => {
              const tp = parseFloat(totalPrice);
              onSave({
                checkInDate: checkIn || undefined,
                checkOutDate: checkOut || undefined,
                notes: notes === "" ? null : notes,
                serviceId: serviceId ?? undefined,
                dogId: dogId ?? undefined,
                addOnIds: selectedAddOnIds,
                totalPrice: Number.isFinite(tp) ? tp : undefined,
              });
            }}
            disabled={isPending || serviceId == null || dogId == null || !addOnsReady}
          >
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
