import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dog, Utensils, Pill, Heart, Phone, Shield, AlertCircle, CheckCircle2, Clock, CalendarDays, LogOut } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useSearch } from "wouter";
import { formatDate, parseLocalDate, todayString } from "@/lib/dateUtils";
import { DogBadgesInline } from "@/components/DogBadgesInline";
import { CheckoutStayDialog } from "@/components/CheckoutStayDialog";

/** All dog IDs on a booking (primary + booking_dogs), deduped. */
function dogIdsForBooking(b: any): number[] {
  const raw = Array.isArray(b.dogIdsOnBooking) && b.dogIdsOnBooking.length
    ? b.dogIdsOnBooking
    : [b.dogId];
  const seen = new Set<number>();
  const out: number[] = [];
  for (const id of raw) {
    if (id == null) continue;
    const n = Number(id);
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out.length ? out : b.dogId != null ? [b.dogId] : [];
}

export default function EmployeeDogs() {
  const { activeKennelId: kennelId } = useKennel();
  const search = useSearch();
  const utils = trpc.useUtils();
  const { data: bookings, isLoading } = trpc.booking.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const [selectedDogId, setSelectedDogId] = useState<number | null>(null);
  const [checkoutBooking, setCheckoutBooking] = useState<any | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(search);
    const raw = q.get("dogId");
    if (raw == null || raw === "") return;
    const n = parseInt(raw, 10);
    if (Number.isFinite(n)) setSelectedDogId(n);
  }, [search]);

  const activeBookings = useMemo(() => {
    return bookings?.filter((b) => b.status === "checked_in") || [];
  }, [bookings]);

  /** One row per dog; multi-dog bookings produce multiple cards sharing the same booking. */
  const dogStayRows = useMemo(() => {
    const rows: { dogId: number; booking: (typeof activeBookings)[0] }[] = [];
    for (const b of activeBookings) {
      for (const dogId of dogIdsForBooking(b)) {
        rows.push({ dogId, booking: b });
      }
    }
    return rows;
  }, [activeBookings]);
  const dogIds = useMemo(() => dogStayRows.map((r) => r.dogId), [dogStayRows]);
  const { data: badgeCatalog } = trpc.dogBadge.listByKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId },
  );
  const { data: badgeAssignments } = trpc.dogBadge.assignedForDogs.useQuery(
    { kennelId: kennelId!, dogIds },
    { enabled: !!kennelId && dogIds.length > 0 },
  );
  const badgeByKey = useMemo(
    () => new Map(((badgeCatalog || []) as any[]).map((b: any) => [String(b.key || "").toLowerCase(), b])),
    [badgeCatalog],
  );

  const invalidateStays = () => {
    utils.booking.byKennel.invalidate();
    utils.booking.todayTasks.invalidate();
    utils.room.byKennel.invalidate();
    utils.room.currentAssignments.invalidate();
  };

  const openCheckout = (booking?: any, dogName?: string) => {
    if (!booking?.id || !kennelId) return;
    setCheckoutBooking({ booking, dogName });
  };

  const checkoutDogLabel = checkoutBooking
    ? (() => {
        const b = checkoutBooking.booking;
        const single = checkoutBooking.dogName;
        if (b?.dogNames?.length) return b.dogNames.join(", ");
        if (b?.dogName) return b.dogName;
        return single || "Dog";
      })()
    : "";

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
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Dogs in Care</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Each dog is listed separately; multi-dog reservations show one card per dog.
        </p>
      </div>

      {dogStayRows.length === 0 && (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="p-8 text-center">
            <Dog className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No dogs currently boarded</p>
          </CardContent>
        </Card>
      )}

      {dogStayRows.map(({ dogId, booking }) => (
        <DogCareCard
          key={`${booking.id}-${dogId}`}
          dogId={dogId}
          booking={booking}
          onCheckOut={openCheckout}
          isExpanded={selectedDogId === dogId}
          onToggle={() => setSelectedDogId(selectedDogId === dogId ? null : dogId)}
          badgeKeys={((badgeAssignments as any)?.[String(dogId)] || []).map((k: string) => String(k).toLowerCase())}
          badgeByKey={badgeByKey}
        />
      ))}

      {kennelId && (
        <CheckoutStayDialog
          open={!!checkoutBooking}
          onOpenChange={(open) => !open && setCheckoutBooking(null)}
          kennelId={kennelId}
          booking={checkoutBooking?.booking ?? null}
          dogLabel={checkoutDogLabel}
          onCompleted={invalidateStays}
        />
      )}
    </div>
  );
}

