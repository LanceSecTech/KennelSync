import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { getOnboardingState, saveOnboardingState, type AppRole, type OnboardingState } from "@/lib/onboarding";
import { getCurrentDeviceLocation } from "@/lib/location";
import { toast } from "sonner";

type Props = {
  user: {
    id: string;
    email?: string | null;
    role: string;
    kennelId?: number | null;
    onboardingCompleted?: boolean;
  };
  onComplete: () => void;
};

const roleSteps: Record<AppRole, string[]> = {
  customer: ["Welcome", "Basic profile", "Link kennel", "Add first dog", "Care + vaccine notes", "Finish"],
  employee: ["Welcome", "Basic profile", "Confirm kennel", "Tool intro", "Quick walkthroughs", "Finish"],
  owner: [
    "Welcome",
    "Basic profile",
    "Kennel profile",
    "KennelSync plan",
    "Services + rooms",
    "Hours + vaccines",
    "Finish",
  ],
};

export default function Onboarding({ user, onComplete }: Props) {
  const role = (["customer", "employee", "owner"].includes(user.role) ? user.role : "customer") as AppRole;
  const [state, setState] = useState<OnboardingState>(() => {
    return (
      getOnboardingState(user.id) || {
        role,
        step: 0,
        completed: false,
        updatedAt: new Date().toISOString(),
        data: {},
      }
    );
  });
  const steps = roleSteps[role];
  const [, setLocation] = useLocation();
  const { allKennels, linkedKennels, linkToKennel, toggleFavorite } = useKennel();
  const utils = trpc.useUtils();
  const completeOnboardingMut = trpc.auth.completeOnboarding.useMutation({
    onSuccess: () => void utils.auth.me.invalidate(),
  });
  const createDog = trpc.dog.create.useMutation();
  const updateDog = trpc.dog.update.useMutation();
  const { data: myKennelsForPlan, isPending: myKennelsPending } = trpc.kennel.myKennels.useQuery(undefined, {
    enabled: role === "owner",
  });
  /** Must match `getKennelsByOwnerId` — do not prefer `user.kennelId` alone (can be stale or another kennel). */
  const planKennelId = useMemo(() => {
    if (role !== "owner") return null;
    if (myKennelsPending) return null;
    const owned = myKennelsForPlan ?? [];
    if (owned.length === 0) return null;
    if (user.kennelId != null && owned.some((k) => k.id === user.kennelId)) return user.kennelId;
    return owned[0].id;
  }, [role, myKennelsPending, myKennelsForPlan, user.kennelId]);

  const billingAccessQuery = trpc.ownerBilling.access.useQuery(
    { kennelId: planKennelId! },
    { enabled: role === "owner" && state.step === 3 && planKennelId != null },
  );
  const billingAccess = billingAccessQuery.data;

  const startTrialMut = trpc.ownerBilling.startTrial.useMutation({
    onSuccess: () => {
      toast.success("Trial started — 7 days free");
      void utils.ownerBilling.access.invalidate();
      setState((prev) => ({
        ...prev,
        step: Math.min(prev.step + 1, roleSteps.owner.length - 1),
        updatedAt: new Date().toISOString(),
      }));
    },
    onError: (e) => toast.error(e.message || "Could not start trial"),
  });

  const subscriptionCheckoutMut = trpc.ownerBilling.createSubscriptionCheckout.useMutation({
    onError: (e) => toast.error(e.message || "Could not start checkout"),
  });

  const subscriptionReturnHandled = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || role !== "owner") return;
    if (subscriptionReturnHandled.current) return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("subscription") !== "success") return;
    subscriptionReturnHandled.current = true;
    sp.delete("subscription");
    const q = sp.toString();
    window.history.replaceState({}, "", window.location.pathname + (q ? `?${q}` : ""));
    toast.success("Subscription activated");
    void utils.ownerBilling.access.invalidate();
    setState((prev) =>
      prev.step === 3 ? { ...prev, step: 4, updatedAt: new Date().toISOString() } : prev,
    );
  }, [role, utils.ownerBilling.access]);

  useEffect(() => {
    saveOnboardingState(user.id, state);
  }, [user.id, state]);

  const pct = ((state.step + 1) / steps.length) * 100;

  function updateData(patch: Record<string, unknown>) {
    setState((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      data: { ...prev.data, ...patch },
    }));
  }

  function next() {
    setState((prev) => ({ ...prev, step: Math.min(prev.step + 1, steps.length - 1), updatedAt: new Date().toISOString() }));
  }

  function back() {
    setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 0), updatedAt: new Date().toISOString() }));
  }

  async function finish() {
    try {
      await completeOnboardingMut.mutateAsync();
    } catch (err: any) {
      toast.error(err?.message || "Could not save completion. Try again.");
      return;
    }
    const completedState = {
      ...state,
      step: steps.length - 1,
      completed: true,
      updatedAt: new Date().toISOString(),
    };
    setState(completedState);
    saveOnboardingState(user.id, completedState);
    onComplete();
    setLocation("/app");
  }

  async function handleContinue() {
    if (role === "customer" && state.step === 4) {
      const dogId = Number(state.data.createdDogId || 0);
      if (dogId > 0) {
        try {
          await updateDog.mutateAsync({
            id: dogId,
            feedingInstructions: String(state.data.feeding || "") || undefined,
            medications: String(state.data.meds || "") || undefined,
            behaviorNotes: String(state.data.behavior || "") || undefined,
            emergencyContactName: String(state.data.emergencyName || "") || undefined,
            emergencyContactPhone: String(state.data.emergencyPhone || "") || undefined,
            vetName: String(state.data.vetName || "") || undefined,
            vetPhone: String(state.data.vetPhone || "") || undefined,
          });
          await utils.dog.myDogs.invalidate();
        } catch (err: any) {
          toast.error(err?.message || "Failed to save dog care details");
          return;
        }
      }
    }

    next();
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>{role.charAt(0).toUpperCase() + role.slice(1)} onboarding</CardTitle>
          <p className="text-sm text-slate-600">{steps[state.step]}</p>
          <Progress value={pct} className="mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <OnboardingStep
            role={role}
            step={state.step}
            data={state.data}
            email={user.email ?? ""}
            kennelId={user.kennelId ?? null}
            ownerPlanKennelId={planKennelId}
            ownerPlanKennelListLoading={role === "owner" && myKennelsPending}
            ownerPlanBillingError={
              role === "owner" && state.step === 3 && planKennelId != null && billingAccessQuery.isError
                ? billingAccessQuery.error?.message ?? "Could not load plan"
                : null
            }
            ownerPlanBillingAccess={billingAccess}
            ownerPlanLoading={
              startTrialMut.isPending ||
              subscriptionCheckoutMut.isPending ||
              (state.step === 3 &&
                planKennelId != null &&
                !billingAccessQuery.isError &&
                (billingAccessQuery.isPending || billingAccess === undefined))
            }
            onOwnerStartSubscription={async () => {
              if (planKennelId == null) return;
              const r = await subscriptionCheckoutMut.mutateAsync({
                kennelId: planKennelId,
                origin: typeof window !== "undefined" ? window.location.origin : "",
              });
              if (r.url) window.location.href = r.url;
            }}
            onOwnerSkipTrial={() => {
              if (planKennelId == null) return;
              startTrialMut.mutate({ kennelId: planKennelId });
            }}
            allKennels={allKennels}
            linkedKennels={linkedKennels}
            updateData={updateData}
            linkToKennel={linkToKennel}
            toggleFavorite={toggleFavorite}
            createDog={createDog}
            onAdvance={next}
          />
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={back} disabled={state.step === 0}>Back</Button>
            {state.step < steps.length - 1 ? (
              <div className="flex flex-wrap gap-2 justify-end items-center">
                {role === "owner" && state.step === 3 ? (
                  billingAccessQuery.isError ? (
                    <span className="text-xs text-destructive max-w-xs text-right">
                      {billingAccessQuery.error?.message ?? "Plan check failed"}
                    </span>
                  ) : planKennelId != null &&
                    !billingAccessQuery.isError &&
                    (billingAccessQuery.isPending || billingAccess === undefined) ? (
                    <span className="text-xs text-slate-500">Checking plan…</span>
                  ) : billingAccess?.hasAccess || billingAccess?.enforced === false ? (
                    <Button onClick={next}>Continue</Button>
                  ) : (
                    <p className="text-xs text-slate-500 max-w-xs text-right">
                      Subscribe or start your free trial on this step, then tap Continue.
                    </p>
                  )
                ) : (
                  <>
                    <Button variant="ghost" onClick={next}>Skip for now</Button>
                    <Button onClick={handleContinue} disabled={updateDog.isPending}>
                      {updateDog.isPending ? "Saving..." : "Continue"}
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <Button onClick={() => void finish()} disabled={completeOnboardingMut.isPending}>
                {completeOnboardingMut.isPending ? "Saving…" : "Go to dashboard"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OnboardingStep(props: {
  role: AppRole;
  step: number;
  data: Record<string, unknown>;
  email: string;
  kennelId: number | null;
  ownerPlanKennelId: number | null;
  ownerPlanKennelListLoading: boolean;
  ownerPlanBillingError: string | null;
  ownerPlanBillingAccess:
    | {
        enforced: boolean;
        hasAccess: boolean;
        stripeConfigured: boolean;
        subscriptionPriceConfigured: boolean;
      }
    | undefined;
  ownerPlanLoading: boolean;
  onOwnerStartSubscription: () => Promise<void>;
  onOwnerSkipTrial: () => void;
  allKennels: { id: number; name: string }[];
  linkedKennels: { id: number; name: string; isFavorite?: boolean }[];
  updateData: (patch: Record<string, unknown>) => void;
  linkToKennel: (kennelId: number) => Promise<void>;
  toggleFavorite: (kennelId: number) => Promise<void>;
  createDog: any;
  onAdvance: () => void;
}) {
  const {
    role,
    step,
    data,
    email,
    kennelId,
    ownerPlanKennelId,
    ownerPlanKennelListLoading,
    ownerPlanBillingError,
    ownerPlanBillingAccess,
    ownerPlanLoading,
    onOwnerStartSubscription,
    onOwnerSkipTrial,
    allKennels,
    linkedKennels,
    updateData,
    linkToKennel,
    toggleFavorite,
    createDog,
    onAdvance,
  } = props;
  const [selectedKennelId, setSelectedKennelId] = useState<string>("");
  const [kennelSearch, setKennelSearch] = useState("");
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationState, setLocationState] = useState<"idle" | "requesting" | "granted" | "denied" | "error">(
    () => (String(data.locationPermission || "") === "granted" ? "granted" : "idle"),
  );
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number } | null>(() => {
    const lat = Number(data.locationLatitude);
    const lng = Number(data.locationLongitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { latitude: lat, longitude: lng };
    }
    return null;
  });
  const [, setLocation] = useLocation();
  const nearbyKennelsQuery = trpc.kennel.nearby.useQuery(
    {
      latitude: locationCoords?.latitude ?? 0,
      longitude: locationCoords?.longitude ?? 0,
      limit: 8,
    },
    { enabled: Boolean(locationCoords) },
  );
  const filteredKennels = useMemo(() => {
    const q = kennelSearch.trim().toLowerCase();
    if (!q) return allKennels;
    return allKennels.filter((k) => k.name.toLowerCase().includes(q));
  }, [allKennels, kennelSearch]);

  const openKennelProfile = () => {
    const targetRoute = "/kennel";
    console.log("[Onboarding] Open Kennel Profile clicked", {
      clicked: true,
      targetRoute,
      kennelId,
    });
    setLocation(targetRoute);
  };

  const content = useMemo(() => {
    if (step === 0) {
      return <p className="text-sm text-slate-700">Welcome. This setup will help tailor the app to your {role} workflow.</p>;
    }

    if (step === 1) {
      if (role === "customer") {
        return (
          <div className="space-y-2">
            <p className="text-sm text-slate-700">
              Your basic profile was saved when you created your account.
            </p>
            <p className="text-xs text-slate-500">
              You can update your name or phone anytime from Settings &gt; Account Details.
            </p>
          </div>
        );
      }
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Full name</Label>
            <Input value={String(data.fullName || "")} onChange={(e) => updateData({ fullName: e.target.value })} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={String(data.phone || "")} onChange={(e) => updateData({ phone: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Email</Label>
            <Input value={String(data.email || email)} onChange={(e) => updateData({ email: e.target.value })} />
          </div>
        </div>
      );
    }

    if (role === "customer" && step === 2) {
      const nearby = nearbyKennelsQuery.data ?? [];
      return (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Link to a kennel by name, or find nearby kennels with location.</p>
          <div className="flex flex-wrap gap-2">
            <AlertDialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline">Find kennels near me</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Allow location access?</AlertDialogTitle>
                  <AlertDialogDescription>
                    We use your location to show kennels near you. You can skip this and continue onboarding.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    disabled={locationState === "requesting" || nearbyKennelsQuery.isFetching}
                    onClick={() => {
                      setLocationState("denied");
                      updateData({ locationPermission: "skipped" });
                    }}
                  >
                    Not now
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={locationState === "requesting" || nearbyKennelsQuery.isFetching}
                    onClick={async (e) => {
                      e.preventDefault();
                      setLocationState("requesting");
                      try {
                        const loc = await getCurrentDeviceLocation();
                        setLocationCoords({ latitude: loc.latitude, longitude: loc.longitude });
                        updateData({
                          locationPermission: "granted",
                          locationLatitude: loc.latitude,
                          locationLongitude: loc.longitude,
                          locationAccuracy: loc.accuracy,
                        });
                        setLocationState("granted");
                        setLocationDialogOpen(false);
                        toast.success("Location enabled");
                      } catch (err: any) {
                        const msg = String(err?.message || "").toLowerCase();
                        const denied = msg.includes("denied") || msg.includes("permission");
                        setLocationState(denied ? "denied" : "error");
                        updateData({ locationPermission: denied ? "denied" : "error" });
                        toast.error(
                          denied ? "Location permission denied. You can continue without it." : "Could not get location",
                        );
                      }
                    }}
                  >
                    {locationState === "requesting" || nearbyKennelsQuery.isFetching ? "Finding..." : "Allow location"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setLocationState("denied");
                updateData({ locationPermission: "skipped" });
              }}
            >
              Skip for now
            </Button>
          </div>
          {nearby.length > 0 ? (
            <div className="space-y-2 rounded-lg border bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Nearby kennels</p>
              <div className="space-y-2">
                {nearby.map((k) => (
                  <button
                    type="button"
                    key={k.id}
                    className="w-full rounded-md border bg-white px-3 py-2 text-left transition hover:border-primary/40"
                    onClick={() => setSelectedKennelId(String(k.id))}
                  >
                    <p className="text-sm font-medium text-slate-900">{k.name}</p>
                    <p className="text-xs text-slate-500">
                      {[k.city, k.state].filter(Boolean).join(", ") || k.address || "Address coming soon"}
                      {typeof k.distanceMiles === "number" ? ` • ${k.distanceMiles} mi` : ""}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Link kennel by name</Label>
            <Input
              value={kennelSearch}
              onChange={(e) => setKennelSearch(e.target.value)}
              placeholder="Search kennel name"
            />
          </div>
          <Select value={selectedKennelId} onValueChange={setSelectedKennelId}>
            <SelectTrigger><SelectValue placeholder="Choose kennel" /></SelectTrigger>
            <SelectContent>
              {filteredKennels.map((k) => <SelectItem key={k.id} value={String(k.id)}>{k.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={async () => {
                const id = Number(selectedKennelId);
                if (!id) {
                  toast.error("Select a kennel first");
                  return;
                }
                try {
                  await linkToKennel(id);
                  updateData({ selectedKennelId: id });
                  toast.success("Kennel linked");
                } catch (err: any) {
                  toast.error(err?.message || "Failed to link kennel");
                }
              }}
            >
              Link kennel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                const id = Number(selectedKennelId);
                if (!id) {
                  toast.error("Select a kennel first");
                  return;
                }
                try {
                  await toggleFavorite(id);
                  updateData({ favoriteKennelId: id });
                  toast.success("Favorite updated");
                } catch (err: any) {
                  toast.error(err?.message || "Failed to update favorite");
                }
              }}
            >
              Set favorite
            </Button>
          </div>
          {linkedKennels.length ? (
            <p className="text-xs text-slate-500">Linked: {linkedKennels.map((k) => k.name).join(", ")}</p>
          ) : null}
        </div>
      );
    }

    if (role === "customer" && step === 3) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Add your first dog now, or skip and do it later.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Name</Label><Input value={String(data.dogName || "")} onChange={(e) => updateData({ dogName: e.target.value })} /></div>
            <div><Label>Breed</Label><Input value={String(data.dogBreed || "")} onChange={(e) => updateData({ dogBreed: e.target.value })} /></div>
            <div><Label>Age</Label><Input type="number" value={String(data.dogAge || "")} onChange={(e) => updateData({ dogAge: e.target.value })} /></div>
            <div><Label>Weight</Label><Input type="number" value={String(data.dogWeight || "")} onChange={(e) => updateData({ dogWeight: e.target.value })} /></div>
            <div><Label>Birthday</Label><Input type="date" value={String(data.dogBirthday || "")} onChange={(e) => updateData({ dogBirthday: e.target.value })} /></div>
            <div>
              <Label>Sex</Label>
              <Select value={(data.dogSex as string | undefined) || undefined} onValueChange={(v) => updateData({ dogSex: v })}>
                <SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Spayed / Neutered</Label>
              <Select value={typeof data.dogSpayedNeutered === "boolean" ? String(data.dogSpayedNeutered) : undefined} onValueChange={(v) => updateData({ dogSpayedNeutered: v === "true" })}>
                <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            type="button"
            disabled={createDog.isPending}
            onClick={async () => {
              const name = String(data.dogName || "").trim();
              if (!name) {
                toast.error("Dog name is required");
                return;
              }
              try {
                const created = await createDog.mutateAsync({
                  name,
                  breed: String(data.dogBreed || "") || undefined,
                  age: data.dogAge ? Number(data.dogAge) : undefined,
                  weight: data.dogWeight ? Number(data.dogWeight) : undefined,
                  birthday: String(data.dogBirthday || "") || undefined,
                  sex: (data.dogSex as "male" | "female" | undefined) || undefined,
                  isSpayedNeutered: Boolean(data.dogSpayedNeutered),
                });
                updateData({ createdDogId: created.id, dogCreated: true });
                toast.success("Dog created successfully");
                onAdvance();
              } catch (err: any) {
                toast.error(err?.message || "Failed to create dog");
              }
            }}
          >
            {createDog.isPending ? "Creating..." : "Create Dog"}
          </Button>
          {Number(data.createdDogId || 0) > 0 ? (
            <p className="text-xs text-emerald-700">Dog saved (ID: {String(data.createdDogId)}). You can continue.</p>
          ) : null}
        </div>
      );
    }

    if (role === "customer" && step === 4) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Record important care details. You can edit these later in dog profiles.</p>
          <Label>Feeding instructions</Label>
          <Input value={String(data.feeding || "")} onChange={(e) => updateData({ feeding: e.target.value })} />
          <Label>Medications</Label>
          <Input value={String(data.meds || "")} onChange={(e) => updateData({ meds: e.target.value })} />
          <Label>Behavior / care notes</Label>
          <Input value={String(data.behavior || "")} onChange={(e) => updateData({ behavior: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Emergency contact name</Label>
              <Input value={String(data.emergencyName || "")} onChange={(e) => updateData({ emergencyName: e.target.value })} />
            </div>
            <div>
              <Label>Emergency contact phone</Label>
              <Input value={String(data.emergencyPhone || "")} onChange={(e) => updateData({ emergencyPhone: e.target.value })} />
            </div>
            <div>
              <Label>Vet name</Label>
              <Input value={String(data.vetName || "")} onChange={(e) => updateData({ vetName: e.target.value })} />
            </div>
            <div>
              <Label>Vet phone</Label>
              <Input value={String(data.vetPhone || "")} onChange={(e) => updateData({ vetPhone: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-slate-500">Vaccination upload can be completed from your dog profile anytime.</p>
        </div>
      );
    }

    if (role === "employee" && step === 2) {
      return (
        <div className="space-y-2">
          <p className="text-sm text-slate-700">Confirm kennel association before operational tasks.</p>
          <p className="text-sm">Current kennel: <span className="font-medium">{kennelId ? `#${kennelId}` : "Not linked yet"}</span></p>
        </div>
      );
    }

    if (role === "employee" && (step === 3 || step === 4)) {
      return (
        <div className="space-y-2 text-sm text-slate-700">
          <p>Core tools: Dashboard, Today, Check-In/Out, Rooms, Dogs.</p>
          <p>Optional walkthroughs: room assignment, vaccine warning flows, and alert handling.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/today")}>Open Today</Button>
            <Button variant="outline" onClick={() => setLocation("/checkin")}>Open Check-In/Out</Button>
          </div>
        </div>
      );
    }

    if (role === "owner" && step === 2) {
      return (
        <div className="space-y-2 text-sm text-slate-700">
          <p>Set up kennel profile details: name, address, phone, email, and bio.</p>
          <Button variant="outline" onClick={openKennelProfile}>Open Kennel Profile</Button>
        </div>
      );
    }

    if (role === "owner" && step === 3) {
      if (ownerPlanKennelListLoading) {
        return (
          <div className="space-y-3 text-sm text-slate-700">
            <p className="text-slate-500">Loading your kennel…</p>
          </div>
        );
      }
      if (ownerPlanKennelId == null) {
        return (
          <div className="space-y-3 text-sm text-slate-700">
            <p className="text-amber-800">Create your kennel first, then come back to choose a plan.</p>
            <Button variant="outline" onClick={openKennelProfile}>Open Kennel Profile</Button>
          </div>
        );
      }
      const access = ownerPlanBillingAccess;
      const billingEnforced = access?.enforced !== false;
      const canCheckout = Boolean(access?.stripeConfigured && access?.subscriptionPriceConfigured);

      if (access && !access.enforced) {
        return (
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              Owner subscription billing is not enforced in this environment (Stripe owner gate is off). You can continue
              without checkout.
            </p>
            <p className="text-xs text-slate-500">
              To match production behavior locally, set <code className="rounded bg-slate-100 px-1">STRIPE_SECRET_KEY</code> and{" "}
              <code className="rounded bg-slate-100 px-1">STRIPE_OWNER_SUBSCRIPTION_PRICE_ID</code>. To keep billing optional for
              demo/screenshots, leave <code className="rounded bg-slate-100 px-1">STRIPE_SECRET_KEY</code> unset or set{" "}
              <code className="rounded bg-slate-100 px-1">OWNER_SUBSCRIPTION_ENFORCE=off</code>.
            </p>
          </div>
        );
      }

      return (
        <div className="space-y-4 text-sm text-slate-700">
          {ownerPlanBillingError ? (
            <p className="text-sm text-destructive">{ownerPlanBillingError}</p>
          ) : null}
          <p>Start your kennel with a free trial or subscribe now.</p>
          {billingEnforced && !canCheckout ? (
            <p className="text-xs text-amber-800 rounded-md border border-amber-200 bg-amber-50 p-2">
              Subscription checkout is not available: configure{" "}
              <code className="rounded bg-amber-100 px-1">STRIPE_OWNER_SUBSCRIPTION_PRICE_ID</code> on the server, or use
              &quot;Skip for now&quot; to start a trial. If trial start fails, add{" "}
              <code className="rounded bg-amber-100 px-1">trial_ends_at</code> to <code className="rounded bg-amber-100 px-1">kennels</code>{" "}
              (see <code className="rounded bg-amber-100 px-1">MIGRATION_R30_kennel_stripe_subscription.sql</code>).
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              disabled={ownerPlanLoading || !canCheckout}
              onClick={() => void onOwnerStartSubscription()}
            >
              Start Subscription
            </Button>
            <Button type="button" variant="outline" disabled={ownerPlanLoading} onClick={onOwnerSkipTrial}>
              Skip for now
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            &quot;Skip for now&quot; starts a 7-day trial. You can upgrade anytime from the dashboard or Settings.
          </p>
        </div>
      );
    }

    if (role === "owner" && step === 4) {
      return (
        <div className="space-y-2 text-sm text-slate-700">
          <p>Next, configure services and room layout/buildings.</p>
          <Button variant="outline" onClick={() => setLocation("/rooms")}>Open Rooms</Button>
        </div>
      );
    }

    if (role === "owner" && step === 5) {
      return (
        <div className="space-y-2 text-sm text-slate-700">
          <p>Set business hours and required vaccines, then review key tools.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/settings")}>Open Settings</Button>
            <Button variant="outline" onClick={() => setLocation("/reports")}>Open Reports</Button>
          </div>
        </div>
      );
    }

    return <p className="text-sm text-slate-700">You are all set. Complete onboarding to continue to your dashboard.</p>;
  }, [
    step,
    role,
    data,
    email,
    kennelId,
    ownerPlanKennelId,
    ownerPlanKennelListLoading,
    ownerPlanBillingError,
    ownerPlanBillingAccess,
    ownerPlanLoading,
    onOwnerStartSubscription,
    onOwnerSkipTrial,
    allKennels,
    linkedKennels,
    selectedKennelId,
    setLocation,
    openKennelProfile,
    updateData,
    linkToKennel,
    toggleFavorite,
    createDog,
    onAdvance,
  ]);

  return content;
}
