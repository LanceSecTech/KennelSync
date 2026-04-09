import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { useMemo, useState } from "react";
import { naturalSort } from "@/lib/naturalSort";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  const { data: rooms } = trpc.room.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );

  const { data: assignments } = trpc.room.currentAssignments.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );

  const { data: allDogs } = trpc.dog.byKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );

  const { data: todayBookings } = trpc.booking.today.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId }
  );

  const utils = trpc.useUtils();
  const [filterBuilding, setFilterBuilding] = useState<string>("all");
  const [reassignDialog, setReassignDialog] = useState<{
    bookingId: number;
    dogId: number;
    currentRoomId: number | null;
  } | null>(null);
  const [selectedNewRoom, setSelectedNewRoom] = useState<string>("");

  const assignRoom = trpc.room.assign.useMutation({
    onSuccess: () => {
      utils.room.byKennel.invalidate();
      utils.room.currentAssignments.invalidate();
      utils.booking.today.invalidate();
      setReassignDialog(null);
      setSelectedNewRoom("");
      toast.success("Room assignment updated");
    },
    onError: (e) => toast.error(e.message),
  });

  // Build a map of roomId -> assigned dogs
  const roomAssignments = useMemo(() => {
    const map: Record<number, Array<{ bookingId: number; dogId: number; dogName: string }>> = {};
    if (!assignments || !allDogs) return map;
    assignments.forEach((a) => {
      if (a.roomId == null) return;
      if (!map[a.roomId]) map[a.roomId] = [];
      const dog = allDogs.find((d) => d.id === a.dogId);
      map[a.roomId].push({
        bookingId: a.bookingId,
        dogId: a.dogId,
        dogName: dog?.name || `Dog #${a.dogId}`,
      });
    });
    return map;
  }, [assignments, allDogs]);

  // Unassigned dogs (checked in but no room)
  const unassignedBookings = useMemo(() => {
    if (!todayBookings || !allDogs) return [];
    return todayBookings
      .filter((b) => b.status === "checked_in" && !b.roomId)
      .map((b) => {
        const dog = allDogs.find((d) => d.id === b.dogId);
        return { bookingId: b.id, dogId: b.dogId, dogName: dog?.name || `Dog #${b.dogId}` };
      });
  }, [todayBookings, allDogs]);

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

  if (!kennelId) {
    return (
      <div className="p-4 flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">No kennel found.</p>
      </div>
    );
  }

  const totalOccupied = rooms?.reduce((s, r) => s + ((r as any).currentOccupancy || 0), 0) || 0;
  const totalCapacity = rooms?.reduce((s, r) => s + r.capacity, 0) || 0;
  const availableSpots = totalCapacity - totalOccupied;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Room Overview</h1>
        <p className="text-sm text-muted-foreground">
          {totalOccupied}/{totalCapacity} spots filled &middot; {availableSpots} available
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Dog className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{totalOccupied}</p>
            <p className="text-xs text-muted-foreground">Dogs Housed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <DoorOpen className="h-5 w-5 mx-auto text-green-600 mb-1" />
            <p className="text-lg font-bold">{availableSpots}</p>
            <p className="text-xs text-muted-foreground">Open Spots</p>
          </CardContent>
        </Card>
        <Card>
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
                    onClick={() =>
                      setReassignDialog({
                        bookingId: ub.bookingId,
                        dogId: ub.dogId,
                        currentRoomId: null,
                      })
                    }
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
              const occ = (room as any).currentOccupancy || 0;
              const isFull = occ >= room.capacity;
              const assigned = roomAssignments[room.id] || [];

              return (
                <Card
                  key={room.id}
                  className={`${
                    !room.isAvailable
                      ? "opacity-50 border-dashed"
                      : isFull
                      ? "border-red-200 bg-red-50/30"
                      : occ > 0
                      ? "border-primary/30 bg-primary/5"
                      : ""
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-semibold text-sm">{room.name}</p>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${SIZE_COLORS[room.sizeType]}`}
                      >
                        {SIZE_LABELS[room.sizeType]}
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
                      {!room.isAvailable && (
                        <span className="text-[10px] text-orange-500 ml-1">Maintenance</span>
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
            <p className="text-sm text-muted-foreground mt-1">
              Ask the kennel owner to set up rooms first
            </p>
          </CardContent>
        </Card>
      )}

      {/* Reassign Dialog */}
      <Dialog
        open={!!reassignDialog}
        onOpenChange={(open) => {
          if (!open) {
            setReassignDialog(null);
            setSelectedNewRoom("");
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
            <p className="text-sm text-muted-foreground">
              Select a room for this dog:
            </p>
            <Select value={selectedNewRoom} onValueChange={setSelectedNewRoom}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a room..." />
              </SelectTrigger>
              <SelectContent>
                {rooms
                  ?.filter(
                    (r) =>
                      r.isAvailable &&
                      r.id !== reassignDialog?.currentRoomId &&
                      ((r as any).currentOccupancy || 0) < r.capacity
                  )
                  .map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name} ({r.building || "No building"}) — {(r as any).currentOccupancy || 0}/
                      {r.capacity} &middot; {SIZE_LABELS[r.sizeType]}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={!selectedNewRoom}
                onClick={() => {
                  if (reassignDialog && selectedNewRoom) {
                    assignRoom.mutate({
                      bookingId: reassignDialog.bookingId,
                      roomId: parseInt(selectedNewRoom),
                    });
                  }
                }}
              >
                <Check className="h-4 w-4 mr-1" /> Confirm
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