function DogCareCard({
  dogId,
  booking,
  onCheckOut,
  isExpanded,
  onToggle,
  badgeKeys,
  badgeByKey,
}: {
  dogId: number;
  booking?: any;
  onCheckOut: (booking?: any, dogName?: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
  badgeKeys: string[];
  badgeByKey: Map<string, any>;
}) {
  const { data: dog } = trpc.dog.getById.useQuery({ id: dogId });
  const { data: vaccinations } = trpc.vaccination.byDog.useQuery({ dogId });

  const stayInfo = useMemo(() => {
    if (!booking) return null;
    const checkIn = parseLocalDate(booking.checkInDate);
    const checkOut = booking.checkOutDate ? parseLocalDate(booking.checkOutDate) : null;
    const today = parseLocalDate(todayString());
    if (!checkIn || !today) return null;

    const daysSoFar = Math.max(1, Math.ceil((today.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    let totalDays: number | null = null;
    if (checkOut) {
      totalDays = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return {
      checkIn: formatDate(booking.checkInDate),
      checkOut: checkOut ? formatDate(booking.checkOutDate) : null,
      daysSoFar,
      totalDays,
      label: totalDays ? `Day ${daysSoFar} of ${totalDays}` : `Day ${daysSoFar}`,
    };
  }, [booking]);

  if (!dog) return null;

  const hasVaxIssues = vaccinations?.some((v) => v.status === "expired" || v.status === "missing");
  const multi =
    booking &&
    dogIdsForBooking(booking).length > 1;

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="p-0">
        <button type="button" onClick={onToggle} className="w-full p-4 flex items-center gap-3 text-left">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            {dog.photoUrl ? (
              <img src={dog.photoUrl} alt={dog.name} className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <Dog className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold">{dog.name}</h3>
              <DogBadgesInline badgeKeys={badgeKeys} badgeByKey={badgeByKey} />
              {hasVaxIssues && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
              {multi && booking && (
                <span className="text-[9px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  Reservation #{booking.id}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {[dog.breed, dog.age ? `${dog.age}y` : null, dog.weight ? `${dog.weight}lbs` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {stayInfo && (
              <div className="flex items-center gap-1.5 mt-1">
                <CalendarDays className="h-3 w-3 text-primary shrink-0" />
                <span className="text-[10px] font-medium text-primary">{stayInfo.label}</span>
                <span className="text-[10px] text-muted-foreground truncate">
                  ({stayInfo.checkIn}
                  {stayInfo.checkOut ? ` - ${stayInfo.checkOut}` : ""})
                </span>
              </div>
            )}
          </div>
        </button>
        <div className="px-4 pb-3 -mt-1">
          <Button
            type="button"
            variant="outline"
            className="w-full h-8 text-xs font-semibold"
            disabled={!booking}
            onClick={() => onCheckOut(booking, dog.name)}
          >
            <LogOut className="h-3.5 w-3.5 mr-1" />
            Check out reservation
          </Button>
          {multi && (
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              Checks out all dogs on this reservation.
            </p>
          )}
        </div>

        {isExpanded && (
          <div className="px-4 pb-4 space-y-3 border-t pt-3">
            <Tabs defaultValue="care" className="w-full">
              <TabsList className="w-full grid grid-cols-3 h-8">
                <TabsTrigger value="care" className="text-[10px]">
                  Care
                </TabsTrigger>
                <TabsTrigger value="medical" className="text-[10px]">
                  Medical
                </TabsTrigger>
                <TabsTrigger value="contacts" className="text-[10px]">
                  Contacts
                </TabsTrigger>
              </TabsList>

              <TabsContent value="care" className="space-y-2 mt-2">
                <InfoRow icon={<Utensils className="h-3.5 w-3.5 text-primary" />} label="Feeding" value={dog.feedingInstructions} />
                <InfoRow icon={<Heart className="h-3.5 w-3.5 text-primary" />} label="Behavior Notes" value={dog.behaviorNotes} />
                <InfoRow icon={<Heart className="h-3.5 w-3.5 text-primary" />} label="Special Needs" value={dog.specialNeeds} />
              </TabsContent>

              <TabsContent value="medical" className="space-y-2 mt-2">
                <InfoRow icon={<Pill className="h-3.5 w-3.5 text-primary" />} label="Medications" value={dog.medications} />
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Vaccinations
                  </p>
                  {vaccinations?.map((v) => (
                    <div key={v.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/50">
                      {v.status === "current" && <CheckCircle2 className="h-3 w-3 text-success" />}
                      {v.status === "expiring_soon" && <Clock className="h-3 w-3 text-warning" />}
                      {(v.status === "expired" || v.status === "missing") && <AlertCircle className="h-3 w-3 text-destructive" />}
                      <span>{v.vaccineName}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground capitalize">{v.status?.replace("_", " ")}</span>
                    </div>
                  ))}
                  {(!vaccinations || vaccinations.length === 0) && <p className="text-xs text-muted-foreground italic">No vaccination records</p>}
                </div>
              </TabsContent>

              <TabsContent value="contacts" className="space-y-2 mt-2">
                <InfoRow icon={<Phone className="h-3.5 w-3.5 text-primary" />} label="Emergency Contact" value={dog.emergencyContactName} />
                <InfoRow icon={<Phone className="h-3.5 w-3.5 text-primary" />} label="Emergency Phone" value={dog.emergencyContactPhone} />
                <InfoRow icon={<Phone className="h-3.5 w-3.5 text-primary" />} label="Vet" value={dog.vetName} />
                <InfoRow icon={<Phone className="h-3.5 w-3.5 text-primary" />} label="Vet Phone" value={dog.vetPhone} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-xs text-foreground">{value || <span className="italic text-muted-foreground">Not provided</span>}</p>
      </div>
    </div>
  );
}
