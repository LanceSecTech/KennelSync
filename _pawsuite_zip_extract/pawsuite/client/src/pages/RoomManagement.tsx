import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Building2, DoorOpen, Plus, Edit2, Trash2, Check, X, Dog,
  ChevronLeft, ChevronRight, ArrowRightLeft, AlertTriangle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { todayString, parseLocalDate } from "@/lib/dateUtils";
import { naturalSort } from "@/lib/naturalSort";

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
  const { data: roomList, isLoading } = trpc.room.byKennel.useQuery({ kennelId });
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
    onSuccess: () => { utils.room.byKennel.invalidate({ kennelId }); toast.success("Room added!"); },
    onError: () => toast.error("Failed to add room"),
  });

  const updateRoom = trpc.room.update.useMutation({
    onSuccess: () => { utils.room.byKennel.invalidate({ kennelId }); setEditRoom(null); toast.success("Room updated!"); },
    onError: () => toast.error("Failed to update room"),
  });

  const deleteRoom = trpc.room.delete.useMutation({
    onSuccess: () => { utils.room.byKennel.invalidate({ kennelId }); setDeleteId(null); toast.success("Room deleted!"); },
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

  const handleAddBuilding = () => {
    if (!buildingName.trim()) { toast.error("Building name required"); return; }
    const count = parseInt(roomCount) || 1;
    if (count < 1 || count > 100) { toast.error("Room count must be 1-100"); return; }
    // Create rooms sequentially
    let created = 0;
    for (let i = 1; i <= count; i++) {
      createRoom.mutate(
        { kennelId, name: `Room ${i}`, building: buildingName.trim(), sizeType: buildingSizeType as any, capacity: 1 },
        { onSuccess: () => { created++; if (created === count) toast.success(`Created ${count} rooms in ${buildingName}`); } }
      );
    }
    setShowAddBuilding(false);
    setBuildingName("");
    setRoomCount("");
    setBuildingSizeType("mixed");
  };

  const handleAddRoom = () => {
    if (!roomForm.name.trim()) { toast.error("Room name required"); return; }
    createRoom.mutate({
      kennelId,
      name: roomForm.name.trim(),
      building: roomForm.building.trim() || undefined,
      sizeType: roomForm.sizeType as any,
      capacity: parseInt(roomForm.capacity) || 1,
      notes: roomForm.notes || undefined,
    });
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

  return (
    <div className="space-y-4">
      <Tabs defaultValue="rooms" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-9">
          <TabsTrigger value="rooms" className="text-xs">Rooms & Buildings</TabsTrigger>
          <TabsTrigger value="availability" className="text-xs">Availability Calendar</TabsTrigger>
        </TabsList>

        {/* ===== ROOMS TAB ===== */}
        <TabsContent value="rooms" className="space-y-3 mt-3">
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
          <AvailabilityCalendar kennelId={kennelId} rooms={roomList || []} />
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

/** ===== AVAILABILITY CALENDAR ===== */
function AvailabilityCalendar({ kennelId, rooms }: { kennelId: number; rooms: any[] }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const { startDate, endDate, dates } = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    start.setDate(start.getDate() + weekOffset * 7);
    start.setDate(start.getDate() - start.getDay()); // Start on Sunday
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const ds: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      ds.push(`${yyyy}-${mm}-${dd}`);
    }
    return { startDate: ds[0], endDate: ds[ds.length - 1], dates: ds };
  }, [weekOffset]);

  const { data: dailyData, isLoading } = trpc.room.dailyAvailability.useQuery(
    { kennelId, startDate, endDate },
    { placeholderData: (prev) => prev }
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
  const assignRoom = trpc.room.assign.useMutation({
    onSuccess: () => {
      utils.room.dailyAvailability.invalidate({ kennelId });
      utils.room.byKennel.invalidate({ kennelId });
      utils.booking.byKennel.invalidate({ kennelId });
      setMoveDialog(null);
      setTargetRoomId("");
      toast.success("Dog moved to new room!");
    },
    onError: () => toast.error("Failed to move dog"),
  });
  const utils = trpc.useUtils();

  const handleMove = () => {
    if (!moveDialog || !targetRoomId) return;
    assignRoom.mutate({ bookingId: moveDialog.bookingId, roomId: parseInt(targetRoomId) });
  };

  // Available rooms for move (exclude current room)
  const moveTargetRooms = useMemo(() => {
    if (!moveDialog || !rooms) return [];
    return rooms
      .filter(r => r.id !== moveDialog.roomId && r.isAvailable)
      .sort((a, b) => naturalSort(a.name, b.name));
  }, [moveDialog, rooms]);

  const todayStr = todayString();

  return (
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setWeekOffset(o => o - 1)}>
          <ChevronLeft className="h-3 w-3" /> Prev
        </Button>
        <div className="text-center">
          <p className="text-xs font-medium">
            {parseLocalDate(dates[0])?.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {parseLocalDate(dates[dates.length - 1])?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-[10px] text-primary hover:underline">Today</button>
          )}
        </div>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setWeekOffset(o => o + 1)}>
          Next <ChevronRight className="h-3 w-3" />
        </Button>
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
              <div className="border rounded-lg overflow-hidden">
                {/* Header row */}
                <div className="grid bg-muted/50" style={{ gridTemplateColumns: "120px repeat(7, 1fr)" }}>
                  <div className="p-2 text-xs font-semibold text-muted-foreground border-r">Room</div>
                  {dates.map(date => {
                    const d = new Date(date + "T12:00:00");
                    const isToday = date === todayStr;
                    return (
                      <div key={date} className={`p-2 text-center border-r last:border-r-0 ${isToday ? "bg-primary/10" : ""}`}>
                        <p className="text-[10px] font-medium text-muted-foreground">
                          {d.toLocaleDateString("en-US", { weekday: "short" })}
                        </p>
                        <p className={`text-xs font-bold ${isToday ? "text-primary" : ""}`}>
                          {d.getDate()}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {/* Room rows */}
                {bldg.rooms.map(room => (
                  <div key={room.roomId} className="grid border-t" style={{ gridTemplateColumns: "120px repeat(7, 1fr)" }}>
                    <div className="p-2 border-r flex items-center gap-1.5">
                      <DoorOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-xs font-medium truncate">{room.roomName}</span>
                    </div>
                    {room.days.map(day => {
                      const isToday = day.date === todayStr;
                      return (
                        <div
                          key={day.date}
                          className={`p-1 border-r last:border-r-0 flex items-center justify-center ${isToday ? "bg-primary/5" : ""}`}
                        >
                          {day.occupancy > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => {
                                    if (day.bookingIds?.length) {
                                      setMoveDialog({
                                        bookingId: day.bookingIds[0],
                                        roomId: room.roomId,
                                        dogName: day.dogNames?.join(", ") || "Unknown",
                                        date: day.date,
                                      });
                                    }
                                  }}
                                  className={`w-full h-6 rounded flex items-center justify-center gap-0.5 hover:opacity-80 transition-colors cursor-pointer ${
                                    day.booked ? "bg-red-100 border border-red-200" : "bg-amber-100 border border-amber-200"
                                  }`}
                                >
                                  <Dog className={`h-3 w-3 ${day.booked ? "text-red-500" : "text-amber-500"}`} />
                                  {day.dogNames && (
                                    <span className={`text-[8px] font-medium truncate max-w-[40px] ${day.booked ? "text-red-600" : "text-amber-600"}`}>
                                      {day.dogNames.length > 1 ? `${day.occupancy}/${day.capacity}` : day.dogNames[0]}
                                    </span>
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <p className="font-medium">{day.dogNames?.join(", ") || "Booked"}</p>
                                <p className="text-muted-foreground">{day.occupancy}/{day.capacity} occupied · Click to move</p>
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
          {moveDialog && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="text-sm"><span className="font-medium">Dog:</span> {moveDialog.dogName}</p>
                <p className="text-xs text-muted-foreground">
                  Currently in: {rooms.find(r => r.id === moveDialog.roomId)?.name || "Unknown"}
                </p>
              </div>
              <div>
                <Label className="text-xs">Move to Room *</Label>
                <Select value={targetRoomId} onValueChange={setTargetRoomId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select a room" /></SelectTrigger>
                  <SelectContent>
                    {moveTargetRooms.map(r => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name} {r.building ? `(${r.building})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {moveTargetRooms.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded p-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>No available rooms to move to</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
            <Button onClick={handleMove} size="sm" disabled={!targetRoomId || assignRoom.isPending}>
              {assignRoom.isPending ? "Moving..." : "Move Dog"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
