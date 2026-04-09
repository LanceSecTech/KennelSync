import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dog, Utensils, Pill, Heart, Phone, Shield, AlertCircle, CheckCircle2, Clock, CalendarDays } from "lucide-react";
import { useState, useMemo } from "react";
import { formatDate, parseLocalDate, todayString } from "@/lib/dateUtils";

export default function EmployeeDogs() {
  const { activeKennelId: kennelId } = useKennel();
  const { data: bookings, isLoading } = trpc.booking.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );
  const [selectedDogId, setSelectedDogId] = useState<number | null>(null);

  // Get active bookings (checked_in) with dog IDs
  const activeBookings = useMemo(() => {
    return bookings?.filter(b => b.status === "checked_in") || [];
  }, [bookings]);

  // Get unique dog IDs from active bookings
  const activeDogIds = Array.from(new Set(activeBookings.map(b => b.dogId)));

  // Map dogId -> booking for stay info
  const dogBookingMap = useMemo(() => {
    const map = new Map<number, typeof activeBookings[0]>();
    for (const b of activeBookings) {
      map.set(b.dogId, b);
    }
    return map;
  }, [activeBookings]);

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
      <h1 className="text-xl font-bold">Dogs in Care</h1>

      {activeDogIds.length === 0 && (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="p-8 text-center">
            <Dog className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No dogs currently boarded</p>
          </CardContent>
        </Card>
      )}

      {activeDogIds.map(dogId => (
        <DogCareCard
          key={dogId}
          dogId={dogId}
          booking={dogBookingMap.get(dogId)}
          isExpanded={selectedDogId === dogId}
          onToggle={() => setSelectedDogId(selectedDogId === dogId ? null : dogId)}
        />
      ))}
    </div>
  );
}

function DogCareCard({ dogId, booking, isExpanded, onToggle }: {
  dogId: number;
  booking?: any;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { data: dog } = trpc.dog.getById.useQuery({ id: dogId });
  const { data: vaccinations } = trpc.vaccination.byDog.useQuery({ dogId });

  // Calculate stay length — must be before any early return to satisfy Rules of Hooks
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
      label: totalDays
        ? `Day ${daysSoFar} of ${totalDays}`
        : `Day ${daysSoFar}`,
    };
  }, [booking]);

  if (!dog) return null;

  const hasVaxIssues = vaccinations?.some(v => v.status === "expired" || v.status === "missing");

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="p-0">
        {/* Dog Header */}
        <button
          onClick={onToggle}
          className="w-full p-4 flex items-center gap-3 text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            {dog.photoUrl ? (
              <img src={dog.photoUrl} alt={dog.name} className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <Dog className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{dog.name}</h3>
              {hasVaxIssues && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
            </div>
            <p className="text-xs text-muted-foreground">
              {[dog.breed, dog.age ? `${dog.age}y` : null, dog.weight ? `${dog.weight}lbs` : null]
                .filter(Boolean).join(" · ")}
            </p>
            {/* Stay length info */}
            {stayInfo && (
              <div className="flex items-center gap-1.5 mt-1">
                <CalendarDays className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-medium text-primary">{stayInfo.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  ({stayInfo.checkIn}{stayInfo.checkOut ? ` - ${stayInfo.checkOut}` : ""})
                </span>
              </div>
            )}
          </div>
        </button>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-3 border-t pt-3">
            <Tabs defaultValue="care" className="w-full">
              <TabsList className="w-full grid grid-cols-3 h-8">
                <TabsTrigger value="care" className="text-[10px]">Care</TabsTrigger>
                <TabsTrigger value="medical" className="text-[10px]">Medical</TabsTrigger>
                <TabsTrigger value="contacts" className="text-[10px]">Contacts</TabsTrigger>
              </TabsList>

              <TabsContent value="care" className="space-y-2 mt-2">
                <InfoRow icon={<Utensils className="h-3.5 w-3.5 text-primary" />} label="Feeding" value={dog.feedingInstructions} />
                <InfoRow icon={<Heart className="h-3.5 w-3.5 text-primary" />} label="Behavior Notes" value={dog.behaviorNotes} />
                <InfoRow icon={<Heart className="h-3.5 w-3.5 text-primary" />} label="Special Needs" value={dog.specialNeeds} />
              </TabsContent>

              <TabsContent value="medical" className="space-y-2 mt-2">
                <InfoRow icon={<Pill className="h-3.5 w-3.5 text-primary" />} label="Medications" value={dog.medications} />
                {/* Vaccination Status */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Vaccinations
                  </p>
                  {vaccinations?.map(v => (
                    <div key={v.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/50">
                      {v.status === "current" && <CheckCircle2 className="h-3 w-3 text-success" />}
                      {v.status === "expiring_soon" && <Clock className="h-3 w-3 text-warning" />}
                      {(v.status === "expired" || v.status === "missing") && <AlertCircle className="h-3 w-3 text-destructive" />}
                      <span>{v.vaccineName}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground capitalize">{v.status?.replace("_", " ")}</span>
                    </div>
                  ))}
                  {(!vaccinations || vaccinations.length === 0) && (
                    <p className="text-xs text-muted-foreground italic">No vaccination records</p>
                  )}
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
