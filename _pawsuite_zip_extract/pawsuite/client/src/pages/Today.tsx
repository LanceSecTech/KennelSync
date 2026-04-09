import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, Dog, DoorOpen, Bath, CheckCircle2, Scissors, Sparkles } from "lucide-react";
import { toDateString, todayString } from "@/lib/dateUtils";

export default function Today() {
  const { activeKennelId: kennelId } = useKennel();
  const { data: bookings, isLoading } = trpc.booking.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const { data: allDogs } = trpc.dog.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const { data: rooms } = trpc.room.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const { data: kennelAddOns } = trpc.addOn.list.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const { data: availableAddOns } = trpc.addOn.list.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );

  const today = todayString();

  const arriving =
    bookings?.filter(
      (b: any) =>
        b.status === "confirmed" &&
        toDateString(b.checkInDate) === today
    ) || [];

  // Departing includes:
  // 1. Boarding dogs whose checkOutDate is today
  // 2. Daycare dogs who are checked in today (they leave same day)
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
      // Daycare dogs are departing, not staying
      if (isDaycare) return false;
      return !b.checkOutDate || toDateString(b.checkOutDate) !== today;
    }) || [];

  const getDogName = (dogId: number) =>
    allDogs?.find((d: any) => d.id === dogId)?.name || `Dog #${dogId}`;
  const getDogBreed = (dogId: number) =>
    allDogs?.find((d: any) => d.id === dogId)?.breed || "";
  const getRoomName = (roomId: number | null) => {
    if (!roomId) return null;
    return rooms?.find((r: any) => r.id === roomId)?.name || null;
  };

  // Build a lookup of booking add-ons by bookingId
  const bookingAddOnsMap = new Map<number, Array<{ name: string; completed: boolean; price: string }>>();
  if (kennelAddOns && availableAddOns) {
    for (const ba of kennelAddOns) {
      const addOn = availableAddOns.find((a: any) => a.id === ba.addOnId);
      if (!addOn) continue;
      const existing = bookingAddOnsMap.get(ba.bookingId) || [];
      existing.push({ name: addOn.name, completed: ba.completed, price: String(ba.price) });
      bookingAddOnsMap.set(ba.bookingId, existing);
    }
  }

  // Collect all dogs that need baths/nails today (from departing bookings' add-ons)
  const addOnTasks: Array<{ dogLabel: string; addOnName: string; completed: boolean; bookingId: number }> = [];
  for (const b of departing) {
    const addOns = bookingAddOnsMap.get(b.id);
    if (addOns && addOns.length > 0) {
      const dogLabel = (b as any).dogNames?.length > 0 ? (b as any).dogNames.join(", ") : getDogName(b.dogId);
      for (const ao of addOns) {
        addOnTasks.push({ dogLabel, addOnName: ao.name, completed: ao.completed, bookingId: b.id });
      }
    }
  }

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
    const dogLabel = booking.dogNames?.length > 0 ? booking.dogNames.join(", ") : getDogName(booking.dogId);
    const dogCount = booking.dogNames?.length || 1;
    const breed = getDogBreed(booking.dogId);
    const roomName = getRoomName(booking.roomId);
    const addOns = bookingAddOnsMap.get(booking.id);
    const isDaycare = booking.serviceType === "daycare";
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
                      className="text-[9px] px-1 py-0 gap-0.5 h-4"
                    >
                      <DoorOpen className="h-2.5 w-2.5" /> {roomName}
                    </Badge>
                  )}
                  {!roomName && type === "staying" && (
                    <span className="text-[10px] text-orange-500">
                      No room assigned
                    </span>
                  )}
                </div>
                {/* Show add-ons for departing dogs */}
                {type === "departing" && addOns && addOns.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {addOns.map((ao, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                          ao.completed
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {ao.completed ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Sparkles className="h-2.5 w-2.5" />}
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

      {/* Summary */}
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

      {/* Baths & Nails To-Do */}
      {addOnTasks.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Services To-Do Today
          </h2>
          <Card className="border-0 shadow-sm bg-amber-50/50">
            <CardContent className="p-3 space-y-2">
              {addOnTasks.map((task, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                      task.completed ? "bg-green-100" : "bg-amber-100"
                    }`}>
                      {task.completed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{task.addOnName}</p>
                      <p className="text-[10px] text-muted-foreground">{task.dogLabel}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    task.completed
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {task.completed ? "Done" : "Pending"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Arriving */}
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

      {/* Departing */}
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

      {/* Currently Staying */}
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

      {arriving.length === 0 &&
        departing.length === 0 &&
        staying.length === 0 && (
          <Card className="border-dashed border-2 bg-muted/30">
            <CardContent className="p-8 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Quiet day
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                No scheduled activity for today
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
