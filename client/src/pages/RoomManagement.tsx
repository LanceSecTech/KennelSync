import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Building2, DoorOpen, Plus, Edit2, Trash2, Check, X, Dog,
  ArrowRightLeft, AlertTriangle,
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { todayString, parseLocalDate, toDateString, formatDate } from "@/lib/dateUtils";
import { naturalSort } from "@/lib/naturalSort";
import { DogBadgesInline } from "@/components/DogBadgesInline";

export default function RoomManagement() {
  const { activeKennelId } = useKennel();
  const { data: kennels } = trpc.kennel.myKennels.useQuery();
  const kennel = kennels?.find(k => k.id === activeKennelId) || kennels?.[0];

  if (!kennel) {
    return (
      <Card className="border-dashed border-2 bg-muted/30 m-4">
        <CardContent className="p-6 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Create your kennel first to manage rooms</p>
        </CardContent>
      </Card>
    );
  }

  return <RoomManagerInner kennelId={kennel.id} />;
}

function RoomManagerInner({ kennelId }: { kennelId: number }) {
  /** Aligns room-card occupancy with availability calendar context (day / week / month). */
  const [occupancyAsOfDate, setOccupancyAsOfDate] = useState(() => todayString());
  const handleOccupancyContextDate = useCallback((d: string) => {
    setOccupancyAsOfDate((prev) => (prev === d ? prev : d));
  }, []);

  const {
    data: roomList,
    isLoading,
    error: roomListError,
    refetch: refetchRooms,
  } = trpc.room.byKennel.useQuery({ kennelId, asOfDate: occupancyAsOfDate });
  const utils = trpc.useUtils();

  // ===== Add Building Dialog =====
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [buildingName, setBuildingName] = useState("");
  const [roomCount, setRoomCount] = useState("");
  const [buildingSizeType, setBuildingSizeType] = useState("mixed");

  // ===== Add Single Room Dialog =====
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [roomForm, setRoomForm] = useState({ name: "", building: "", sizeType: "mixed", capacity: "1", notes: "" });

  // ===== Edit Room Dialog =====
  const [editRoom, setEditRoom] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: "", building: "", sizeType: "mixed", capacity: "1", notes: "" });

  // ===== Delete Confirm =====
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const createRoom = trpc.room.create.useMutation({
    onSuccess: () => {
      utils.room.byKennel.invalidate();
    },
    onError: (e) => toast.error(e.message || "Failed to add room"),
  });

  const updateRoom = trpc.room.update.useMutation({
    onSuccess: () => { utils.room.byKennel.invalidate(); setEditRoom(null); toast.success("Room updated!"); },
    onError: () => toast.error("Failed to update room"),
  });

  const deleteRoom = trpc.room.delete.useMutation({
    onSuccess: () => { utils.room.byKennel.invalidate(); setDeleteId(null); toast.success("Room deleted!"); },
    onError: () => toast.error("Failed to delete room"),
  });

  // Group rooms by building, sorted naturally
  const buildings = useMemo(() => {
    if (!roomList) return [];
    const map = new Map<string, typeof roomList>();
    for (const r of roomList) {
      const bldg = r.building || "Unassigned";
      if (!map.has(bldg)) map.set(bldg, []);
      map.get(bldg)!.push(r);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => naturalSort(a, b))
      .map(([building, rms]) => ({
        building,
        rooms: [...rms].sort((a, b) => naturalSort(a.name, b.name)),
      }));
  }, [roomList]);

  const handleAddBuilding = async () => {
    if (!buildingName.trim()) { toast.error("Building name required"); return; }
    const count = parseInt(roomCount) || 1;
    if (count < 1 || count > 100) { toast.error("Room count must be 1-100"); return; }
    try {
      // Create rooms sequentially so failures are explicit and deterministic.
      for (let i = 1; i <= count; i++) {
        await createRoom.mutateAsync({
          kennelId,
          name: `Room ${i}`,
          building: buildingName.trim(),
          sizeType: buildingSizeType as any,
          capacity: 1,
        });
      }
      await refetchRooms();
      toast.success(`Created ${count} rooms in ${buildingName}`);
    } catch {
      // toast handled by mutation onError
      return;
    }
    setShowAddBuilding(false);
    setBuildingName("");
    setRoomCount("");
    setBuildingSizeType("mixed");
  };

  const handleAddRoom = async () => {
    if (!roomForm.name.trim()) { toast.error("Room name required"); return; }
    try {
      await createRoom.mutateAsync({
        kennelId,
        name: roomForm.name.trim(),
        building: roomForm.building.trim() || undefined,
        sizeType: roomForm.sizeType as any,
        capacity: parseInt(roomForm.capacity) || 1,
        notes: roomForm.notes || undefined,
      });
      await refetchRooms();
      toast.success("Room added!");
    } catch {
      return;
    }
    setShowAddRoom(false);
    setRoomForm({ name: "", building: "", sizeType: "mixed", capacity: "1", notes: "" });
  };

  const handleEditSave = () => {
    if (!editRoom || !editForm.name.trim()) { toast.error("Room name required"); return; }
    updateRoom.mutate({
      id: editRoom.id,
      name: editForm.name.trim(),
      building: editForm.building.trim() || undefined,
      sizeType: editForm.sizeType as any,
      capacity: parseInt(editForm.capacity) || 1,
      notes: editForm.notes || undefined,
    });
  };

  const startEdit = (room: any) => {
    setEditRoom(room);
    setEditForm({
      name: room.name,
      building: room.building || "",
      sizeType: room.sizeType || "mixed",
      capacity: String(room.capacity || 1),
      notes: room.notes || "",
    });
  };

  if (isLoading) {
    return <div className="p-4"><div className="h-40 bg-muted rounded-xl animate-pulse" /></div>;
  }

  if (roomListError) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-destructive">Could not load rooms</p>
          <p className="text-xs text-muted-foreground mt-1">{roomListError.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="rooms" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-9">
          <TabsTrigger value="rooms" className="text-xs">Rooms & Buildings</TabsTrigger>
          <TabsTrigger value="availability" className="text-xs">Availability Calendar</TabsTrigger>
        </TabsList>

        {/* ===== ROOMS TAB ===== */}
        <TabsContent value="rooms" className="space-y-3 mt-3">
          <p className="text-[11px] text-muted-foreground">
            Occupancy counts reflect{" "}
            <span className="font-medium text-foreground">{formatDate(occupancyAsOfDate)}</span>
            {occupancyAsOfDate === todayString() ? " (today)" : ""} — same logic as the availability calendar. Open the
            calendar tab to change the context date (week/month use today when it falls in range, otherwise the first
            visible day).
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setShowAddBuilding(true)}>
              <Building2 className="h-3 w-3" /> Add Building
            </Button>
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setShowAddRoom(true)}>
              <Plus className="h-3 w-3" /> Add Room
            </Button>
          </div>

          {buildings.length === 0 && (
            <Card className="border-dashed border-2 bg-muted/30">
              <CardContent className="p-6 text-center">
                <DoorOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No rooms yet. Add a building or individual rooms to get started.</p>
              </CardContent>
            </Card>
          )}

          {buildings.map(({ building, rooms: bldgRooms }) => (
            <div key={building}>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{building}</h3>
                <span className="text-xs text-muted-foreground">({bldgRooms.length} rooms)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {bldgRooms.map(room => (
                  <Card key={room.id} className={`border-0 shadow-sm ${room.isAvailable ? "bg-white" : "bg-muted/50 opacity-60"}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <DoorOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium truncate">{room.name}</span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={() => startEdit(room)} className="p-1 rounded hover:bg-muted transition-colors">
                            <Edit2 className="h-3 w-3 text-muted-foreground" />
                          </button>
                          {deleteId === room.id ? (
                            <div className="flex gap-0.5">
                              <button onClick={() => deleteRoom.mutate({ id: room.id })} className="p-1 rounded bg-destructive/10 hover:bg-destructive/20">
                                <Check className="h-3 w-3 text-destructive" />
                              </button>
                              <button onClick={() => setDeleteId(null)} className="p-1 rounded hover:bg-muted">
                                <X className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteId(room.id)} className="p-1 rounded hover:bg-destructive/10">
                              <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="capitalize">{room.sizeType}</span>
                        <span>Cap: {room.capacity}</span>
                        {room.currentOccupancy > 0 && (
                          <span className="text-amber-600 font-medium">{room.currentOccupancy} in</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ===== AVAILABILITY CALENDAR TAB ===== */}
        <TabsContent value="availability" className="mt-3">
          <AvailabilityCalendar
            kennelId={kennelId}
            rooms={roomList || []}
            onOccupancyContextDateChange={handleOccupancyContextDate}
          />
        </TabsContent>
      </Tabs>

      {/* ===== ADD BUILDING DIALOG ===== */}
      <Dialog open={showAddBuilding} onOpenChange={setShowAddBuilding}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Building with Rooms</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Building Name *</Label>
              <Input value={buildingName} onChange={e => setBuildingName(e.target.value)} placeholder="e.g. Big Kennel" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Number of Rooms *</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={roomCount}
                onChange={e => {
                  const v = e.target.value.replace(/[^0-9]/g, "");
                  setRoomCount(v);
                }}
                placeholder="e.g. 20"
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Rooms will be named "Room 1", "Room 2", etc.</p>
            </div>
            <div>
              <Label className="text-xs">Room Size Type</Label>
              <Select value={buildingSizeType} onValueChange={setBuildingSizeType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                  <SelectItem value="special_care">Special Care</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button onClick={handleAddBuilding} size="sm" disabled={createRoom.isPending}>
              {createRoom.isPending ? "Creating..." : "Create Building"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== ADD SINGLE ROOM DIALOG ===== */}
      <Dialog open={showAddRoom} onOpenChange={setShowAddRoom}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Room</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Room Name *</Label>
              <Input value={roomForm.name} onChange={e => setRoomForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Suite A" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Building</Label>
              <Input value={roomForm.building} onChange={e => setRoomForm(f => ({ ...f, building: e.target.value }))} placeholder="e.g. Main Building" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Size Type</Label>
                <Select value={roomForm.sizeType} onValueChange={v => setRoomForm(f => ({ ...f, sizeType: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                    <SelectItem value="special_care">Special Care</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Capacity</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={roomForm.capacity}
                  onChange={e => setRoomForm(f => ({ ...f, capacity: e.target.value.replace(/[^0-9]/g, "") }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button onClick={handleAddRoom} size="sm" disabled={createRoom.isPending}>Add Room</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== EDIT ROOM DIALOG ===== */}
      <Dialog open={!!editRoom} onOpenChange={open => { if (!open) setEditRoom(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Room</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Room Name *</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Building</Label>
              <Input value={editForm.building} onChange={e => setEditForm(f => ({ ...f, building: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Size Type</Label>
                <Select value={editForm.sizeType} onValueChange={v => setEditForm(f => ({ ...f, sizeType: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                    <SelectItem value="special_care">Special Care</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Capacity</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={editForm.capacity}
                  onChange={e => setEditForm(f => ({ ...f, capacity: e.target.value.replace(/[^0-9]/g, "") }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button onClick={handleEditSave} size="sm" disabled={updateRoom.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type AvailabilityRange = "day" | "week" | "month";

function sundayOfWeekContaining(dateStr: string): string {
  const t = parseLocalDate(dateStr);
  if (!t) return dateStr;
  const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - t.getDay());
  return toDateString(d);
}

/** ===== AVAILABILITY CALENDAR ===== */
function AvailabilityCalendar({
  kennelId,
  rooms,
  onOccupancyContextDateChange,
}: {
  kennelId: number;
  rooms: any[];
  onOccupancyContextDateChange?: (date: string) => void;
}) {
  const [calRange, setCalRange] = useState<AvailabilityRange>("week");
  const [dayPick, setDayPick] = useState(todayString());
  const [weekPick, setWeekPick] = useState(() => sundayOfWeekContaining(todayString()));
  const [monthPick, setMonthPick] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  });

  const weekSelectOptions = useMemo(() => {
    const base = parseLocalDate(todayString()) ?? new Date();
    const seen = new Set<string>();
    const out: { value: string; label: string }[] = [];
    for (let i = -35; i <= 30; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i * 7);
      const sun = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
      const start = toDateString(sun);
      if (seen.has(start)) continue;
      seen.add(start);
      const endD = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 6);
      const end = toDateString(endD);
      out.push({ value: start, label: `Week of ${formatDate(start)} – ${formatDate(end)}` });
    }
    out.sort((a, b) => a.value.localeCompare(b.value));
    return out;
  }, []);

  const { startDate, endDate, dates } = useMemo(() => {
    if (calRange === "day") {
      const d = dayPick;
      return { startDate: d, endDate: d, dates: [d] };
    }
    if (calRange === "week") {
      const s = parseLocalDate(weekPick);
      if (!s) {
        const t = todayString();
        return { startDate: t, endDate: t, dates: [t] };
      }
      const ds: string[] = [];
      for (let i = 0; i < 7; i++) {
        const x = new Date(s.getFullYear(), s.getMonth(), s.getDate() + i);
        ds.push(toDateString(x));
      }
      return { startDate: ds[0], endDate: ds[6], dates: ds };
    }
    const [y, m] = monthPick.split("-").map((x) => parseInt(x, 10));
    if (!y || !m) {
      const t = todayString();
      return { startDate: t, endDate: t, dates: [t] };
    }
    const last = new Date(y, m, 0).getDate();
    const ds: string[] = [];
    for (let d = 1; d <= last; d++) {
      ds.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    return { startDate: ds[0], endDate: ds[ds.length - 1], dates: ds };
  }, [calRange, dayPick, weekPick, monthPick]);

  /** Single date used to sync parent room list occupancy with this calendar view. */
  const occupancyContextDate = useMemo(() => {
    const today = todayString();
    if (calRange === "day") return dayPick;
    if (calRange === "week") {
      if (dates.includes(today)) return today;
      return dates[0] || today;
    }
    if (dates.length && today >= dates[0] && today <= dates[dates.length - 1]) return today;
    return dates[0] || today;
  }, [calRange, dayPick, dates]);

  useEffect(() => {
    onOccupancyContextDateChange?.(occupancyContextDate);
  }, [occupancyContextDate, onOccupancyContextDateChange]);

  const { data: dailyData, isLoading } = trpc.room.dailyAvailability.useQuery(
    { kennelId, startDate, endDate },
    { placeholderData: (prev) => prev }
  );

  const utils = trpc.useUtils();
  const dogIdsFromDaily = useMemo(
    () =>
      Array.from(
        new Set(
          (dailyData || []).flatMap((day: any) =>
            (day.rooms || []).flatMap((room: any) => (room.dogIds || []) as number[]),
          ),
        ),
      ),
    [dailyData],
  );
  const { data: badgeCatalog } = trpc.dogBadge.listByKennel.useQuery(
    { kennelId },
    { enabled: !!kennelId },
  );
  const { data: badgeAssignments } = trpc.dogBadge.assignedForDogs.useQuery(
    { kennelId, dogIds: dogIdsFromDaily },
    { enabled: !!kennelId && dogIdsFromDaily.length > 0 },
  );
  const badgeByKey = useMemo(
    () => new Map(((badgeCatalog || []) as any[]).map((b: any) => [String(b.key || "").toLowerCase(), b])),
    [badgeCatalog],
  );

  // Build calendar grid grouped by building, sorted naturally
  const calendarBuildings = useMemo(() => {
    if (!dailyData || !rooms.length) return [];

    // Build a map: roomId -> { roomName, building, days: { date -> { booked, bookingId } } }
    const roomMap = new Map<number, { roomName: string; building: string; days: Map<string, { booked: boolean; bookingIds?: number[]; dogNames?: string[]; occupancy: number; capacity: number }> }>();

    for (const dayEntry of dailyData) {
      for (const roomEntry of dayEntry.rooms) {
        if (!roomMap.has(roomEntry.roomId)) {
          roomMap.set(roomEntry.roomId, {
            roomName: roomEntry.roomName,
            building: roomEntry.building,
            days: new Map(),
          });
        }
        roomMap.get(roomEntry.roomId)!.days.set(dayEntry.date, {
          booked: roomEntry.booked,
          bookingIds: roomEntry.bookingIds,
          dogNames: roomEntry.dogNames,
          occupancy: roomEntry.occupancy,
          capacity: roomEntry.capacity,
        });
      }
    }

    // Group by building
    const bldgMap = new Map<string, Array<{ roomId: number; roomName: string; days: Array<{ date: string; booked: boolean; bookingIds?: number[]; dogNames?: string[]; occupancy: number; capacity: number }> }>>();
    for (const [roomId, info] of Array.from(roomMap.entries())) {
      const bldg = info.building;
      if (!bldgMap.has(bldg)) bldgMap.set(bldg, []);
      const dayArr = dates.map(date => {
        const dayInfo = info.days.get(date);
        return {
          date,
          booked: dayInfo?.booked ?? false,
          bookingIds: dayInfo?.bookingIds,
          dogNames: dayInfo?.dogNames,
          occupancy: dayInfo?.occupancy ?? 0,
          capacity: dayInfo?.capacity ?? 1,
        };
      });
      bldgMap.get(bldg)!.push({ roomId, roomName: info.roomName, days: dayArr });
    }

    return Array.from(bldgMap.entries())
      .sort(([a], [b]) => naturalSort(a, b))
      .map(([building, rms]) => ({
        building,
        rooms: rms.sort((a, b) => naturalSort(a.roomName, b.roomName)),
      }));
  }, [dailyData, rooms, dates]);

  // ===== Move Dog Dialog =====
  const [moveDialog, setMoveDialog] = useState<{ bookingId: number; roomId: number; dogName: string; date: string } | null>(null);
  const [targetRoomId, setTargetRoomId] = useState<string>("");
  const assignForDay = trpc.room.assignForDay.useMutation({
    onSuccess: () => {
      utils.room.dailyAvailability.invalidate({ kennelId });
      utils.room.byKennel.invalidate();
      utils.room.currentAssignments.invalidate();
      utils.booking.byKennel.invalidate({ kennelId });
      setMoveDialog(null);
      setTargetRoomId("");
      toast.success("Dog placed in that room for this day only.");
    },
    onError: (e) => toast.error(e.message || "Failed to move dog"),
  });

  const handleMove = () => {
    if (!moveDialog || !targetRoomId) return;
    assignForDay.mutate({
      bookingId: moveDialog.bookingId,
      roomId: parseInt(targetRoomId, 10),
      stayDate: moveDialog.date,
    });
  };

  /** Rooms to offer in Move Dog, excluding the cell's room; grouped by building for the dropdown. */
  const moveTargetRoomsByBuilding = useMemo(() => {
    if (!moveDialog || !rooms?.length) return [] as { building: string; rooms: typeof rooms }[];
    const list = rooms
      .filter((r) => r.id !== moveDialog.roomId && r.isAvailable)
      .sort(
        (a, b) =>
          naturalSort(a.building || "", b.building || "") || naturalSort(a.name, b.name),
      );
    const m = new Map<string, typeof list>();
    for (const r of list) {
      const k = r.building || "Unassigned";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => naturalSort(a, b))
      .map(([building, rms]) => ({ building, rooms: rms }));
  }, [moveDialog, rooms]);

  const todayStr = todayString();

  const colTemplate =
    calRange === "month"
      ? `110px repeat(${dates.length}, minmax(0, 1fr))`
      : `130px repeat(${dates.length}, minmax(0, 1fr))`;

  const getDogCellLabel = (day: { dogNames?: string[]; bookingIds?: number[] }) => {
    const names = (day.dogNames ?? []).map((n) => String(n || "").trim()).filter(Boolean);
    if (names.length === 1) return names[0];
    if (names.length > 1) return names.join(", ");
    if (day.bookingIds?.length) return `Booking #${day.bookingIds[0]}`;
    return "Booked";
  };

  const getDogTooltipLabel = (day: { dogNames?: string[]; bookingIds?: number[] }) => {
    const names = (day.dogNames ?? []).map((n) => String(n || "").trim()).filter(Boolean);
    if (names.length > 0) return names.join(", ");
    if (day.bookingIds?.length) return `Booking #${day.bookingIds[0]}`;
    return "Booked";
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1 flex-1 min-w-[8rem]">
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">View</Label>
          <Select value={calRange} onValueChange={(v) => setCalRange(v as AvailabilityRange)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {calRange === "day" && (
          <div className="space-y-1 flex-1 min-w-[10rem]">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Date</Label>
            <Input
              type="date"
              className="h-9 text-xs"
              value={dayPick}
              onChange={(e) => setDayPick(e.target.value)}
            />
          </div>
        )}
        {calRange === "week" && (
          <div className="space-y-1 flex-[2] min-w-[12rem]">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Week</Label>
            <Select value={weekPick} onValueChange={setWeekPick}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent className="max-h-[16rem]">
                {weekSelectOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {calRange === "month" && (
          <div className="space-y-1 flex-1 min-w-[10rem]">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Month</Label>
            <Input
              type="month"
              className="h-9 text-xs"
              value={monthPick}
              onChange={(e) => setMonthPick(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="text-[11px] text-muted-foreground space-y-0.5">
        <p>
          {calRange === "day" && formatDate(dates[0])}
          {calRange === "week" &&
            dates[0] &&
            dates[6] &&
            `${formatDate(dates[0])} – ${formatDate(dates[6])}`}
          {calRange === "month" &&
            parseLocalDate(`${monthPick}-01`)?.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
        <p>
          Room list occupancy (Rooms tab) uses{" "}
          <span className="font-medium text-foreground">{formatDate(occupancyContextDate)}</span>
          {occupancyContextDate === todayStr ? " (today)" : ""}, including day-only moves.
        </p>
      </div>

      {isLoading ? (
        <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center"><div className="h-40 bg-muted rounded animate-pulse" /></CardContent></Card>
      ) : calendarBuildings.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No rooms to display. Add buildings and rooms first.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          {calendarBuildings.map(bldg => (
            <div key={bldg.building} className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {bldg.building}
                </h3>
              </div>
              <div className="border rounded-lg overflow-hidden overflow-x-auto">
                {/* Header row */}
                <div className="grid bg-muted/50 w-full" style={{ gridTemplateColumns: colTemplate }}>
                  <div className="p-2 text-xs font-semibold text-muted-foreground border-r sticky left-0 bg-muted/50 z-[1]">Room</div>
                  {dates.map(date => {
                    const d = new Date(date + "T12:00:00");
                    const isToday = date === todayStr;
                    return (
                      <div key={date} className={`p-1 sm:p-2 text-center border-r last:border-r-0 ${isToday ? "bg-primary/10" : ""}`}>
                        <p className={`font-medium text-muted-foreground ${calRange === "month" ? "text-[8px] leading-tight" : "text-[10px]"}`}>
                          {calRange === "month"
                            ? d.toLocaleDateString("en-US", { weekday: "narrow" })
                            : d.toLocaleDateString("en-US", { weekday: "short" })}
                        </p>
                        <p className={`font-bold ${calRange === "month" ? "text-[10px]" : "text-xs"} ${isToday ? "text-primary" : ""}`}>
                          {d.getDate()}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {/* Room rows */}
                {bldg.rooms.map(room => (
                  <div key={room.roomId} className="grid border-t w-full" style={{ gridTemplateColumns: colTemplate }}>
                    <div className="p-2 border-r flex items-center gap-1.5 sticky left-0 bg-white z-[1]">
                      <DoorOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-xs font-medium truncate">{room.roomName}</span>
                    </div>
                    {room.days.map(day => {
                      const isToday = day.date === todayStr;
                      return (
                        <div
                          key={day.date}
                          className={`p-1 border-r last:border-r-0 min-h-9 flex items-center justify-center ${isToday ? "bg-primary/5" : ""}`}
                        >
                          {day.occupancy > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => {
                                    if (day.bookingIds?.length) {
                                      const names = day.dogNames?.filter(Boolean) ?? [];
                                      setMoveDialog({
                                        bookingId: day.bookingIds[0],
                                        roomId: room.roomId,
                                        dogName:
                                          names.length > 0
                                            ? names.join(", ")
                                            : `Booking #${day.bookingIds[0]}`,
                                        date: day.date,
                                      });
                                    }
                                  }}
                                  className={`w-full min-h-7 h-auto py-0.5 px-0.5 rounded flex items-center justify-center gap-1 hover:opacity-80 transition-colors cursor-pointer ${
                                    day.booked ? "bg-red-100 border border-red-200" : "bg-amber-100 border border-amber-200"
                                  }`}
                                >
                                  <Dog className={`h-3 w-3 shrink-0 ${day.booked ? "text-red-500" : "text-amber-500"}`} />
                                  <span
                                    className={`text-[9px] sm:text-[10px] font-medium min-w-0 flex-1 text-center leading-tight whitespace-normal break-words ${
                                      day.booked ? "text-red-600" : "text-amber-600"
                                    }`}
                                  >
                                    {getDogCellLabel(day)}
                                  </span>
                                  <DogBadgesInline
                                    badgeKeys={Array.from(
                                      new Set(
                                        ((day as any).dogIds || []).flatMap((id: number) =>
                                          (((badgeAssignments as any)?.[String(id)] || []) as string[]).map((k: string) =>
                                            String(k).toLowerCase(),
                                          ),
                                        ),
                                      ),
                                    )}
                                    badgeByKey={badgeByKey}
                                  />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs max-w-[240px]">
                                <p className="font-medium">
                                  {getDogTooltipLabel(day)}
                                </p>
                                <p className="text-muted-foreground">{day.occupancy}/{day.capacity} occupied · Click to move (this day only)</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <div className="w-full h-6 rounded bg-green-50 border border-green-200 flex items-center justify-center">
                              <Check className="h-3 w-3 text-green-500" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-2 justify-center flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-green-50 border border-green-200 flex items-center justify-center">
                <Check className="h-2.5 w-2.5 text-green-500" />
              </div>
              <span className="text-xs text-muted-foreground">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-amber-100 border border-amber-200 flex items-center justify-center">
                <Dog className="h-2.5 w-2.5 text-amber-500" />
              </div>
              <span className="text-xs text-muted-foreground">Partial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-red-100 border border-red-200 flex items-center justify-center">
                <Dog className="h-2.5 w-2.5 text-red-500" />
              </div>
              <span className="text-xs text-muted-foreground">Full (click to move)</span>
            </div>
          </div>
        </div>
      )}

      {/* ===== MOVE DOG DIALOG ===== */}
      <Dialog open={!!moveDialog} onOpenChange={open => { if (!open) { setMoveDialog(null); setTargetRoomId(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" /> Move Dog
            </DialogTitle>
          </DialogHeader>
          {moveDialog && (() => {
            const curRoom = rooms.find((r) => r.id === moveDialog.roomId);
            return (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="text-sm">
                  <span className="font-medium">Dog(s):</span> {moveDialog.dogName}
                </p>
                <p className="text-xs text-muted-foreground">
                  On {formatDate(moveDialog.date)} · Currently: {curRoom?.name ?? "—"}
                  {curRoom?.building ? ` · ${curRoom.building}` : ""}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  This change applies to the selected day only; the stay-wide default room is unchanged.
                </p>
              </div>
              <div>
                <Label className="text-xs">Move to Room *</Label>
                <Select value={targetRoomId} onValueChange={setTargetRoomId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select a room" /></SelectTrigger>
                  <SelectContent className="max-h-[min(24rem,var(--radix-select-content-available-height))]">
                    {moveTargetRoomsByBuilding.map(({ building, rooms: grp }) => (
                      <SelectGroup key={building}>
                        <SelectLabel>{building}</SelectLabel>
                        {grp.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {moveTargetRoomsByBuilding.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded p-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>No available rooms to move to</span>
                </div>
              )}
            </div>
            );
          })()}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button onClick={handleMove} size="sm" disabled={!targetRoomId || assignForDay.isPending}>
              {assignForDay.isPending ? "Moving..." : "Move Dog"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
