import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, todayString, toDateString } from "@/lib/dateUtils";

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

  // Track room selection per booking
  const [roomSelections, setRoomSelections] = useState<Record<number, string>>(
    {}
  );
  // Track which booking is showing the missing info warning dialog
  const [warningBookingId, setWarningBookingId] = useState<number | null>(null);
  // Track checkout add-on dialog
  const [checkoutBookingId, setCheckoutBookingId] = useState<number | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<Record<number, boolean>>({});

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

  const updateStatus = trpc.booking.updateStatus.useMutation({
    onSuccess: () => {
      utils.booking.byKennel.invalidate();
      utils.room.byKennel.invalidate();
      utils.room.currentAssignments.invalidate();
    },
    onError: (e) => toast.error(e.message || "Failed to update status"),
  });

  const assignRoom = trpc.room.assign.useMutation({
    onSuccess: () => {
      utils.room.byKennel.invalidate();
      utils.room.currentAssignments.invalidate();
    },
  });

  const addBookingAddOn = trpc.addOn.addToBooking.useMutation();

  const handleCheckIn = async (bookingId: number, skipWarning = false) => {
    // Check for missing info and show warning popup if not already confirmed
    const issues = missingInfoMap.get(bookingId);
    if (issues && !skipWarning) {
      setWarningBookingId(bookingId);
      return;
    }

    const selectedRoom = roomSelections[bookingId];
    try {
      if (selectedRoom) {
        await assignRoom.mutateAsync({
          bookingId,
          roomId: parseInt(selectedRoom),
        });
      }
      await updateStatus.mutateAsync({ id: bookingId, status: "checked_in" });
      toast.success(
        selectedRoom ? "Checked in and room assigned!" : "Checked in!"
      );
      setRoomSelections((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
    } catch {
      // errors handled by mutation onError
    }
  };

  const handleCheckOutStart = (bookingId: number) => {
    // If there are add-ons available, show the add-on selection dialog
    if (availableAddOns && availableAddOns.length > 0) {
      setCheckoutBookingId(bookingId);
      setSelectedAddOns({});
    } else {
      // No add-ons, just check out directly
      handleCheckOutConfirm(bookingId, {});
    }
  };

  const handleCheckOutConfirm = async (bookingId: number, addOns: Record<number, boolean>) => {
    try {
      // Add selected add-ons to the booking
      const selectedIds = Object.entries(addOns).filter(([, v]) => v).map(([k]) => parseInt(k));
      for (const addOnId of selectedIds) {
        const addOn = availableAddOns?.find(a => a.id === addOnId);
        if (addOn) {
          await addBookingAddOn.mutateAsync({
            bookingId,
            addOnId,
          });
        }
      }
      await updateStatus.mutateAsync({ id: bookingId, status: "checked_out" });
      toast.success(selectedIds.length > 0 ? "Checked out with add-ons!" : "Checked out!");
      setCheckoutBookingId(null);
      setSelectedAddOns({});
    } catch {
      // errors handled by mutation onError
    }
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

  const getDogBreed = (dogId: number) => {
    const dog = allDogs?.find((d) => d.id === dogId);
    return dog?.breed || "";
  };

  const getBookingDogLabel = (booking: any) => {
    if (booking.dogNames?.length > 0) return booking.dogNames.join(", ");
    return getDogName(booking.dogId);
  };

  const getBookingDogCount = (booking: any) => {
    return booking.dogNames?.length || 1;
  };

  const availableRooms =
    rooms?.filter(
      (r) =>
        r.isAvailable && ((r as any).currentOccupancy || 0) < r.capacity
    ) || [];

  const getRoomForBooking = (bookingId: number) => {
    const booking = bookings?.find((b) => b.id === bookingId);
    if (!booking?.roomId) return null;
    return rooms?.find((r) => r.id === booking.roomId);
  };

  // Get the warning dialog info
  const warningIssues = warningBookingId
    ? missingInfoMap.get(warningBookingId)
    : null;

  // Calculate total add-on price for checkout dialog
  const addOnTotal = Object.entries(selectedAddOns)
    .filter(([, v]) => v)
    .reduce((sum, [k]) => {
      const addOn = availableAddOns?.find(a => a.id === parseInt(k));
      return sum + (addOn ? parseFloat(String(addOn.price)) : 0);
    }, 0);

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
                        {getDogBreed(booking.dogId)}
                        {getDogBreed(booking.dogId) ? " · " : ""}
                        {formatDate(booking.checkInDate)}
                        {booking.checkOutDate &&
                          ` - ${formatDate(booking.checkOutDate)}`}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      Booking #{booking.id}
                    </Badge>
                  </div>

                  {/* Vaccine Warning Banner - Hard Block */}
                  {(booking as any).vaccineStatus === 'incomplete' && (booking as any).missingVaccines?.length > 0 && (
                    <div className="p-2 rounded-lg bg-red-50 border border-red-200">
                      <div className="flex items-start gap-2">
                        <ShieldAlert className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />
                        <div className="text-xs">
                          <p className="font-semibold text-red-800">Cannot check in — missing required vaccines:</p>
                          <ul className="mt-0.5 space-y-0.5 text-red-700">
                            {(booking as any).missingVaccines.map((v: string, i: number) => (
                              <li key={i}>{"\u2022"} {v}</li>
                            ))}
                          </ul>
                          <p className="mt-1 text-red-600 font-medium">Customer must update vaccination records before check-in.</p>
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

                  {/* Room Assignment */}
                  {availableRooms.length > 0 && (
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Select
                        value={roomSelections[booking.id] || ""}
                        onValueChange={(v) =>
                          setRoomSelections((prev) => ({
                            ...prev,
                            [booking.id]: v,
                          }))
                        }
                      >
                        <SelectTrigger className="h-9 text-xs flex-1">
                          <SelectValue placeholder="Assign a room (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRooms.map((r) => (
                            <SelectItem key={r.id} value={String(r.id)}>
                              {r.name}
                              {r.building ? ` (${r.building})` : ""} —{" "}
                              {(r as any).currentOccupancy || 0}/{r.capacity}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button
                    className={`w-full h-10 font-semibold gap-1.5 ${(booking as any).vaccineStatus === 'incomplete' ? 'bg-red-200 text-red-500 cursor-not-allowed' : issues ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                    onClick={() => handleCheckIn(booking.id)}
                    disabled={updateStatus.isPending || assignRoom.isPending || (booking as any).vaccineStatus === 'incomplete'}
                  >
                    {issues && (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <LogIn className="h-4 w-4" /> Check In
                    {roomSelections[booking.id] && " & Assign Room"}
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
                      {getBookingDogCount(booking) > 1 && (
                        <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-primary/10 text-primary">
                          {getBookingDogCount(booking)} dogs
                        </span>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        {getDogBreed(booking.dogId)}
                        {getDogBreed(booking.dogId) ? " · " : ""}
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
                      {room && (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1"
                        >
                          <DoorOpen className="h-2.5 w-2.5" /> {room.name}
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

                  <Button
                    variant="outline"
                    className="w-full h-10 font-semibold gap-1.5"
                    onClick={() => handleCheckOutStart(booking.id)}
                    disabled={updateStatus.isPending || addBookingAddOn.isPending}
                  >
                    <LogOut className="h-4 w-4" /> Check Out
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Missing Info Warning Dialog */}
      <Dialog
        open={warningBookingId !== null}
        onOpenChange={() => setWarningBookingId(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              Missing Required Information
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm font-semibold text-amber-800 mb-2">
                {warningIssues?.dogName} is missing:
              </p>
              <ul className="space-y-1">
                {warningIssues?.details.map((d, i) => (
                  <li
                    key={i}
                    className="text-sm text-amber-700 flex items-start gap-2"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              The customer should be notified to update their dog's profile
              before the stay. You can still proceed with check-in if needed.
            </p>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWarningBookingId(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => {
                if (warningBookingId) {
                  handleCheckIn(warningBookingId, true);
                }
                setWarningBookingId(null);
              }}
            >
              Check In Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Add-Ons Dialog */}
      <Dialog
        open={checkoutBookingId !== null}
        onOpenChange={() => { setCheckoutBookingId(null); setSelectedAddOns({}); }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bath className="h-5 w-5 text-primary" />
              Checkout Add-Ons
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select any optional add-on services for this checkout:
            </p>
            {availableAddOns?.map(addOn => (
              <Card
                key={addOn.id}
                className={`cursor-pointer transition-all border-2 ${selectedAddOns[addOn.id] ? "border-primary bg-primary/5" : "border-transparent bg-white shadow-sm"}`}
                onClick={() => setSelectedAddOns(prev => ({ ...prev, [addOn.id]: !prev[addOn.id] }))}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <Checkbox checked={!!selectedAddOns[addOn.id]} className="pointer-events-none" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{addOn.name}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">${String(addOn.price)}</span>
                </CardContent>
              </Card>
            ))}
            {addOnTotal > 0 && (
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Add-on Total</span>
                <span className="text-sm font-bold text-primary">${addOnTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Check out without add-ons
                if (checkoutBookingId) handleCheckOutConfirm(checkoutBookingId, {});
              }}
            >
              Skip Add-Ons
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (checkoutBookingId) handleCheckOutConfirm(checkoutBookingId, selectedAddOns);
              }}
              disabled={updateStatus.isPending || addBookingAddOn.isPending}
            >
              {addBookingAddOn.isPending ? "Processing..." : (
                Object.values(selectedAddOns).some(v => v) ? "Check Out with Add-Ons" : "Check Out"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
