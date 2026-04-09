import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { CalendarDays, CheckCircle2, XCircle, Pencil, AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { formatDate, toDateString } from "@/lib/dateUtils";

type FilterType = "all" | "pending" | "confirmed" | "checked_in";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  checked_in: "bg-green-100 text-green-800",
  checked_out: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-gray-100 text-gray-800",
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
  const { data: missingInfo } = trpc.alert.missingDogInfo.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const [filter, setFilter] = useState<FilterType>("all");
  const [editBooking, setEditBooking] = useState<any>(null);
  const utils = trpc.useUtils();

  // Build a map of dogId -> dog name
  const dogNameMap = useMemo(() => {
    const map = new Map<number, string>();
    if (allDogs) {
      for (const dog of allDogs) {
        map.set(dog.id, dog.name);
      }
    }
    return map;
  }, [allDogs]);

  // Build a map of bookingId -> missing info issues
  const missingInfoMap = useMemo(() => {
    const map = new Map<number, { dogName: string; details: string[] }>();
    if (missingInfo) {
      for (const issue of missingInfo) {
        map.set(issue.bookingId, { dogName: issue.dogName, details: [issue.details] });
      }
    }
    return map;
  }, [missingInfo]);

  const updateStatus = trpc.booking.updateStatus.useMutation({
    onSuccess: () => {
      utils.booking.byKennel.invalidate();
      utils.stats.ownerDashboard.invalidate();
      toast.success("Booking updated!");
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  const editMutation = trpc.booking.edit.useMutation({
    onSuccess: () => {
      utils.booking.byKennel.invalidate();
      setEditBooking(null);
      toast.success("Booking updated!");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    if (!bookings) return [];
    if (filter === "all") return bookings;
    return bookings.filter(b => b.status === filter);
  }, [bookings, filter]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-8 bg-muted rounded animate-pulse w-32" />
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Bookings</h1>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(["all", "pending", "confirmed", "checked_in"] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f === "all" ? "All" : f.replace("_", " ")}
            {f !== "all" && ` (${bookings?.filter(b => b.status === f).length || 0})`}
          </button>
        ))}
      </div>

      {/* Booking List */}
      {filtered.length === 0 && (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="p-6 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No bookings found</p>
          </CardContent>
        </Card>
      )}

      {filtered.map(booking => {
        const issues = missingInfoMap.get(booking.id);
        const dogLabel = (booking as any).dogNames?.length > 0
          ? (booking as any).dogNames.join(", ")
          : (dogNameMap.get(booking.dogId) || "Unknown Dog");
        const dogCount = (booking as any).dogNames?.length || 1;
        return (
          <Card key={booking.id} className={`border-0 shadow-sm bg-white ${issues ? 'ring-1 ring-amber-300' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{dogLabel} · #{booking.id}</span>
                  {dogCount > 1 && (
                    <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-primary/10 text-primary">
                      {dogCount} dogs
                    </span>
                  )}
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${statusColors[booking.status]}`}>
                    {booking.status.replace("_", " ")}
                  </span>
                  {issues && (
                    <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-amber-100 text-amber-800 flex items-center gap-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" /> INFO MISSING
                    </span>
                  )}
                  {(booking as any).vaccineStatus === 'incomplete' && (
                    <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-red-100 text-red-800 flex items-center gap-0.5">
                      <ShieldAlert className="h-2.5 w-2.5" /> VACCINES
                    </span>
                  )}
                  {(booking as any).vaccineStatus === 'complete' && (
                    <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-green-100 text-green-700 flex items-center gap-0.5">
                      <ShieldCheck className="h-2.5 w-2.5" /> VAX OK
                    </span>
                  )}
                </div>
                {booking.totalPrice && (
                  <span className="text-sm font-bold">${String(booking.totalPrice)}</span>
                )}
              </div>

              {/* Vaccine Warning Banner */}
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

              {/* Missing Info Warning Banner */}
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

              <div className="text-xs text-muted-foreground space-y-0.5">
                <p className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {formatDate(booking.checkInDate)}
                  {booking.checkOutDate && ` - ${formatDate(booking.checkOutDate)}`}
                </p>
                {booking.notes && (
                  <p className="text-xs mt-1 italic">"{booking.notes}"</p>
                )}
              </div>
              {/* Action Buttons */}
              <div className="flex gap-2 mt-3">
                {booking.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => updateStatus.mutate({ id: booking.id, status: "confirmed" })}
                    >
                      <CheckCircle2 className="h-3 w-3" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => setEditBooking(booking)}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-destructive border-destructive/30"
                      onClick={() => updateStatus.mutate({ id: booking.id, status: "cancelled" })}
                    >
                      <XCircle className="h-3 w-3" /> Decline
                    </Button>
                  </>
                )}
                {booking.status === "confirmed" && (
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => updateStatus.mutate({ id: booking.id, status: "checked_in" })}
                  >
                    Check In
                  </Button>
                )}
                {booking.status === "checked_in" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => updateStatus.mutate({ id: booking.id, status: "checked_out" })}
                  >
                    Check Out
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Edit Booking Dialog */}
      {editBooking && (
        <EditBookingDialog
          booking={editBooking}
          dogName={(editBooking as any).dogNames?.length > 0 ? (editBooking as any).dogNames.join(", ") : (dogNameMap.get(editBooking.dogId) || "Unknown Dog")}
          onClose={() => setEditBooking(null)}
          onSave={(data) => editMutation.mutate({ id: editBooking.id, ...data })}
          isPending={editMutation.isPending}
        />
      )}
    </div>
  );
}

function EditBookingDialog({ booking, dogName, onClose, onSave, isPending }: {
  booking: any;
  dogName: string;
  onClose: () => void;
  onSave: (data: { checkInDate?: string; checkOutDate?: string; notes?: string }) => void;
  isPending: boolean;
}) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setCheckIn(toDateString(booking.checkInDate));
    setCheckOut(toDateString(booking.checkOutDate));
    setNotes(booking.notes || "");
  }, [booking]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Booking · {dogName} #{booking.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs">Check-In Date</Label>
            <Input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Check-Out Date</Label>
            <Input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1" placeholder="Special requests or notes..." />
          </div>
        </div>
        <DialogFooter className="mt-2">
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          <Button size="sm" onClick={() => onSave({
            checkInDate: checkIn || undefined,
            checkOutDate: checkOut || undefined,
            notes: notes || undefined,
          })} disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
