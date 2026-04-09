import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, Clock, Phone, Mail, Plus, Edit2, Trash2, DollarSign, Save, X, Check, DoorOpen, Syringe, Bath, Scissors } from "lucide-react";
import RoomManagement from "./RoomManagement";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function KennelProfile() {
  const { activeKennelId } = useKennel();
  const { data: kennels, isLoading } = trpc.kennel.myKennels.useQuery();
  const kennel = kennels?.find(k => k.id === activeKennelId) || kennels?.[0];
  const utils = trpc.useUtils();

  const createKennel = trpc.kennel.create.useMutation({
    onSuccess: () => {
      utils.kennel.myKennels.invalidate();
      utils.auth.me.invalidate();
      toast.success("Kennel created!");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to create kennel"),
  });

  const updateKennel = trpc.kennel.update.useMutation({
    onSuccess: () => {
      utils.kennel.myKennels.invalidate();
      toast.success("Kennel updated!");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update kennel"),
  });

  const [form, setForm] = useState({
    name: "", description: "", address: "", city: "", state: "", zip: "",
    phone: "", email: "", hoursOpen: "07:00", hoursClose: "19:00", policies: "",
  });

  useEffect(() => {
    if (kennel) {
      setForm({
        name: kennel.name || "",
        description: kennel.description || "",
        address: kennel.address || "",
        city: kennel.city || "",
        state: kennel.state || "",
        zip: kennel.zip || "",
        phone: kennel.phone || "",
        email: kennel.email || "",
        hoursOpen: kennel.hoursOpen || "07:00",
        hoursClose: kennel.hoursClose || "19:00",
        policies: kennel.policies || "",
      });
    }
  }, [kennel]);

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Kennel name required"); return; }
    if (kennel) {
      updateKennel.mutate({ id: kennel.id, ...form });
    } else {
      createKennel.mutate({ ...form });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-8 bg-muted rounded animate-pulse w-32" />
        <div className="h-40 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">{kennel ? "Kennel Profile" : "Create Kennel"}</h1>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full grid grid-cols-4 sm:grid-cols-8 h-auto min-h-9 gap-1 p-1">
          <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
          <TabsTrigger value="services" className="text-xs">Services</TabsTrigger>
          <TabsTrigger value="addons" className="text-xs">Add-Ons</TabsTrigger>
          <TabsTrigger value="discounts" className="text-xs">Discounts</TabsTrigger>
          <TabsTrigger value="hours" className="text-xs">Hours</TabsTrigger>
          <TabsTrigger value="rooms" className="text-xs">Rooms</TabsTrigger>
          <TabsTrigger value="vaccines" className="text-xs">Vaccines</TabsTrigger>
          <TabsTrigger value="policies" className="text-xs">Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-3 mt-3">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className="text-xs">Kennel Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Address</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="mt-1" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">City</Label>
                  <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">State</Label>
                  <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">ZIP</Label>
                  <Input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={createKennel.isPending || updateKennel.isPending}>
                {kennel ? "Save Changes" : "Create Kennel"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-3 mt-3">
          {kennel ? <ServiceManager kennelId={kennel.id} /> : (
            <Card className="border-dashed border-2 bg-muted/30">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Create your kennel first to manage services</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="addons" className="space-y-3 mt-3">
          {kennel ? <AddOnManager kennelId={kennel.id} /> : (
            <Card className="border-dashed border-2 bg-muted/30">
              <CardContent className="p-6 text-center">
                <Bath className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Create your kennel first to manage checkout add-ons</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="discounts" className="space-y-3 mt-3">
          {kennel ? <DiscountManager kennelId={kennel.id} /> : (
            <Card className="border-dashed border-2 bg-muted/30">
              <CardContent className="p-6 text-center">
                <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Create your kennel first to manage discounts</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="hours" className="space-y-3 mt-3">
          {kennel ? <BusinessHoursEditor kennelId={kennel.id} /> : (
            <Card className="border-dashed border-2 bg-muted/30">
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Create your kennel first to manage business hours</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rooms" className="mt-3">
          {kennel ? <RoomManagement /> : (
            <Card className="border-dashed border-2 bg-muted/30">
              <CardContent className="p-6 text-center">
                <DoorOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Create your kennel first to manage rooms</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="vaccines" className="space-y-3 mt-3">
          {kennel ? <RequiredVaccinesManager kennelId={kennel.id} /> : (
            <Card className="border-dashed border-2 bg-muted/30">
              <CardContent className="p-6 text-center">
                <Syringe className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Create your kennel first to manage required vaccines</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="policies" className="space-y-3 mt-3">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <Label className="text-xs">Kennel Policies</Label>
              <Textarea
                value={form.policies}
                onChange={e => setForm(f => ({ ...f, policies: e.target.value }))}
                rows={6}
                className="mt-1"
                placeholder="Enter your kennel policies, rules, and important information..."
              />
              <Button onClick={handleSave} className="w-full mt-3" disabled={updateKennel.isPending}>
                Save Policies
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DiscountManager({ kennelId }: { kennelId: number }) {
  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const utils = trpc.useUtils();
  const { data: discounts, isLoading } = trpc.discount.listByKennel.useQuery({ kennelId });
  const createDiscount = trpc.discount.create.useMutation({
    onSuccess: () => {
      utils.discount.listByKennel.invalidate();
      setName("");
      setDiscountType("fixed");
      setAmount("");
      setNotes("");
      setIsActive(true);
      toast.success("Discount created");
    },
    onError: (e) => toast.error(e.message || "Could not create discount"),
  });
  const updateDiscount = trpc.discount.update.useMutation({
    onSuccess: () => utils.discount.listByKennel.invalidate(),
    onError: (e) => toast.error(e.message || "Could not update discount"),
  });

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Discounts</h3>
      <p className="text-xs text-muted-foreground">Used at checkout when staff complete a stay.</p>
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Discount name" />
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={discountType === "fixed" ? "Amount ($)" : "Percent (%)"} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select className="h-9 rounded border px-2 text-sm" value={discountType} onChange={(e) => setDiscountType(e.target.value as "fixed" | "percent")}>
              <option value="fixed">Fixed</option>
              <option value="percent">Percent</option>
            </select>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes / reason" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label className="text-sm">Active</Label>
          </div>
          <Button
            className="w-full"
            disabled={!name.trim() || !amount || createDiscount.isPending}
            onClick={() =>
              createDiscount.mutate({
                kennelId,
                name: name.trim(),
                discountType,
                amount: Number(amount),
                notes: notes.trim() || undefined,
                isActive,
              })
            }
          >
            {createDiscount.isPending ? "Saving..." : "Save Discount"}
          </Button>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Available discounts</p>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            (discounts || []).map((d: { id: number; name: string; discountType: string; amount: number; notes?: string; isActive: boolean }) => (
              <div key={d.id} className="rounded border p-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.discountType === "percent" ? `${d.amount}%` : `$${Number(d.amount).toFixed(2)}`}
                    {d.notes ? ` · ${d.notes}` : ""}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => updateDiscount.mutate({ id: d.id, isActive: !d.isActive })}>
                  {d.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const emptyServiceForm = {
  name: "", type: "boarding" as string, description: "", pricePerUnit: "", unitType: "per_day" as string,
};

function ServiceManager({ kennelId }: { kennelId: number }) {
  const { data: services } = trpc.service.byKennel.useQuery({ kennelId });
  const utils = trpc.useUtils();
  const [showAdd, setShowAdd] = useState(false);
  const [sForm, setSForm] = useState({ ...emptyServiceForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyServiceForm });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const createService = trpc.service.create.useMutation({
    onSuccess: () => {
      utils.service.byKennel.invalidate({ kennelId });
      setShowAdd(false);
      setSForm({ ...emptyServiceForm });
      toast.success("Service added!");
    },
    onError: () => toast.error("Failed to add service"),
  });

  const updateService = trpc.service.update.useMutation({
    onSuccess: () => {
      utils.service.byKennel.invalidate({ kennelId });
      setEditingId(null);
      toast.success("Service updated!");
    },
    onError: () => toast.error("Failed to update service"),
  });

  const startEditing = (service: any) => {
    setEditingId(service.id);
    setEditForm({
      name: service.name || "",
      type: service.type || "boarding",
      description: service.description || "",
      pricePerUnit: String(service.pricePerUnit || ""),
      unitType: service.unitType || "per_day",
    });
  };

  const saveEdit = () => {
    if (!editForm.name.trim() || !editForm.pricePerUnit) {
      toast.error("Name and price are required");
      return;
    }
    updateService.mutate({
      id: editingId!,
      name: editForm.name,
      type: editForm.type as any,
      description: editForm.description,
      pricePerUnit: editForm.pricePerUnit,
      unitType: editForm.unitType as any,
    });
  };

  const handleDelete = (id: number) => {
    updateService.mutate({ id, isActive: false });
    setDeleteConfirmId(null);
    toast.success("Service removed");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Services & Pricing</h3>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs">
              <Plus className="h-3 w-3" /> Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Add Service</DialogTitle></DialogHeader>
            <ServiceForm form={sForm} setForm={setSForm} />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" size="sm">Cancel</Button>
              </DialogClose>
              <Button onClick={() => {
                if (!sForm.name.trim() || !sForm.pricePerUnit) { toast.error("Name and price required"); return; }
                createService.mutate({ kennelId, ...sForm } as any);
              }} size="sm" disabled={createService.isPending}>
                {createService.isPending ? "Adding..." : "Add Service"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(!services || services.length === 0) && (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="p-6 text-center">
            <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No services yet. Add your first service to get started.</p>
          </CardContent>
        </Card>
      )}

      {services?.map(service => (
        <Card key={service.id} className="border-0 shadow-sm bg-white">
          <CardContent className="p-3">
            {editingId === service.id ? (
              /* ===== EDIT MODE ===== */
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-primary">Editing Service</span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <ServiceForm form={editForm} setForm={setEditForm} />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={saveEdit}
                    disabled={updateService.isPending}
                  >
                    <Check className="h-3 w-3" />
                    {updateService.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            ) : (
              /* ===== VIEW MODE ===== */
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{service.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{service.type} · {service.unitType?.replace("_", " ")}</p>
                  {service.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{service.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-sm font-bold text-primary whitespace-nowrap">${String(service.pricePerUnit)}</span>
                  <button
                    onClick={() => startEditing(service)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                    title="Edit service"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  {deleteConfirmId === service.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(service.id)}
                        className="p-1.5 rounded bg-destructive/10 hover:bg-destructive/20 transition-colors"
                        title="Confirm delete"
                      >
                        <Check className="h-3.5 w-3.5 text-destructive" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(service.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                      title="Delete service"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ===== REQUIRED VACCINES MANAGER =====
const COMMON_VACCINES = [
  "Rabies",
  "DHPP (Distemper, Hepatitis, Parainfluenza, Parvovirus)",
  "Bordetella (Kennel Cough)",
  "Canine Influenza (H3N2/H3N8)",
  "Leptospirosis",
  "Lyme Disease",
  "Canine Parainfluenza",
];

function RequiredVaccinesManager({ kennelId }: { kennelId: number }) {
  const { data: requiredVaccines } = trpc.requiredVaccine.byKennel.useQuery({ kennelId });
  const utils = trpc.useUtils();
  const [showAdd, setShowAdd] = useState(false);
  const [customName, setCustomName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const addVaccine = trpc.requiredVaccine.add.useMutation({
    onSuccess: async () => {
      await utils.requiredVaccine.byKennel.invalidate({ kennelId });
      setShowAdd(false);
      setCustomName("");
      toast.success("Required vaccine added!");
    },
    onError: () => toast.error("Failed to add vaccine"),
  });

  const removeVaccine = trpc.requiredVaccine.remove.useMutation({
    onSuccess: () => {
      utils.requiredVaccine.byKennel.invalidate({ kennelId });
      setDeleteConfirmId(null);
      toast.success("Vaccine requirement removed");
    },
  });

  const existingNames = requiredVaccines?.map(v => v.vaccineName) || [];
  const availableCommon = COMMON_VACCINES.filter(v => !existingNames.includes(v));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Required Vaccines</h3>
          <p className="text-[10px] text-muted-foreground">Dogs must have these vaccines to board at your kennel</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs">
              <Plus className="h-3 w-3" /> Add Vaccine
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Add Required Vaccine</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {availableCommon.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs">Common Vaccines</Label>
                  <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto">
                    {availableCommon.map(name => (
                      <Button
                        key={name}
                        variant="outline"
                        size="sm"
                        className="justify-start text-xs h-8"
                        onClick={() => {
                          addVaccine.mutate({ kennelId, vaccineName: name });
                        }}
                        disabled={addVaccine.isPending}
                      >
                        <Plus className="h-3 w-3 mr-1.5" />
                        {name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-t pt-3">
                <Label className="text-xs">Custom Vaccine Name</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="e.g. Canine Coronavirus"
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!customName.trim()) { toast.error("Enter a vaccine name"); return; }
                      addVaccine.mutate({ kennelId, vaccineName: customName.trim() });
                    }}
                    disabled={addVaccine.isPending || !customName.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(!requiredVaccines || requiredVaccines.length === 0) && (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="p-6 text-center">
            <Syringe className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No required vaccines set. Add vaccines that dogs must have before boarding.</p>
          </CardContent>
        </Card>
      )}

      {requiredVaccines?.map(vaccine => (
        <Card key={vaccine.id} className="border-0 shadow-sm bg-white">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Syringe className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{vaccine.vaccineName}</span>
            </div>
            {deleteConfirmId === vaccine.id ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => removeVaccine.mutate({ id: vaccine.id })}
                  className="p-1.5 rounded bg-destructive/10 hover:bg-destructive/20 transition-colors"
                  title="Confirm remove"
                >
                  <Check className="h-3.5 w-3.5 text-destructive" />
                </button>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                  title="Cancel"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirmId(vaccine.id)}
                className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                title="Remove requirement"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ===== CHECKOUT ADD-ONS MANAGER =====
function AddOnManager({ kennelId }: { kennelId: number }) {
  const { data: addOns } = trpc.addOn.listByKennel.useQuery({ kennelId });
  const utils = trpc.useUtils();
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", price: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", price: "" });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const createAddOn = trpc.addOn.create.useMutation({
    onSuccess: () => {
      utils.addOn.listByKennel.invalidate({ kennelId });
      setShowAdd(false);
      setAddForm({ name: "", price: "" });
      toast.success("Add-on created!");
    },
    onError: () => toast.error("Failed to create add-on"),
  });

  const updateAddOn = trpc.addOn.update.useMutation({
    onSuccess: () => {
      utils.addOn.listByKennel.invalidate({ kennelId });
      setEditingId(null);
      toast.success("Add-on updated!");
    },
    onError: () => toast.error("Failed to update add-on"),
  });

  const deleteAddOn = trpc.addOn.delete.useMutation({
    onSuccess: () => {
      utils.addOn.listByKennel.invalidate({ kennelId });
      setDeleteConfirmId(null);
      toast.success("Add-on removed");
    },
  });

  const startEditing = (addOn: any) => {
    setEditingId(addOn.id);
    setEditForm({ name: addOn.name, price: String(addOn.price) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Checkout Add-Ons</h3>
          <p className="text-[10px] text-muted-foreground">Optional services offered during checkout (baths, nail trims, etc.)</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs">
              <Plus className="h-3 w-3" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Add Checkout Add-On</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Add-On Name *</Label>
                <Input
                  value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Bath, Nail Trim"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Price ($) *</Label>
                <Input
                  value={addForm.price}
                  onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" size="sm">Cancel</Button>
              </DialogClose>
              <Button onClick={() => {
                if (!addForm.name.trim() || !addForm.price) { toast.error("Name and price required"); return; }
                createAddOn.mutate({ kennelId, name: addForm.name.trim(), price: parseFloat(addForm.price) });
              }} size="sm" disabled={createAddOn.isPending}>
                {createAddOn.isPending ? "Adding..." : "Add Add-On"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(!addOns || addOns.length === 0) && (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="p-6 text-center">
            <Bath className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No checkout add-ons yet. Add services like baths or nail trims that employees can offer during checkout.</p>
          </CardContent>
        </Card>
      )}

      {addOns?.map(addOn => (
        <Card key={addOn.id} className={`border-0 shadow-sm ${addOn.isActive ? 'bg-white' : 'bg-muted/50'}`}>
          <CardContent className="p-3">
            {editingId === addOn.id ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-primary">Editing Add-On</span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Price ($)</Label>
                  <Input value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} className="mt-1" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingId(null)}>Cancel</Button>
                  <Button size="sm" className="flex-1 gap-1" onClick={() => {
                    if (!editForm.name.trim() || !editForm.price) { toast.error("Name and price required"); return; }
                    updateAddOn.mutate({ id: addOn.id, name: editForm.name.trim(), price: parseFloat(editForm.price) });
                  }} disabled={updateAddOn.isPending}>
                    <Check className="h-3 w-3" /> Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Bath className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{addOn.name}</p>
                    {!addOn.isActive && <span className="text-[10px] text-muted-foreground">(Disabled)</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-sm font-bold text-primary whitespace-nowrap">${String(addOn.price)}</span>
                  <button
                    onClick={() => updateAddOn.mutate({ id: addOn.id, isActive: !addOn.isActive })}
                    className={`p-1.5 rounded transition-colors ${addOn.isActive ? 'hover:bg-muted text-green-600' : 'hover:bg-muted text-muted-foreground'}`}
                    title={addOn.isActive ? 'Disable add-on' : 'Enable add-on'}
                  >
                    {addOn.isActive ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => startEditing(addOn)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Edit">
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  {deleteConfirmId === addOn.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => deleteAddOn.mutate({ id: addOn.id })} className="p-1.5 rounded bg-destructive/10 hover:bg-destructive/20" title="Confirm">
                        <Check className="h-3.5 w-3.5 text-destructive" />
                      </button>
                      <button onClick={() => setDeleteConfirmId(null)} className="p-1.5 rounded hover:bg-muted" title="Cancel">
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirmId(addOn.id)} className="p-1.5 rounded hover:bg-destructive/10" title="Delete">
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Shared form fields for creating and editing services */
function ServiceForm({ form, setForm }: {
  form: typeof emptyServiceForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyServiceForm>>;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Service Name *</Label>
        <Input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Standard Boarding"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Type</Label>
        <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="boarding">Boarding</SelectItem>
            <SelectItem value="daycare">Daycare</SelectItem>
            <SelectItem value="grooming">Grooming</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Description</Label>
        <Input
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Brief description of this service"
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Price ($) *</Label>
          <Input
            value={form.pricePerUnit}
            onChange={e => setForm(f => ({ ...f, pricePerUnit: e.target.value }))}
            placeholder="0.00"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Per</Label>
          <Select value={form.unitType} onValueChange={v => setForm(f => ({ ...f, unitType: v }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="per_night">Per Night</SelectItem>
              <SelectItem value="per_day">Per Day</SelectItem>
              <SelectItem value="per_session">Per Session</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type HourEntry = {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
};

function BusinessHoursEditor({ kennelId }: { kennelId: number }) {
  const { data: hours, isLoading } = trpc.businessHours.getByKennel.useQuery({ kennelId });
  const utils = trpc.useUtils();
  const [localHours, setLocalHours] = useState<HourEntry[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const updateHours = trpc.businessHours.update.useMutation({
    onSuccess: () => {
      utils.businessHours.getByKennel.invalidate({ kennelId });
      toast.success("Business hours saved!");
      setHasChanges(false);
    },
    onError: () => toast.error("Failed to save hours"),
  });

  useEffect(() => {
    if (hours && hours.length > 0) {
      setLocalHours(
        hours.map(h => ({
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime || "07:00",
          closeTime: h.closeTime || "19:00",
          isClosed: h.isClosed,
        }))
      );
    } else if (!isLoading) {
      // Default hours
      setLocalHours(
        Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i,
          openTime: i === 0 || i === 6 ? "07:00" : "07:00",
          closeTime: i === 0 || i === 6 ? "19:00" : "19:00",
          isClosed: i === 0 || i === 6,
        }))
      );
    }
  }, [hours, isLoading]);

  const updateDay = (dayOfWeek: number, field: string, value: any) => {
    setLocalHours(prev =>
      prev.map(h =>
        h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h
      )
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    updateHours.mutate({
      kennelId,
      hours: localHours.map(h => ({
        dayOfWeek: h.dayOfWeek,
        openTime: h.isClosed ? null : h.openTime,
        closeTime: h.isClosed ? null : h.closeTime,
        isClosed: h.isClosed,
      })),
    });
  };

  const formatTime12 = (time: string | null) => {
    if (!time) return "";
    try {
      const [h, m] = time.split(":");
      const hour = parseInt(h);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${m} ${ampm}`;
    } catch {
      return time;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Business Hours</h3>
          </div>
          <div className="space-y-2">
            {localHours.map(entry => (
              <div
                key={entry.dayOfWeek}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  entry.isClosed ? "bg-muted/30 border-muted" : "bg-white border-border"
                }`}
              >
                <div className="w-12 shrink-0">
                  <p className={`text-xs font-semibold ${entry.isClosed ? "text-muted-foreground" : "text-foreground"}`}>
                    {DAY_SHORT[entry.dayOfWeek]}
                  </p>
                </div>

                <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!entry.isClosed}
                    onChange={e => updateDay(entry.dayOfWeek, "isClosed", !e.target.checked)}
                    className="rounded border-muted-foreground h-4 w-4 accent-primary"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {entry.isClosed ? "Closed" : "Open"}
                  </span>
                </label>

                {!entry.isClosed && (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Input
                      type="time"
                      value={entry.openTime || ""}
                      onChange={e => updateDay(entry.dayOfWeek, "openTime", e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={entry.closeTime || ""}
                      onChange={e => updateDay(entry.dayOfWeek, "closeTime", e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                  </div>
                )}

                {entry.isClosed && (
                  <p className="text-xs text-muted-foreground italic flex-1">Closed</p>
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={handleSave}
            className="w-full mt-4"
            disabled={updateHours.isPending || !hasChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateHours.isPending ? "Saving..." : "Save Hours"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
