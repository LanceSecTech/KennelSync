import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckoutStayDialog } from "@/components/CheckoutStayDialog";
import { RecordManualPaymentDialog } from "@/components/RecordManualPaymentDialog";
import {
  ClipboardCheck,
  LogIn,
  LogOut,
  Dog,
  CheckCircle2,
  DoorOpen,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Bath,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, todayString, toDateString } from "@/lib/dateUtils";
import { DogBadgesInline } from "@/components/DogBadgesInline";

export default function CheckInOut() {
  const { activeKennelId: kennelId } = useKennel();
  const { data: bookings, isLoading } = trpc.booking.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const { data: rooms } = trpc.room.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const { data: allDogs } = trpc.dog.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const { data: missingInfo } = trpc.alert.missingDogInfo.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const { data: availableAddOns } = trpc.addOn.activeByKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const utils = trpc.useUtils();
  const dogIdsAcrossBookings = Array.from(
    new Set(
      (bookings || []).flatMap((b: any) =>
        Array.isArray(b.dogIdsOnBooking) && b.dogIdsOnBooking.length ? b.dogIdsOnBooking : [b.dogId],
      ),
    ),
  );
  const { data: badgeCatalog } = trpc.dogBadge.listByKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId },
  );
  const { data: badgeAssignments } = trpc.dogBadge.assignedForDogs.useQuery(
    { kennelId: kennelId!, dogIds: dogIdsAcrossBookings },
    { enabled: !!kennelId && dogIdsAcrossBookings.length > 0 },
  );
  const badgeByKey = new Map(((badgeCatalog || []) as any[]).map((b: any) => [String(b.key || "").toLowerCase(), b]));

  // Track room selection per booking
  const [roomSelections, setRoomSelections] = useState<Record<number, string>>(
    {}
  );
  const [vaccineWarningBookingId, setVaccineWarningBookingId] = useState<number | null>(null);
  // Room assignment step in check-in flow (opened when room is required but not selected yet)
  const [roomAssignDialog, setRoomAssignDialog] = useState<{
    bookingId: number;
    skipVaccine: boolean;
  } | null>(null);
  // Track checkout add-on dialog
  const [checkoutBookingId, setCheckoutBookingId] = useState<number | null>(null);
  const [recordPayBooking, setRecordPayBooking] = useState<any | null>(null);

  // Build missing info lookup by bookingId
  const missingInfoMap = new Map<
    number,
    { dogName: string; details: string[] }
  >();
  if (missingInfo) {
    for (const issue of missingInfo) {
      missingInfoMap.set(issue.bookingId, {
        dogName: issue.dogName,
        details: [issue.details],
      });
    }
  }

  const refreshRoomsAndBookings = () => {
    utils.booking.byKennel.invalidate();
    utils.room.byKennel.invalidate();
    utils.room.currentAssignments.invalidate();
    utils.booking.todayTasks.invalidate();
  };

  const updateStatus = trpc.booking.updateStatus.useMutation({
    onSuccess: refreshRoomsAndBookings,
    onError: (e) => toast.error(e.message || "Failed to update status"),
  });

  const assignRoom = trpc.room.assign.useMutation({
    onSuccess: refreshRoomsAndBookings,
  });

  const availableRooms =
    rooms?.filter(
      (r) =>
        r.isAvailable !== false && (r.currentOccupancy ?? 0) < r.capacity
    ) || [];

  type CheckInOpts = { skipVaccine?: boolean };

  const handleCheckIn = async (bookingId: number, opts?: CheckInOpts) => {
    const booking = bookings?.find((b) => b.id === bookingId);
    if (
      booking &&
      (booking as any).vaccineStatus === "incomplete" &&
      !opts?.skipVaccine
    ) {
      setVaccineWarningBookingId(bookingId);
      return;
    }

    const effectiveRoomStr =
      roomSelections[bookingId] ??
      (booking?.roomId != null ? String(booking.roomId) : "");
    const mustAssignRoom = availableRooms.length > 0;
    if (mustAssignRoom && !effectiveRoomStr) {
      setRoomAssignDialog({ bookingId, skipVaccine: !!opts?.skipVaccine });
      return;
    }

    try {
      if (effectiveRoomStr) {
        await assignRoom.mutateAsync({
          bookingId,
          roomId: parseInt(effectiveRoomStr, 10),
        });
      }
      await updateStatus.mutateAsync({ id: bookingId, status: "checked_in" });
      toast.success(
        effectiveRoomStr ? "Checked in and room assigned!" : "Checked in!"
      );
      setRoomSelections((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
      setRoomAssignDialog(null);
    } catch {
      // errors handled by mutation onError
    }
  };

  const handleCheckOutStart = (bookingId: number) => {
    setCheckoutBookingId(bookingId);
  };

  const today = todayString();
  const readyForCheckIn =
    bookings?.filter((b) => b.status === "confirmed" && toDateString(b.checkInDate) === today) || [];
  const readyForCheckOut =
    bookings?.filter((b) => {
      if (b.status !== "checked_in") return false;
      // Daycare dogs: check out same day they check in (no checkOutDate or checkOutDate === checkInDate)
      const isDaycare = (b as any).serviceType === "daycare";
      if (isDaycare) {
        // Daycare is always ready for checkout once checked in
        return toDateString(b.checkInDate) === today;
      }
      // Boarding/other: check out when checkOutDate is today
      return b.checkOutDate && toDateString(b.checkOutDate) === today;
    }) || [];

  const getDogName = (dogId: number) => {
    const dog = allDogs?.find((d) => d.id === dogId);
    return dog?.name || `Dog #${dogId}`;
  };

  const getDogBreed = (dogId: number, booking?: any) => {
    if (booking?.dogBreed) return booking.dogBreed;
    const dog = allDogs?.find((d) => d.id === dogId);
    return dog?.breed || "";
  };

  const getBookingDogLabel = (booking: any) => {
    if (booking.dogNames?.length > 0) return booking.dogNames.join(", ");
    if (booking.dogName) return booking.dogName;
    return getDogName(booking.dogId);
  };

  const getBookingDogCount = (booking: any) => {
    return booking.dogNames?.length || 1;
  };
  const getBookingBadgeKeys = (booking: any) => {
    const ids: number[] = Array.isArray(booking.dogIdsOnBooking) && booking.dogIdsOnBooking.length ? booking.dogIdsOnBooking : [booking.dogId];
    return Array.from(
      new Set(ids.flatMap((id) => ((badgeAssignments as any)?.[String(id)] || []).map((k: string) => String(k).toLowerCase()))),
    );
  };

  const getRoomForBooking = (bookingId: number) => {
    const booking = bookings?.find((b) => b.id === bookingId);
    if (!booking?.roomId) return null;
    return rooms?.find((r) => r.id === booking.roomId);
  };

  const vaccineWarningBooking = vaccineWarningBookingId
    ? bookings?.find((b) => b.id === vaccineWarningBookingId)
    : null;
  const roomAssignBooking = roomAssignDialog
    ? bookings?.find((b) => b.id === roomAssignDialog.bookingId)
    : null;

  const checkoutBooking =
    checkoutBookingId ? (bookings?.find((b) => b.id === checkoutBookingId) ?? null) : null;

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-8 bg-muted rounded animate-pulse w-32" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-primary" /> Check-In / Out
      </h1>

      <Tabs defaultValue="checkin" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-10">
          <TabsTrigger value="checkin" className="gap-1.5">
            <LogIn className="h-3.5 w-3.5" /> Check In (
            {readyForCheckIn.length})
          </TabsTrigger>
          <TabsTrigger value="checkout" className="gap-1.5">
            <LogOut className="h-3.5 w-3.5" /> Check Out (
            {readyForCheckOut.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checkin" className="space-y-3 mt-3">
          {readyForCheckIn.length === 0 && (
            <Card className="border-dashed border-2 bg-muted/30">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No dogs waiting for check-in
                </p>
              </CardContent>
            </Card>
          )}
          {readyForCheckIn.map((booking) => {
            const issues = missingInfoMap.get(booking.id);
            const effectiveRoomStr =
              roomSelections[booking.id] ??
              (booking.roomId != null ? String(booking.roomId) : "");
            const mustAssignRoom = availableRooms.length > 0;
            const roomSelectionOk = !mustAssignRoom || !!effectiveRoomStr;
            return (
              <Card
                key={booking.id}
                className={`border-0 shadow-sm bg-white ${issues ? "ring-1 ring-amber-300" : ""}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${issues ? "bg-amber-100" : "bg-primary/10"}`}
                    >
                      {issues ? (
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                      ) : (
                        <Dog className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">
                          {getBookingDogLabel(booking)}
                        </p>
                        <DogBadgesInline badgeKeys={getBookingBadgeKeys(booking)} badgeByKey={badgeByKey} />
                        {getBookingDogCount(booking) > 1 && (
                          <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-primary/10 text-primary">
                            {getBookingDogCount(booking)} dogs
                          </span>
                        )}
                        {issues && (
                          <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-amber-100 text-amber-800">
                            INFO MISSING
                          </span>
                        )}
                        {(booking as any).vaccineStatus === 'incomplete' && (
                          <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-red-100 text-red-800 flex items-center gap-0.5">
                            <ShieldAlert className="h-2.5 w-2.5" /> VACCINES MISSING
                          </span>
                        )}
                        {(booking as any).vaccineStatus === 'complete' && (
                          <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-green-100 text-green-700 flex items-center gap-0.5">
                            <ShieldCheck className="h-2.5 w-2.5" /> VAX OK
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {getDogBreed(booking.dogId, booking)}
                        {getDogBreed(booking.dogId, booking) ? " · " : ""}
                        {formatDate(booking.checkInDate)}
                        {booking.checkOutDate &&
                          ` - ${formatDate(booking.checkOutDate)}`}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      Booking #{booking.id}
                    </Badge>
                  </div>

                  {(booking as any).vaccineStatus === "incomplete" &&
                    (booking as any).missingVaccines?.length > 0 && (
                    <div className="p-2 rounded-lg bg-red-50 border border-red-200">
                      <div className="flex items-start gap-2">
                        <ShieldAlert className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />
                        <div className="text-xs">
                          <p className="font-semibold text-red-800">Required vaccines missing or not compliant</p>
                          <ul className="mt-0.5 space-y-0.5 text-red-700">
                            {(booking as any).missingVaccines.map((v: string, i: number) => (
                              <li key={i}>{"\u2022"} {v}</li>
                            ))}
                          </ul>
                          <p className="mt-1 text-red-700">
                            You can still check in after confirming in the prompt below.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Missing Info Warning Banner */}
                  {issues && (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                        <div className="text-xs">
                          <p className="font-semibold text-amber-800">
                            Missing required information:
                          </p>
                          <ul className="mt-0.5 space-y-0.5 text-amber-700">
                            {issues.details.map((d, i) => (
                              <li key={i}>• {d}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Room Assignment — required when the kennel has assignable rooms */}
                  {availableRooms.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <DoorOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Select
                          value={effectiveRoomStr}
                          onValueChange={(v) =>
                            setRoomSelections((prev) => ({
                              ...prev,
                              [booking.id]: v,
                            }))
                          }
                        >
                          <SelectTrigger
                            className={`h-9 text-xs flex-1 ${!roomSelectionOk ? "border-amber-400 ring-1 ring-amber-200" : ""}`}
                          >
                            <SelectValue placeholder="Select room (required)" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRooms.map((r) => (
                              <SelectItem key={r.id} value={String(r.id)}>
                                {r.name}
                                {r.building ? ` (${r.building})` : ""} —{" "}
                                {r.currentOccupancy ?? 0}/{r.capacity}
                                {r.sizeType && r.sizeType !== "mixed"
                                  ? ` · ${r.sizeType}`
                                  : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-[10px] text-muted-foreground pl-6">
                        Choose an open room before check-in. Maintenance rooms are hidden.
                      </p>
                    </div>
                  )}

                  {booking.paymentStatus !== "paid" &&
                    parseFloat(String(booking.totalPrice || 0)) > 0 && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full h-9 text-xs gap-1.5"
                        onClick={() => setRecordPayBooking(booking)}
                      >
                        <Wallet className="h-3.5 w-3.5" /> Record offline payment
                      </Button>
                    )}
                  <Button
                    className={`w-full h-10 font-semibold gap-1.5 ${issues ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                    onClick={() => handleCheckIn(booking.id)}
                    disabled={updateStatus.isPending || assignRoom.isPending}
                  >
                    {issues && (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <LogIn className="h-4 w-4" /> Check In
                    {effectiveRoomStr && " & assign room"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="checkout" className="space-y-3 mt-3">
          {readyForCheckOut.length === 0 && (
            <Card className="border-dashed border-2 bg-muted/30">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No dogs ready for check-out
                </p>
              </CardContent>
            </Card>
          )}
          {readyForCheckOut.map((booking) => {
            const room = getRoomForBooking(booking.id);
            return (
              <Card key={booking.id} className="border-0 shadow-sm bg-white">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-chart-5/10 flex items-center justify-center shrink-0">
                      <Dog className="h-5 w-5 text-chart-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {getBookingDogLabel(booking)}
                      </p>
                      <DogBadgesInline badgeKeys={getBookingBadgeKeys(booking)} badgeByKey={badgeByKey} />
                      {getBookingDogCount(booking) > 1 && (
                        <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-primary/10 text-primary">
                          {getBookingDogCount(booking)} dogs
                        </span>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        {getDogBreed(booking.dogId, booking)}
                        {getDogBreed(booking.dogId, booking) ? " · " : ""}
                        Checked in:{" "}
                        {formatDate(booking.checkInDate)}
                        {booking.checkOutDate &&
                          ` · Due: ${formatDate(booking.checkOutDate)}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="secondary" className="text-xs">
                        #{booking.id}
                      </Badge>
                      {room ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1 border-primary/30 bg-primary/5"
                        >
                          <DoorOpen className="h-2.5 w-2.5" /> Room: {room.name}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1 border-amber-300 text-amber-800 bg-amber-50"
                        >
                          <DoorOpen className="h-2.5 w-2.5" /> No room
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Add-on hint */}
                  {availableAddOns && availableAddOns.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Bath className="h-3 w-3" />
                      <span>{availableAddOns.length} add-on{availableAddOns.length > 1 ? 's' : ''} available (bath, nails, etc.)</span>
                    </div>
                  )}

                  {booking.paymentStatus !== "paid" &&
                    parseFloat(String(booking.totalPrice || 0)) > 0 && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full h-9 text-xs gap-1.5"
                        onClick={() => setRecordPayBooking(booking)}
                      >
                        <Wallet className="h-3.5 w-3.5" /> Record offline payment
                      </Button>
                    )}
                  <Button
                    variant="outline"
                    className="w-full h-10 font-semibold gap-1.5"
                    onClick={() => handleCheckOutStart(booking.id)}
                    disabled={updateStatus.isPending}
                  >
                    <LogOut className="h-4 w-4" /> Check Out
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Vaccine compliance — employee override */}
      <Dialog
        open={vaccineWarningBookingId !== null}
        onOpenChange={(open) => !open && setVaccineWarningBookingId(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-800">
              <ShieldAlert className="h-5 w-5" />
              Vaccine compliance warning
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This stay does not meet kennel required-vaccine rules (missing, expired, or expiring before check-in).
            </p>
            {vaccineWarningBooking && (vaccineWarningBooking as any).missingVaccines?.length > 0 && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-xs font-semibold text-red-900 mb-1">Issues</p>
                <ul className="space-y-1">
                  {(vaccineWarningBooking as any).missingVaccines.map((v: string, i: number) => (
                    <li key={i} className="text-xs text-red-800">
                      • {v}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Only proceed if you accept responsibility for checking this dog in without compliant records on file.
            </p>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setVaccineWarningBookingId(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                const id = vaccineWarningBookingId;
                setVaccineWarningBookingId(null);
                if (id != null) {
                  handleCheckIn(id, { skipVaccine: true });
                }
              }}
            >
              Check in anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Required room selection step before check-in */}
      <Dialog
        open={roomAssignDialog !== null}
        onOpenChange={(open) => !open && setRoomAssignDialog(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5 text-primary" />
              Assign room to continue
            </DialogTitle>
          </DialogHeader>
          {roomAssignDialog && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/40 border border-border">
                <p className="text-sm font-semibold">
                  {roomAssignBooking ? getBookingDogLabel(roomAssignBooking) : `Booking #${roomAssignDialog.bookingId}`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select a room to complete check-in.
                </p>
              </div>
              <div className="space-y-1">
                <Select
                  value={
                    roomSelections[roomAssignDialog.bookingId] ??
                    (roomAssignBooking?.roomId != null ? String(roomAssignBooking.roomId) : "")
                  }
                  onValueChange={(v) =>
                    setRoomSelections((prev) => ({
                      ...prev,
                      [roomAssignDialog.bookingId]: v,
                    }))
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select room (required)" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRooms.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                        {r.building ? ` (${r.building})` : ""} — {r.currentOccupancy ?? 0}/{r.capacity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRoomAssignDialog(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={
                !roomAssignDialog ||
                !(
                  roomSelections[roomAssignDialog.bookingId] ??
                  (roomAssignBooking?.roomId != null ? String(roomAssignBooking.roomId) : "")
                )
              }
              onClick={() => {
                if (roomAssignDialog) {
                  handleCheckIn(roomAssignDialog.bookingId, {
                    skipVaccine: roomAssignDialog.skipVaccine,
                  });
                }
              }}
            >
              Continue check-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {kennelId && (
        <CheckoutStayDialog
          open={checkoutBookingId !== null}
          onOpenChange={(open) => !open && setCheckoutBookingId(null)}
          kennelId={kennelId}
          booking={checkoutBooking}
          dogLabel={checkoutBooking ? getBookingDogLabel(checkoutBooking) : ""}
          onCompleted={refreshRoomsAndBookings}
        />
      )}

      {kennelId != null && (
        <RecordManualPaymentDialog
          open={recordPayBooking != null}
          onOpenChange={(open) => !open && setRecordPayBooking(null)}
          booking={recordPayBooking}
          kennelId={kennelId}
          onSuccess={refreshRoomsAndBookings}
        />
      )}
    </div>
  );
}
