import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";

type KennelInfo = {
  id: number;
  name: string;
  isFavorite?: boolean;
};

type KennelContextType = {
  activeKennelId: number | null;
  activeKennelName: string;
  setActiveKennelId: (id: number) => void;
  linkedKennels: KennelInfo[];
  allKennels: KennelInfo[];
  isLoading: boolean;
  linkToKennel: (kennelId: number) => Promise<void>;
  unlinkFromKennel: (kennelId: number) => Promise<void>;
  toggleFavorite: (kennelId: number) => Promise<void>;
};

const KennelContext = createContext<KennelContextType>({
  activeKennelId: null,
  activeKennelName: "",
  setActiveKennelId: () => {},
  linkedKennels: [],
  allKennels: [],
  isLoading: true,
  linkToKennel: async () => {},
  unlinkFromKennel: async () => {},
  toggleFavorite: async () => {},
});

export function useKennel() {
  return useContext(KennelContext);
}

export function KennelProvider({
  children,
  userRole,
  userKennelId,
}: {
  children: ReactNode;
  userRole: string;
  userKennelId?: number | null;
}) {
  const [activeKennelId, setActiveKennelIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem("kennelsync_active_kennel");
    if (userRole === "employee" && userKennelId) return userKennelId;
    return stored ? parseInt(stored) : null;
  });

  // For owners/employees: get their kennel
  const { data: myKennels } = trpc.kennel.myKennels.useQuery(undefined, {
    enabled: userRole === "owner" || userRole === "employee",
  });

  // For all roles: get all kennels
  const { data: allKennelsList, isLoading: allLoading } = trpc.kennel.list.useQuery();

  // For customers: get their linked kennels via customerKennel.myLinkedKennels
  const { data: customerLinks, isLoading: linksLoading } = trpc.customerKennel.myLinkedKennels.useQuery(undefined, {
    enabled: userRole === "customer",
  });

  const utils = trpc.useUtils();

  const linkMutation = trpc.customerKennel.link.useMutation({
    onSuccess: () => utils.customerKennel.myLinkedKennels.invalidate(),
  });
  const unlinkMutation = trpc.customerKennel.unlink.useMutation({
    onSuccess: () => utils.customerKennel.myLinkedKennels.invalidate(),
  });
  const favMutation = trpc.customerKennel.toggleFavorite.useMutation({
    onSuccess: () => utils.customerKennel.myLinkedKennels.invalidate(),
  });

  // Build linked kennels list
  const linkedKennels: KennelInfo[] = (() => {
    if (userRole === "owner" && myKennels?.length) {
      return myKennels.map(k => ({ id: k.id, name: k.name, isFavorite: true }));
    }
    if (userRole === "employee" && myKennels?.length) {
      // Employee should only see their assigned kennel(s) from backend scoping.
      return myKennels.map(k => ({ id: k.id, name: k.name, isFavorite: true }));
    }
    if (userRole === "employee" && userKennelId) {
      const empKennel = allKennelsList?.find(k => k.id === userKennelId);
      return [
        {
          id: userKennelId,
          name: empKennel?.name || `Kennel #${userKennelId}`,
          isFavorite: true,
        },
      ];
    }
    if (userRole === "customer" && customerLinks) {
      return customerLinks.map((cl: any) => ({
        id: cl.kennelId,
        name: cl.kennelName || `Kennel #${cl.kennelId}`,
        isFavorite: cl.isFavorite,
      }));
    }
    return [];
  })();

  const allKennels: KennelInfo[] = (allKennelsList || []).map(k => ({
    id: k.id,
    name: k.name,
    isFavorite: linkedKennels.some(lk => lk.id === k.id && lk.isFavorite),
  }));

  // Auto-select kennel or clear stale selection
  useEffect(() => {
    if (userRole === "owner" && myKennels?.length) {
      if (!activeKennelId) setActiveKennelIdState(myKennels[0].id);
    } else if (userRole === "employee" && userKennelId) {
      if (activeKennelId !== userKennelId) {
        setActiveKennelIdState(userKennelId);
      }
    } else if (userRole === "employee" && myKennels?.length) {
      if (!activeKennelId || !myKennels.some(k => k.id === activeKennelId)) {
        setActiveKennelIdState(myKennels[0].id);
      }
    } else if (userRole === "customer") {
      if (linkedKennels.length === 0) {
        // No linked kennels: clear any stale selection
        if (activeKennelId) {
          setActiveKennelIdState(null);
          localStorage.removeItem("kennelsync_active_kennel");
        }
      } else if (!activeKennelId || !linkedKennels.some(k => k.id === activeKennelId)) {
        // No selection or stale selection: pick from linked kennels
        const fav = linkedKennels.find(k => k.isFavorite);
        setActiveKennelIdState(fav?.id || linkedKennels[0].id);
      }
    }
  }, [activeKennelId, myKennels, linkedKennels, allKennelsList, userRole, userKennelId]);

  // Persist selection
  const setActiveKennelId = (id: number) => {
    setActiveKennelIdState(id);
    localStorage.setItem("kennelsync_active_kennel", String(id));
  };

  const linkToKennel = async (kennelId: number) => {
    await linkMutation.mutateAsync({ kennelId });
  };

  const unlinkFromKennel = async (kennelId: number) => {
    await unlinkMutation.mutateAsync({ kennelId });
    if (activeKennelId === kennelId) {
      const remaining = linkedKennels.filter(k => k.id !== kennelId);
      if (remaining.length > 0) {
        setActiveKennelId(remaining[0].id);
      } else {
        setActiveKennelIdState(null);
        localStorage.removeItem("kennelsync_active_kennel");
      }
    }
  };

  const toggleFavorite = async (kennelId: number) => {
    await favMutation.mutateAsync({ kennelId });
  };

  const activeKennelName = allKennels.find(k => k.id === activeKennelId)?.name || "";

  return (
    <KennelContext.Provider
      value={{
        activeKennelId,
        activeKennelName,
        setActiveKennelId,
        linkedKennels,
        allKennels,
        isLoading: allLoading || linksLoading,
        linkToKennel,
        unlinkFromKennel,
        toggleFavorite,
      }}
    >
      {children}
    </KennelContext.Provider>
  );
}
