import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { CalendarDays, Pencil, Dog, CreditCard } from "lucide-react";
import { CustomerBookingPayButton } from "@/components/CustomerBookingPayButton";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { formatDate, toDateString, todayString } from "@/lib/dateUtils";

type FilterType = "upcoming" | "pending" | "past";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  checked_in: "bg-green-100 text-green-800",
  checked_out: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-gray-100 text-gray-800",
};

export default function MyStays() {
  const { data: bookings, isLoading } = trpc.booking.myBookings.useQuery();
  const [filter, setFilter] = useState<FilterType>("upcoming");
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [editBooking, setEditBooking] = useState<any>(null);

  const cancelBooking = trpc.booking.cancel.useMutation({
    onSuccess: () => {
      utils.booking.myBookings.invalidate();
      toast.success("Booking cancelled");
    },
  });

  const editMutation = trpc.booking.edit.useMutation({
    onSuccess: () => {
      utils.booking.myBookings.invalidate();
      setEditBooking(null);
      toast.success("Booking updated!");
    },
    onError: (e) => toast.error(e.message),
  });

  const today = todayString();

  const filtered = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter(b => {
      const ci = toDateString(b.checkInDate);
      switch (filter) {
        case "upcoming":
          return (b.status === "confirmed" || b.status === "checked_in") && ci >= today;
        case "pending":
          return b.status === "pending";
        case "past":
          return b.status === "completed" || b.status === "checked_out" || b.status === "cancelled" || ci < today;
      }
    });
  }, [bookings, filter, today]);

  const counts = useMemo(() => {
    if (!bookings) return { upcoming: 0, pending: 0, past: 0 };
    return {
      upcoming: bookings.filter(b => (b.status === "confirmed" || b.status === "checked_in") && toDateString(b.checkInDate) >= today).length,
      pending: bookings.filter(b => b.status === "pending").length,
      past: bookings.filter(b => b.status === "completed" || b.status === "checked_out" || b.status === "cancelled").length,
    };
  }, [bookings, today]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-8 bg-muted rounded animate-pulse w-32" />
        {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">My Stays</h1>

      {/* Filter Cards */}
      <div className="grid grid-cols-3 gap-2">
        {(["upcoming", "pending", "past"] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`p-3 rounded-xl text-center transition-all ${
              filter === f ? "bg-primary text-primary-foreground shadow-md" : "bg-white shadow-sm hover:shadow-md"
            }`}
          >
            <p className={`text-lg font-bold ${filter === f ? "" : "text-foreground"}`}>
              {counts[f]}
            </p>
            <p className={`text-[10px] font-medium capitalize ${filter === f ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
              {f}
            </p>
          </button>
        ))}
      </div>

      {/* Booking List */}
      {filtered.length === 0 && (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="p-6 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No {filter} stays</p>
          </CardContent>
        </Card>
      )}

      {filtered.map(booking => {
        // Use enriched dogNames from backend, fallback to primary dog
        const dogLabel = (booking as any).dogNames?.length > 0
          ? (booking as any).dogNames.join(", ")
          : ((booking as any).dogName || "Unknown Dog");
        const dogCount = (booking as any).dogNames?.length || 1;
        return (
          <Card key={booking.id} className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Dog className="h-3.5 w-3.5 text-primary" />
                    <h3 className="text-sm font-semibold">{dogLabel}</h3>
                    {dogCount > 1 && (
                      <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-primary/10 text-primary">
                        {dogCount} dogs
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${statusColors[booking.status]}`}>
                    {booking.status.replace("_", " ")}
                  </span>
                </div>
                {booking.totalPrice && (
                  <span className="text-sm font-bold text-primary">${String(booking.totalPrice)}</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {formatDate(booking.checkInDate)}
                  {booking.checkOutDate && ` - ${formatDate(booking.checkOutDate)}`}
                </span>
                {booking.paymentStatus && (
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                    booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                    booking.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    <CreditCard className="h-3 w-3 inline mr-0.5" />
                    {booking.paymentStatus === 'paid' ? 'Paid' : booking.paymentStatus === 'partial' ? 'Partial' : 'Unpaid'}
                  </span>
                )}
              </div>
              {(booking.status === "pending" || booking.status === "confirmed") && (
                <div className="flex gap-2 mt-3">
                  {booking.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => setEditBooking(booking)}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() => cancelBooking.mutate({ id: booking.id })}
                  >
                    Cancel
                  </Button>
                  {booking.paymentStatus !== 'paid' && parseFloat(String(booking.totalPrice || '0')) > 0 && (
                    <CustomerBookingPayButton bookingId={booking.id} />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Edit Booking Dialog */}
      {editBooking && (
        <EditBookingDialog
          booking={editBooking}
          onClose={() => setEditBooking(null)}
          onSave={(data) => editMutation.mutate({ id: editBooking.id, ...data })}
          isPending={editMutation.isPending}
        />
      )}
    </div>
  );
}

function EditBookingDialog({ booking, onClose, onSave, isPending }: {
  booking: any;
  onClose: () => void;
  onSave: (data: { checkInDate?: string; checkOutDate?: string; notes?: string }) => void;
  isPending: boolean;
}) {
  const dogLabel = booking.dogNames?.length > 0 ? booking.dogNames.join(", ") : (booking.dogName || "Unknown Dog");
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
          <DialogTitle>Edit Booking · {dogLabel} #{booking.id}</DialogTitle>
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
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1" placeholder="Any special requests..." />
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
