import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { useEffect, useMemo, useState } from "react";
import { naturalSort } from "@/lib/naturalSort";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import {
  DoorOpen,
  Building2,
  Dog,
  ArrowRightLeft,
  Check,
  AlertTriangle,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, todayString } from "@/lib/dateUtils";
import { DogBadgesInline } from "@/components/DogBadgesInline";

const SIZE_LABELS: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  mixed: "Mixed",
  special_care: "Special",
};

const SIZE_COLORS: Record<string, string> = {
  small: "bg-blue-100 text-blue-700",
  medium: "bg-green-100 text-green-700",
  large: "bg-orange-100 text-orange-700",
  mixed: "bg-gray-100 text-gray-700",
  special_care: "bg-purple-100 text-purple-700",
};

export default function RoomOverview() {
  const { activeKennelId: kennelId } = useKennel();
  const [asOfDate, setAsOfDate] = useState(() => todayString());

  const roomsQuery = trpc.room.byKennel.useQuery(
    { kennelId: kennelId!, asOfDate },
    { enabled: !!kennelId }
  );
  const rooms = roomsQuery.data;

  const { data: assignments } = trpc.room.currentAssignments.useQuery(
    { kennelId: kennelId!, asOfDate },
    { enabled: !!kennelId }
  );

  const { data: allDogs } = trpc.dog.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );

  const { data: allBookings } = trpc.booking.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );

  const utils = trpc.useUtils();
  const { data: badgeCatalog } = trpc.dogBadge.listByKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId },
  );
  const { data: badgeAssignments } = trpc.dogBadge.assignedForDogs.useQuery(
    { kennelId: kennelId!, dogIds: (allDogs || []).map((d: any) => d.id) },
    { enabled: !!kennelId && !!allDogs?.length },
  );
  const badgeByKey = useMemo(
    () => new Map(((badgeCatalog || []) as any[]).map((b: any) => [String(b.key || "").toLowerCase(), b])),
    [badgeCatalog],
  );
  const [filterBuilding, setFilterBuilding] = useState<string>("all");
  const [reassignDialog, setReassignDialog] = useState<{
    bookingId: number;
    dogId: number;
    currentRoomId: number | null;
  } | null>(null);
  const [selectedAssignBuilding, setSelectedAssignBuilding] = useState<string>("");
  const [selectedNewRoom, setSelectedNewRoom] = useState<string>("");
  const clearAssignQueryParams = () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("assignBooking");
    url.searchParams.delete("dogId");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  };

  useEffect(() => {
    if (!kennelId) return;
    if (roomsQuery.error) {
      console.debug("[RoomOverview] room.byKennel error", {
        kennelId,
        message: roomsQuery.error.message,
      });
    } else {
      console.debug("[RoomOverview] room.byKennel data", {
        kennelId,
        roomsCount: rooms?.length || 0,
      });
    }
  }, [kennelId, roomsQuery.error, rooms?.length]);

  const assignRoom = trpc.room.assign.useMutation({
    onSuccess: () => {
      utils.room.byKennel.invalidate();
      utils.room.currentAssignments.invalidate();
      utils.room.dailyAvailability.invalidate();
      utils.booking.today.invalidate();
      utils.booking.byKennel.invalidate();
      utils.booking.todayTasks.invalidate();
      setReassignDialog(null);
      setSelectedAssignBuilding("");
      setSelectedNewRoom("");
      clearAssignQueryParams();
      toast.success("Room assignment updated");
    },
    onError: (e) => toast.error(e.message),
  });

  // Build a map of roomId -> assigned dogs (including multi-dog bookings sharing one room)
  const roomAssignments = useMemo(() => {
    const map: Record<number, Array<{ bookingId: number; dogId: number; dogName: string }>> = {};
    if (!assignments) return map;
    assignments.forEach((a) => {
      if (a.roomId == null) return;
      const rid = a.roomId;
      if (!map[rid]) map[rid] = [];
      const booking = allBookings?.find((b) => b.id === a.bookingId);
      const bookingDogIds: number[] =
        Array.isArray((booking as any)?.dogIdsOnBooking) && (booking as any).dogIdsOnBooking.length
          ? (booking as any).dogIdsOnBooking
          : [a.dogId];
      const bookingDogNames: string[] =
        Array.isArray((booking as any)?.dogNames) && (booking as any).dogNames.length
          ? (booking as any).dogNames
          : [];

      bookingDogIds.forEach((dogId, idx) => {
        const dog = allDogs?.find((d) => d.id === dogId);
        const dogName =
          bookingDogNames[idx] ||
          dog?.name ||
          `Dog #${dogId}`;
        map[rid].push({
          bookingId: a.bookingId,
          dogId,
          dogName,
        });
      });
    });
    return map;
  }, [assignments, allDogs, allBookings]);

  // No effective room for the selected date (day override ?? stay-wide), overlapping confirmed/checked_in stays
  const unassignedBookings = useMemo(() => {
    if (!allBookings || !assignments) return [];
    const noRoomIds = new Set(
      assignments.filter((a) => a.roomId == null).map((a) => a.bookingId),
    );
    return allBookings
      .filter(
        (b) =>
          noRoomIds.has(b.id) &&
          (b.status === "checked_in" || b.status === "confirmed"),
      )
      .map((b) => {
        const dog = allDogs?.find((d) => d.id === b.dogId);
        return {
          bookingId: b.id,
          dogId: b.dogId,
          dogName:
            (b as any).dogName ||
            ((b as any).dogNames?.length ? (b as any).dogNames.join(", ") : null) ||
            dog?.name ||
            `Dog #${b.dogId}`,
        };
      });
  }, [allBookings, allDogs, assignments]);

  const buildings = useMemo(() => {
    if (!rooms) return [];
    const set = new Set(rooms.map((r) => r.building || "Unassigned"));
    return Array.from(set).sort((a, b) => naturalSort(a, b));
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    if (!rooms) return [];
    return rooms.filter((r) => {
      if (filterBuilding !== "all" && (r.building || "Unassigned") !== filterBuilding) return false;
      return true;
    });
  }, [rooms, filterBuilding]);

  const groupedRooms = useMemo(() => {
    const groups: Record<string, typeof filteredRooms> = {};
    filteredRooms.forEach((r) => {
      const key = r.building || "Unassigned";
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => naturalSort(a.name, b.name));
    }
    return groups;
  }, [filteredRooms]);

  const assignableRooms = useMemo(() => {
    return (
      rooms?.filter(
        (r) =>
          r.isAvailable !== false &&
          r.id !== reassignDialog?.currentRoomId &&
          (r.currentOccupancy ?? 0) < r.capacity
      ) || []
    );
  }, [rooms, reassignDialog?.currentRoomId]);

  const assignableBuildings = useMemo(() => {
    const set = new Set(assignableRooms.map((r) => r.building || "Unassigned"));
    return Array.from(set).sort((a, b) => naturalSort(a, b));
  }, [assignableRooms]);

  const assignableRoomsForBuilding = useMemo(() => {
    if (!selectedAssignBuilding) return [];
    return assignableRooms
      .filter((r) => (r.building || "Unassigned") === selectedAssignBuilding)
      .sort((a, b) => naturalSort(a.name, b.name));
  }, [assignableRooms, selectedAssignBuilding]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const bookingId = Number(params.get("assignBooking") || "0");
    const dogId = Number(params.get("dogId") || "0");
    if (!bookingId || !dogId) return;
    setReassignDialog((prev) => {
      if (prev?.bookingId === bookingId && prev?.dogId === dogId) return prev;
      return { bookingId, dogId, currentRoomId: null };
    });
  }, [allBookings, assignments]);

  useEffect(() => {
    if (!reassignDialog) return;
    if (!selectedAssignBuilding && assignableBuildings.length > 0) {
      setSelectedAssignBuilding(assignableBuildings[0]);
    }
  }, [reassignDialog, assignableBuildings, selectedAssignBuilding]);

  useEffect(() => {
    if (!reassignDialog) return;
    if (!selectedAssignBuilding) {
      setSelectedNewRoom("");
      return;
    }
    if (!selectedNewRoom && assignableRoomsForBuilding.length > 0) {
      setSelectedNewRoom(String(assignableRoomsForBuilding[0].id));
      return;
    }
    if (selectedNewRoom && !assignableRoomsForBuilding.some((r) => String(r.id) === selectedNewRoom)) {
      setSelectedNewRoom("");
    }
  }, [reassignDialog, selectedAssignBuilding, assignableRoomsForBuilding, selectedNewRoom]);

  if (!kennelId) {
    return (
      <div className="p-4 flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">No kennel found.</p>
      </div>
    );
  }

  const totalOccupied = rooms?.reduce((s, r) => s + (r.currentOccupancy ?? 0), 0) || 0;
  const totalCapacity = rooms?.reduce((s, r) => s + r.capacity, 0) || 0;
  const availableSpots = totalCapacity - totalOccupied;

  return (
    <div className="space-y-4 w-full max-w-5xl mx-auto">
      {/* Header — aligned with owner Rooms experience */}
      <div className="space-y-2">
        <div>
          <h1 className="text-xl font-bold">Rooms</h1>
          <p className="text-sm text-muted-foreground">
            Room overview · {totalOccupied}/{totalCapacity} spots filled &middot; {availableSpots} available
          </p>
        </div>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:gap-3">
          <div className="space-y-1 flex-1 min-w-[10rem]">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Show assignments for
            </Label>
            <Input
              type="date"
              className="h-9 text-xs w-full sm:max-w-[11rem]"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value || todayString())}
            />
          </div>
          <p className="text-[11px] text-muted-foreground pb-0.5">
            Matches the availability calendar for {formatDate(asOfDate)} (day-specific moves included).
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-3 text-center">
            <Dog className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{totalOccupied}</p>
            <p className="text-xs text-muted-foreground">Dogs Housed</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-3 text-center">
            <DoorOpen className="h-5 w-5 mx-auto text-green-600 mb-1" />
            <p className="text-lg font-bold">{availableSpots}</p>
            <p className="text-xs text-muted-foreground">Open Spots</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-orange-500 mb-1" />
            <p className="text-lg font-bold">{unassignedBookings.length}</p>
            <p className="text-xs text-muted-foreground">Unassigned</p>
          </CardContent>
        </Card>
      </div>

      {/* Unassigned Dogs */}
      {unassignedBookings.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <p className="text-sm font-semibold text-orange-700">
                Dogs Without Room Assignment
              </p>
            </div>
            <div className="space-y-1.5">
              {unassignedBookings.map((ub) => (
                <div key={ub.bookingId} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Dog className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{ub.dogName}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      if (!assignableRooms.length) {
                        toast.error("No available rooms to assign right now.");
                        return;
                      }
                      setReassignDialog({
                        bookingId: ub.bookingId,
                        dogId: ub.dogId,
                        currentRoomId: null,
                      });
                      setSelectedAssignBuilding("");
                      setSelectedNewRoom("");
                    }}
                  >
                    <DoorOpen className="h-3 w-3 mr-1" /> Assign
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      {buildings.length > 1 && (
        <Select value={filterBuilding} onValueChange={setFilterBuilding}>
          <SelectTrigger className="w-[180px]">
            <Building2 className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder="Building" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buildings</SelectItem>
            {buildings.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Room Grid */}
      {Object.entries(groupedRooms).map(([building, buildingRooms]) => (
        <div key={building} className="space-y-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {building}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {buildingRooms.map((room) => {
              const occ = room.currentOccupancy ?? 0;
              const isFull = occ >= room.capacity;
              const assigned = roomAssignments[room.id] || [];
              const inMaintenance = room.isAvailable === false;
              const sizeKey = room.sizeType in SIZE_LABELS ? room.sizeType : "mixed";

              return (
                <Card
                  key={room.id}
                  className={`border-0 shadow-sm ${
                    inMaintenance
                      ? "opacity-60 border border-dashed border-orange-200 bg-muted/40"
                      : isFull
                      ? "border border-red-200 bg-red-50/30"
                      : occ > 0
                      ? "border border-primary/30 bg-primary/5"
                      : "border border-border/80 bg-white"
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-semibold text-sm">{room.name}</p>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${SIZE_COLORS[sizeKey]}`}
                      >
                        {SIZE_LABELS[sizeKey]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span
                        className={`text-xs font-medium ${
                          isFull ? "text-red-600" : "text-muted-foreground"
                        }`}
                      >
                        {occ}/{room.capacity}
                      </span>
                      {inMaintenance && (
                        <span className="text-[10px] font-medium text-orange-600 ml-1">Maintenance</span>
                      )}
                    </div>
                    {/* Show assigned dogs */}
                    {assigned.length > 0 ? (
                      <div className="space-y-1">
                        {assigned.map((a) => (
                          <div
                            key={a.bookingId}
                            className="flex items-center justify-between bg-white/80 rounded px-2 py-1"
                          >
                            <div className="flex items-center gap-1.5">
                              <Dog className="h-3 w-3 text-primary" />
                              <span className="text-xs font-medium">{a.dogName}</span>
                              <DogBadgesInline
                                badgeKeys={((badgeAssignments as any)?.[String(a.dogId)] || []).map((k: string) => String(k).toLowerCase())}
                                badgeByKey={badgeByKey}
                              />
                            </div>
                            <button
                              className="text-muted-foreground hover:text-primary"
                              onClick={() =>
                                setReassignDialog({
                                  bookingId: a.bookingId,
                                  dogId: a.dogId,
                                  currentRoomId: room.id,
                                })
                              }
                            >
                              <ArrowRightLeft className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Empty</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {(!rooms || rooms.length === 0) && (
        <Card>
          <CardContent className="p-8 text-center">
            <DoorOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No rooms configured</p>
            {roomsQuery.error ? (
              <p className="text-sm text-destructive mt-1">
                {roomsQuery.error.message}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                Ask the kennel owner to set up rooms first
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reassign Dialog */}
      <Dialog
        open={!!reassignDialog}
        onOpenChange={(open) => {
          if (!open) {
            setReassignDialog(null);
            setSelectedAssignBuilding("");
            setSelectedNewRoom("");
            clearAssignQueryParams();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reassignDialog?.currentRoomId ? "Reassign Room" : "Assign Room"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Step 1: Building
              </p>
              <Select
                value={selectedAssignBuilding}
                onValueChange={(v) => {
                  setSelectedAssignBuilding(v);
                  setSelectedNewRoom("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a building..." />
                </SelectTrigger>
                <SelectContent>
                  {assignableBuildings.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Step 2: Room
              </p>
              <Select
                value={selectedNewRoom}
                onValueChange={setSelectedNewRoom}
                disabled={!selectedAssignBuilding || assignableRoomsForBuilding.length === 0}
              >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !selectedAssignBuilding
                      ? "Select a building first"
                      : assignableRoomsForBuilding.length === 0
                        ? "No available rooms in this building"
                        : "Choose a room..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {assignableRoomsForBuilding
                  .map((r) => {
                    const sk = r.sizeType in SIZE_LABELS ? r.sizeType : "mixed";
                    return (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name} ({r.building || "No building"}) — {r.currentOccupancy ?? 0}/
                      {r.capacity} &middot; {SIZE_LABELS[sk]}
                    </SelectItem>
                  );
                  })}
              </SelectContent>
            </Select>
            </div>
            {selectedAssignBuilding && assignableRoomsForBuilding.length === 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                No assignable rooms are currently available in {selectedAssignBuilding}.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={!selectedNewRoom}
                onClick={async () => {
                  if (reassignDialog && selectedNewRoom) {
                    await assignRoom.mutateAsync({
                      bookingId: reassignDialog.bookingId,
                      roomId: parseInt(selectedNewRoom, 10),
                    });
                  }
                }}
              >
                <Check className="h-4 w-4 mr-1" /> Assign Room
              </Button>
              <Button variant="outline" onClick={() => setReassignDialog(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
