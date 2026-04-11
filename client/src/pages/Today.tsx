import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Clock,
  Dog,
  DoorOpen,
  CheckCircle2,
  Sparkles,
  PlayCircle,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { toDateString, todayString } from "@/lib/dateUtils";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { DogBadgesInline } from "@/components/DogBadgesInline";

type TaskStatus = "pending" | "in_progress" | "completed";

export default function Today() {
  const { activeKennelId: kennelId } = useKennel();
  const utils = trpc.useUtils();
  const today = todayString();

  const { data: bookings, isLoading } = trpc.booking.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const { data: allDogs } = trpc.dog.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const { data: rooms } = trpc.room.byKennel.useQuery(
    { kennelId: kennelId!, asOfDate: today },
    { enabled: !!kennelId }
  );
  const { data: todayTasks, isLoading: tasksLoading } =
    trpc.booking.todayTasks.useQuery(
      { kennelId: kennelId! },
      { enabled: !!kennelId }
    );
  const [, setLocation] = useLocation();
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

  const setTaskStatus = trpc.bookingAddOn.setTaskStatus.useMutation({
    onSuccess: () => {
      utils.booking.todayTasks.invalidate();
    },
    onError: (e) => toast.error(e.message || "Could not update task"),
  });

  const arriving =
    bookings?.filter(
      (b: any) =>
        b.status === "confirmed" && toDateString(b.checkInDate) === today
    ) || [];

  const departing =
    bookings?.filter((b: any) => {
      if (b.status !== "checked_in") return false;
      const isDaycare = (b as any).serviceType === "daycare";
      if (isDaycare) {
        return toDateString(b.checkInDate) === today;
      }
      return b.checkOutDate && toDateString(b.checkOutDate) === today;
    }) || [];

  const staying =
    bookings?.filter((b: any) => {
      if (b.status !== "checked_in") return false;
      const isDaycare = (b as any).serviceType === "daycare";
      if (isDaycare) return false;
      return !b.checkOutDate || toDateString(b.checkOutDate) !== today;
    }) || [];

  const getDogName = (dogId: number, booking?: any) =>
    booking?.dogName ||
    allDogs?.find((d: any) => d.id === dogId)?.name ||
    `Dog #${dogId}`;
  const getDogBreed = (dogId: number, booking?: any) =>
    booking?.dogBreed || allDogs?.find((d: any) => d.id === dogId)?.breed || "";
  const getRoomName = (roomId: number | null) => {
    if (!roomId) return null;
    return rooms?.find((r: any) => r.id === roomId)?.name || null;
  };
  const noRoomAlerts =
    bookings
      ?.filter((b: any) => b.status === "checked_in" && !b.roomId)
      .map((b: any) => ({
        bookingId: b.id,
        dogId: b.dogId,
        dogName:
          b.dogName ||
          (b.dogNames?.length ? b.dogNames.join(", ") : getDogName(b.dogId, b)),
        customerLabel: b.customerName || b.customerEmail || (b.customerId ? `Owner ${b.customerId}` : "Owner"),
      })) || [];

  /** Add-on chips on booking cards, sourced from today's task rows */
  const bookingAddOnsMap = useMemo(() => {
    const m = new Map<
      number,
      Array<{
        name: string;
        completed: boolean;
        taskStatus: TaskStatus;
      }>
    >();
    for (const t of todayTasks || []) {
      const arr = m.get(t.bookingId) || [];
      arr.push({
        name: t.taskName,
        completed: t.taskStatus === "completed",
        taskStatus: t.taskStatus,
      });
      m.set(t.bookingId, arr);
    }
    return m;
  }, [todayTasks]);

  const statusBadgeClass = (s: TaskStatus) => {
    if (s === "completed") return "bg-green-100 text-green-800";
    if (s === "in_progress") return "bg-blue-100 text-blue-800";
    return "bg-amber-100 text-amber-800";
  };

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

  const BookingCard = ({
    booking,
    type,
  }: {
    booking: any;
    type: "arriving" | "departing" | "staying";
  }) => {
    const dogLabel = booking.dogNames?.length > 0 ? booking.dogNames.join(", ") : getDogName(booking.dogId, booking);
    const dogCount = booking.dogNames?.length || 1;
    const breed = getDogBreed(booking.dogId, booking);
    const roomName = getRoomName(booking.roomId);
    const addOns = bookingAddOnsMap.get(booking.id);
    const isDaycare = booking.serviceType === "daycare";
    const badgeKeys = Array.from(
      new Set(
        (Array.isArray(booking.dogIdsOnBooking) && booking.dogIdsOnBooking.length ? booking.dogIdsOnBooking : [booking.dogId]).flatMap(
          (id: number) => ((badgeAssignments as any)?.[String(id)] || []).map((k: string) => String(k).toLowerCase()),
        ),
      ),
    ) as string[];
    const colors = {
      arriving: {
        border: "border-l-primary",
        badge: "bg-primary/10 text-primary",
        label: "Arriving",
      },
      departing: {
        border: "border-l-chart-5",
        badge: "bg-chart-5/10 text-chart-5",
        label: isDaycare ? "Daycare" : "Departing",
      },
      staying: {
        border: "border-l-green-500",
        badge: "bg-green-100 text-green-700",
        label: "Boarded",
      },
    };
    const c = colors[type];

    return (
      <Card className={`border-0 border-l-4 ${c.border} shadow-sm bg-white`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                <Dog className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{dogLabel}</p>
                <DogBadgesInline badgeKeys={badgeKeys} badgeByKey={badgeByKey} />
                {dogCount > 1 && (
                  <span className="text-[9px] font-semibold text-primary">{dogCount} dogs</span>
                )}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {breed && (
                    <span className="text-[10px] text-muted-foreground">
                      {breed}
                    </span>
                  )}
                  {roomName && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 gap-0.5 h-4 border-primary/30 bg-primary/5"
                    >
                      <DoorOpen className="h-2.5 w-2.5" /> {roomName}
                    </Badge>
                  )}
                  {!roomName && type === "staying" && (
                    <span className="text-[10px] text-orange-600 font-medium">
                      No room assigned
                    </span>
                  )}
                </div>
                {addOns && addOns.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {addOns.map((ao, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                          ao.taskStatus === "completed"
                            ? "bg-green-100 text-green-700"
                            : ao.taskStatus === "in_progress"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {ao.taskStatus === "completed" ? (
                          <CheckCircle2 className="h-2.5 w-2.5" />
                        ) : (
                          <Sparkles className="h-2.5 w-2.5" />
                        )}
                        {ao.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <span
              className={`px-2 py-0.5 text-[10px] font-medium ${c.badge} rounded-full shrink-0`}
            >
              {c.label}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

  const hasSchedule =
    arriving.length > 0 || departing.length > 0 || staying.length > 0;
  const hasTasks = (todayTasks?.length ?? 0) > 0;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Today</h1>
        <span className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card className="border-0 shadow-sm bg-primary/5">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-primary">{arriving.length}</p>
            <p className="text-[10px] text-muted-foreground">Arriving</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-chart-5/5">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-chart-5">
              {departing.length}
            </p>
            <p className="text-[10px] text-muted-foreground">Departing</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-green-600">
              {staying.length}
            </p>
            <p className="text-[10px] text-muted-foreground">Staying</p>
          </CardContent>
        </Card>
      </div>

      {noRoomAlerts.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/70">
          <CardContent className="p-3 space-y-2">
            <h2 className="text-xs font-semibold text-amber-800 uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Room assignment alerts
            </h2>
            {noRoomAlerts.map((a) => (
              <div key={a.bookingId} className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{a.dogName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{a.customerLabel}</p>
                </div>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setLocation(`/rooms?assignBooking=${a.bookingId}&dogId=${a.dogId}`)}
                >
                  <DoorOpen className="h-3 w-3 mr-1" /> Assign Room
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Today's care tasks (booking add-ons) */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Today — bath/nail tasks for check-outs
        </h2>
        {tasksLoading && (
          <div className="h-24 bg-muted/60 rounded-xl animate-pulse" />
        )}
        {!tasksLoading && !hasTasks && (
          <Card className="border border-dashed bg-muted/20">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">
              No bath/nail tasks for dogs checking out today.
            </CardContent>
          </Card>
        )}
        {!tasksLoading && hasTasks && (
          <div className="space-y-2">
            {todayTasks!.map((task) => (
              <Card key={task.id} className="border-0 shadow-sm bg-white">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">
                        {task.taskName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {task.dogName}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Booking #{task.bookingId}
                      </p>
                    </div>
                    <Badge
                      className={`shrink-0 text-[10px] ${statusBadgeClass(task.taskStatus)}`}
                    >
                      {task.taskStatus === "in_progress"
                        ? "In progress"
                        : task.taskStatus === "completed"
                          ? "Done"
                          : "Pending"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {task.taskStatus !== "in_progress" &&
                      task.taskStatus !== "completed" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={setTaskStatus.isPending}
                          onClick={() =>
                            setTaskStatus.mutate({
                              id: task.bookingAddOnId,
                              status: "in_progress",
                            })
                          }
                        >
                          <PlayCircle className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                      )}
                    {task.taskStatus === "in_progress" && (
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={setTaskStatus.isPending}
                        onClick={() =>
                          setTaskStatus.mutate({
                            id: task.bookingAddOnId,
                            status: "completed",
                          })
                        }
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Complete
                      </Button>
                    )}
                    {task.taskStatus === "pending" && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={setTaskStatus.isPending}
                        onClick={() =>
                          setTaskStatus.mutate({
                            id: task.bookingAddOnId,
                            status: "completed",
                          })
                        }
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Mark done
                      </Button>
                    )}
                    {task.taskStatus !== "pending" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground"
                        disabled={setTaskStatus.isPending}
                        onClick={() =>
                          setTaskStatus.mutate({
                            id: task.bookingAddOnId,
                            status: "pending",
                          })
                        }
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reset
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {arriving.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> Expected Arrivals
          </h2>
          {arriving.map((b: any) => (
            <BookingCard key={b.id} booking={b} type="arriving" />
          ))}
        </div>
      )}

      {departing.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Clock className="h-3 w-3" /> Scheduled Departures
          </h2>
          {departing.map((b: any) => (
            <BookingCard key={b.id} booking={b} type="departing" />
          ))}
        </div>
      )}

      {staying.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Dog className="h-3 w-3" /> Currently Boarded
          </h2>
          {staying.map((b: any) => (
            <BookingCard key={b.id} booking={b} type="staying" />
          ))}
        </div>
      )}

      {!hasSchedule && !hasTasks && !tasksLoading && (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="p-8 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Quiet day
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              No scheduled activity or tasks for today
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
