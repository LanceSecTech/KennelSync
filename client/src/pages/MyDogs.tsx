import { trpc } from "@/lib/trpc";
import { reqVaccineLabel, vaxMeetsRequired, vaxStatusSafe } from "@/lib/vaccinationUtils";
import { useKennel } from "@/contexts/KennelContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from "wouter";
import { Plus, Dog, AlertTriangle, CheckCircle2, ChevronRight, Shield, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function MyDogs() {
  const { data: dogs, isLoading } = trpc.dog.myDogs.useQuery();
  const [, setLocation] = useLocation();
  const [showAdd, setShowAdd] = useState(false);
  const utils = trpc.useUtils();

  const createDog = trpc.dog.create.useMutation({
    onSuccess: () => {
      utils.dog.myDogs.invalidate();
      setShowAdd(false);
      setForm({ name: "", breed: "", age: "", weight: "", birthday: "", sex: "", isSpayedNeutered: false });
      toast.success("Dog added successfully!");
    },
    onError: () => toast.error("Failed to add dog"),
  });

  const [form, setForm] = useState({
    name: "",
    breed: "",
    age: "",
    birthday: "",
    sex: "" as "male" | "female" | "",
    weight: "",
    isSpayedNeutered: false,
  });

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Dog name is required");
      return;
    }
    createDog.mutate({
      name: form.name,
      breed: form.breed || undefined,
      age: form.age ? parseInt(form.age) : undefined,
      birthday: form.birthday || undefined,
      sex: form.sex === "" ? undefined : form.sex,
      weight: form.weight ? parseFloat(form.weight) : undefined,
      isSpayedNeutered: form.isSpayedNeutered,
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-8 bg-muted rounded animate-pulse w-32" />
        {[1, 2].map(i => (
          <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">My Dogs</h1>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Dog
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm mx-auto">
            <DialogHeader>
              <DialogTitle>Add a Dog</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Dog's name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Breed</Label>
                <Input
                  value={form.breed}
                  onChange={e => setForm(f => ({ ...f, breed: e.target.value }))}
                  placeholder="e.g. Golden Retriever"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Age (years)</Label>
                  <Input
                    type="number"
                    value={form.age}
                    onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                    placeholder="Age"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Weight (lbs)</Label>
                  <Input
                    value={form.weight}
                    onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                    placeholder="Weight"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Birthday</Label>
                <Input
                  type="date"
                  value={form.birthday}
                  onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Sex</Label>
                <Select value={form.sex} onValueChange={v => setForm(f => ({ ...f, sex: v as "male" | "female" }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Spayed / Neutered</Label>
                <Select value={form.isSpayedNeutered ? "yes" : "no"} onValueChange={v => setForm(f => ({ ...f, isSpayedNeutered: v === "yes" }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={createDog.isPending}>
                {createDog.isPending ? "Adding..." : "Add Dog"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(!dogs || dogs.length === 0) && (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="p-8 text-center">
            <Dog className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No dogs yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add your first dog to get started</p>
          </CardContent>
        </Card>
      )}

      {dogs?.map(dog => (
        <DogCard key={dog.id} dog={dog} onClick={() => setLocation(`/dogs/${dog.id}`)} />
      ))}
    </div>
  );
}

function DogCard({ dog, onClick }: { dog: any; onClick: () => void }) {
  const { data: vaccinations } = trpc.vaccination.byDog.useQuery({ dogId: dog.id });
  const { activeKennelId } = useKennel();
  const { data: requiredVaccines } = trpc.requiredVaccine.byKennel.useQuery(
    { kennelId: activeKennelId! },
    { enabled: !!activeKennelId }
  );

  // Check if any required vaccines are missing (only when linked to a kennel)
  const missingRequired = (activeKennelId && requiredVaccines)
    ? requiredVaccines.filter(rv => {
        const label = reqVaccineLabel(rv);
        if (!label) return false;
        return !(vaccinations ?? []).some(v => vaxMeetsRequired(v, label));
      })
    : [];
  const hasExpiredVaccines = (vaccinations ?? []).some(v => vaxStatusSafe(v) === "expired");
  const missingVaccines = missingRequired.length > 0 || hasExpiredVaccines;
  const missingEmergencyContact = !dog.emergencyContactName || !dog.emergencyContactPhone;
  const hasIssues = missingVaccines || missingEmergencyContact;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm bg-white"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            {dog.photoUrl ? (
              <img src={dog.photoUrl} alt={dog.name} className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <Dog className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{dog.name}</h3>
            <p className="text-xs text-muted-foreground">
              {[dog.breed, dog.age ? `${dog.age}y` : null, dog.weight ? `${dog.weight}lbs` : null]
                .filter(Boolean)
                .join(" · ") || "No details yet"}
            </p>
            {/* Missing info indicators */}
            {hasIssues && (
              <div className="flex items-center gap-2 mt-1.5">
                {missingVaccines && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                        <span className="font-bold text-red-600 text-xs">!</span>
                        <Shield className="h-3 w-3" />
                        Vaccinations
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">
                        {missingRequired.length > 0
                          ? `Missing required: ${missingRequired.map(rv => reqVaccineLabel(rv)).filter(Boolean).join(", ")}`
                          : "Some vaccinations are expired"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {missingEmergencyContact && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                        <AlertTriangle className="h-3 w-3" />
                        <Phone className="h-3 w-3" />
                        Emergency
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Missing emergency contact information</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!hasIssues && (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
