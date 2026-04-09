import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft, Dog, Shield, Utensils, Pill, Heart, Stethoscope, Phone, Plus, Trash2,
  CheckCircle2, AlertCircle, Clock, FileText, Edit2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import FileUpload from "@/components/FileUpload";
import { formatDate } from "@/lib/dateUtils";

export default function DogProfile() {
  const params = useParams<{ id: string }>();
  const dogId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: dog, isLoading } = trpc.dog.getById.useQuery({ id: dogId });
  const { data: vaccinations } = trpc.vaccination.byDog.useQuery({ dogId });
  const { activeKennelId } = useKennel();
  const { data: requiredVaccines } = trpc.requiredVaccine.byKennel.useQuery(
    { kennelId: activeKennelId! },
    { enabled: !!activeKennelId }
  );
  const updateDog = trpc.dog.update.useMutation({
    onSuccess: () => {
      utils.dog.getById.invalidate({ id: dogId });
      utils.dog.myDogs.invalidate();
      toast.success("Dog profile updated!");
    },
  });

  const [showVaxDialog, setShowVaxDialog] = useState(false);
  const [showEditInfo, setShowEditInfo] = useState(false);
  const createVax = trpc.vaccination.create.useMutation({
    onSuccess: () => {
      utils.vaccination.byDog.invalidate({ dogId });
      setShowVaxDialog(false);
      setVaxForm({ vaccineName: "", dateAdministered: "", expirationDate: "", status: "current", documentUrl: "" });
      setUseCustomVax(false);
      setCustomVaxName("");
      toast.success("Vaccination added!");
    },
  });
  const updateVax = trpc.vaccination.update.useMutation({
    onSuccess: () => {
      utils.vaccination.byDog.invalidate({ dogId });
      toast.success("Vaccination updated!");
    },
  });
  const deleteVax = trpc.vaccination.delete.useMutation({
    onSuccess: () => {
      utils.vaccination.byDog.invalidate({ dogId });
      toast.success("Vaccination removed");
    },
  });

  const [vaxForm, setVaxForm] = useState({
    vaccineName: "", dateAdministered: "", expirationDate: "", status: "current" as string, documentUrl: "",
  });
  const [useCustomVax, setUseCustomVax] = useState(false);
  const [customVaxName, setCustomVaxName] = useState("");

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-8 bg-muted rounded animate-pulse w-32" />
        <div className="h-40 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!dog) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Dog not found</p>
        <Button variant="ghost" onClick={() => setLocation("/dogs")} className="mt-2">Go back</Button>
      </div>
    );
  }

  const handleSave = (field: string, value: any) => {
    updateDog.mutate({ id: dogId, [field]: value });
  };

  const handlePhotoUpload = (url: string) => {
    updateDog.mutate({ id: dogId, photoUrl: url });
  };

  const handlePhotoRemove = () => {
    updateDog.mutate({ id: dogId, photoUrl: "" });
  };

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setLocation("/dogs")} className="p-1.5 rounded-lg hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">{dog.name}</h1>
      </div>

      {/* Dog Overview Card with Photo Upload and Edit Info Button */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Photo Upload Area */}
            <FileUpload
              onUpload={handlePhotoUpload}
              currentUrl={dog.photoUrl}
              onRemove={handlePhotoRemove}
              accept="image/*"
              folder="dog-photos"
              variant="photo"
              label="Add Photo"
              maxSizeMB={10}
            />
            <div className="flex-1">
              <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                <div>
                  <span className="text-muted-foreground">Breed:</span>{" "}
                  <span className="font-medium">{dog.breed || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Age:</span>{" "}
                  <span className="font-medium">{dog.age ? `${dog.age}y` : "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Weight:</span>{" "}
                  <span className="font-medium">{dog.weight ? `${dog.weight}lbs` : "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Sex:</span>{" "}
                  <span className="font-medium capitalize">{dog.sex || "—"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Spayed/Neutered:</span>{" "}
                  <span className="font-medium">{dog.isSpayedNeutered ? "Yes" : "No"}</span>
                </div>
              </div>
              {/* Edit Info Button */}
              <EditInfoDialog dog={dog} dogId={dogId} onSave={(data) => {
                updateDog.mutate({ id: dogId, ...data }, {
                  onSuccess: () => setShowEditInfo(false),
                });
              }} isPending={updateDog.isPending} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Sections */}
      <Tabs defaultValue="vaccinations" className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-9">
          <TabsTrigger value="vaccinations" className="text-xs px-1">Vaccines</TabsTrigger>
          <TabsTrigger value="care" className="text-xs px-1">Care</TabsTrigger>
          <TabsTrigger value="medical" className="text-xs px-1">Medical</TabsTrigger>
          <TabsTrigger value="contacts" className="text-xs px-1">Contacts</TabsTrigger>
        </TabsList>

        {/* Vaccinations Tab */}
        <TabsContent value="vaccinations" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-primary" /> Vaccinations
            </h3>
            <Dialog open={showVaxDialog} onOpenChange={setShowVaxDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>Add Vaccination</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div>
                    <Label className="text-xs">Vaccine Name *</Label>
                    {requiredVaccines && requiredVaccines.length > 0 ? (
                      <>
                        {!useCustomVax ? (
                          <Select value={vaxForm.vaccineName} onValueChange={v => {
                            if (v === "__other") {
                              setUseCustomVax(true);
                              setVaxForm(f => ({ ...f, vaccineName: "" }));
                            } else {
                              setVaxForm(f => ({ ...f, vaccineName: v }));
                            }
                          }}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select required vaccine" /></SelectTrigger>
                            <SelectContent>
                              {requiredVaccines.map(rv => (
                                <SelectItem key={rv.id} value={rv.vaccineName}>{rv.vaccineName}</SelectItem>
                              ))}
                              <SelectItem value="__other">Other (custom)</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex gap-2 mt-1">
                            <Input
                              value={customVaxName}
                              onChange={e => {
                                setCustomVaxName(e.target.value);
                                setVaxForm(f => ({ ...f, vaccineName: e.target.value }));
                              }}
                              placeholder="Enter custom vaccine name"
                              className="flex-1"
                            />
                            <Button variant="outline" size="sm" onClick={() => {
                              setUseCustomVax(false);
                              setCustomVaxName("");
                              setVaxForm(f => ({ ...f, vaccineName: "" }));
                            }}>
                              Back
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <Input value={vaxForm.vaccineName} onChange={e => setVaxForm(f => ({ ...f, vaccineName: e.target.value }))} placeholder="e.g. Rabies" className="mt-1" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Date Given</Label>
                      <Input type="date" value={vaxForm.dateAdministered} onChange={e => setVaxForm(f => ({ ...f, dateAdministered: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Expires</Label>
                      <Input type="date" value={vaxForm.expirationDate} onChange={e => setVaxForm(f => ({ ...f, expirationDate: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={vaxForm.status} onValueChange={v => setVaxForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">Current</SelectItem>
                        <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="missing">Missing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Vaccination Certificate (optional)</Label>
                    <div className="mt-1">
                      <FileUpload
                        onUpload={url => setVaxForm(f => ({ ...f, documentUrl: url }))}
                        currentUrl={vaxForm.documentUrl || null}
                        onRemove={() => setVaxForm(f => ({ ...f, documentUrl: "" }))}
                        accept="image/*,.pdf,.jpg,.jpeg,.png"
                        folder="vaccination-certs"
                        variant="document"
                        label="Upload Certificate"
                        maxSizeMB={10}
                      />
                    </div>
                  </div>
                  <Button onClick={() => {
                    if (!vaxForm.vaccineName.trim()) { toast.error("Vaccine name required"); return; }
                    createVax.mutate({ dogId, vaccineName: vaxForm.vaccineName, expirationDate: vaxForm.expirationDate, dateAdministered: vaxForm.dateAdministered || undefined, documentUrl: vaxForm.documentUrl || undefined });
                  }} className="w-full" disabled={createVax.isPending}>
                    {createVax.isPending ? "Adding..." : "Add Vaccination"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Missing Required Vaccines Alert */}
          {requiredVaccines && requiredVaccines.length > 0 && (() => {
            const missing = requiredVaccines.filter(rv => 
              !vaccinations?.some(v => 
                v.vaccineName.toLowerCase().trim() === rv.vaccineName.toLowerCase().trim() && v.status !== 'expired' && v.status !== 'missing'
              )
            );
            if (missing.length === 0) return null;
            return (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-destructive">Missing Required Vaccines</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {missing.map(rv => rv.vaccineName).join(", ")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {(!vaccinations || vaccinations.length === 0) && (
            <Card className="border-dashed border-2 bg-muted/30">
              <CardContent className="p-6 text-center">
                <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No vaccinations on file</p>
              </CardContent>
            </Card>
          )}

          {vaccinations?.map(vax => (
            <VaccinationCard
              key={vax.id}
              vax={vax}
              onDelete={() => deleteVax.mutate({ id: vax.id })}
              onUploadCert={url => updateVax.mutate({ id: vax.id, documentUrl: url })}
              onRemoveCert={() => updateVax.mutate({ id: vax.id, documentUrl: "" })}
            />
          ))}
        </TabsContent>

        {/* Care Tab */}
        <TabsContent value="care" className="space-y-3 mt-3">
          <EditableField icon={<Utensils className="h-4 w-4 text-primary" />} label="Feeding Instructions" value={dog.feedingInstructions || ""} onSave={v => handleSave("feedingInstructions", v)} multiline />
          <EditableField icon={<Heart className="h-4 w-4 text-primary" />} label="Behavior & Care Notes" value={dog.behaviorNotes || ""} onSave={v => handleSave("behaviorNotes", v)} multiline />
          <EditableField icon={<Heart className="h-4 w-4 text-primary" />} label="Special Needs" value={dog.specialNeeds || ""} onSave={v => handleSave("specialNeeds", v)} multiline />
        </TabsContent>

        {/* Medical Tab */}
        <TabsContent value="medical" className="space-y-3 mt-3">
          <EditableField icon={<Pill className="h-4 w-4 text-primary" />} label="Medications" value={dog.medications || ""} onSave={v => handleSave("medications", v)} multiline />
          <EditableField icon={<Stethoscope className="h-4 w-4 text-primary" />} label="Vet Name" value={dog.vetName || ""} onSave={v => handleSave("vetName", v)} />
          <EditableField icon={<Phone className="h-4 w-4 text-primary" />} label="Vet Phone" value={dog.vetPhone || ""} onSave={v => handleSave("vetPhone", v)} />
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-3 mt-3">
          <EditableField icon={<Phone className="h-4 w-4 text-primary" />} label="Emergency Contact Name" value={dog.emergencyContactName || ""} onSave={v => handleSave("emergencyContactName", v)} />
          <EditableField icon={<Phone className="h-4 w-4 text-primary" />} label="Emergency Contact Phone" value={dog.emergencyContactPhone || ""} onSave={v => handleSave("emergencyContactPhone", v)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Edit Info Dialog for the dog overview card */
function EditInfoDialog({ dog, dogId, onSave, isPending }: {
  dog: any; dogId: number;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", breed: "", age: "", weight: "", sex: "" as string, isSpayedNeutered: false,
  });

  useEffect(() => {
    if (dog && open) {
      setForm({
        name: dog.name || "",
        breed: dog.breed || "",
        age: dog.age ? String(dog.age) : "",
        weight: dog.weight || "",
        sex: dog.sex || "",
        isSpayedNeutered: dog.isSpayedNeutered || false,
      });
    }
  }, [dog, open]);

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    onSave({
      name: form.name,
      breed: form.breed || undefined,
      age: form.age ? parseInt(form.age) : undefined,
      weight: form.weight || undefined,
      sex: form.sex || undefined,
      isSpayedNeutered: form.isSpayedNeutered,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1 h-7 text-xs mt-2.5">
          <Edit2 className="h-3 w-3" /> Edit Info
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Edit Dog Info</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Breed</Label>
            <Input value={form.breed} onChange={e => setForm(f => ({ ...f, breed: e.target.value }))} placeholder="e.g. Golden Retriever" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Age (years)</Label>
              <Input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Weight (lbs)</Label>
              <Input value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Sex</Label>
            <Select value={form.sex} onValueChange={v => setForm(f => ({ ...f, sex: v }))}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select sex" /></SelectTrigger>
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
        </div>
        <DialogFooter className="mt-2">
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VaccinationCard({ vax, onDelete, onUploadCert, onRemoveCert }: {
  vax: any; onDelete: () => void; onUploadCert: (url: string) => void; onRemoveCert: () => void;
}) {
  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {vax.status === "current" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            {vax.status === "expiring_soon" && <Clock className="h-4 w-4 text-amber-500" />}
            {vax.status === "expired" && <AlertCircle className="h-4 w-4 text-destructive" />}
            {vax.status === "missing" && <AlertCircle className="h-4 w-4 text-muted-foreground" />}
            <div>
              <p className="text-sm font-medium">{vax.vaccineName}</p>
              <p className="text-[10px] text-muted-foreground">
                {vax.dateAdministered ? `Given: ${formatDate(vax.dateAdministered)}` : ""}
                {vax.dateAdministered && vax.expirationDate ? " · " : ""}
                {vax.expirationDate ? `Expires: ${formatDate(vax.expirationDate)}` : "No expiration set"}
              </p>
            </div>
          </div>
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-muted">
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
        <div className="pl-6">
          {vax.documentUrl ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <a href={vax.documentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-medium truncate hover:underline flex-1">
                View Certificate
              </a>
              <FileUpload onUpload={onUploadCert} currentUrl={vax.documentUrl} onRemove={onRemoveCert} accept="image/*,.pdf" folder="vaccination-certs" variant="document" label="Replace" maxSizeMB={10} />
            </div>
          ) : (
            <FileUpload onUpload={onUploadCert} accept="image/*,.pdf" folder="vaccination-certs" variant="document" label="Upload Certificate" maxSizeMB={10} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EditableField({ icon, label, value, onSave, multiline }: {
  icon: React.ReactNode; label: string; value: string; onSave: (value: string) => void; multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  const handleSave = () => {
    onSave(localValue);
    setEditing(false);
  };

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
          {!editing && (
            <button onClick={() => { setLocalValue(value); setEditing(true); }} className="ml-auto text-[10px] text-primary font-medium">
              Edit
            </button>
          )}
        </div>
        {editing ? (
          <div className="space-y-2">
            {multiline ? (
              <Textarea value={localValue} onChange={e => setLocalValue(e.target.value)} rows={3} className="text-sm" />
            ) : (
              <Input value={localValue} onChange={e => setLocalValue(e.target.value)} className="text-sm" />
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="h-7 text-xs">Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 text-xs">Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground">
            {value || <span className="text-muted-foreground italic">Not set</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
