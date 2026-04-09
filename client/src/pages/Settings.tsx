import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { useKennel } from "@/contexts/KennelContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, User, Shield, Bell, LogOut, Building2, Star, Link2, Unlink, Check,
  Phone, Mail, Clock, MessageCircle, DollarSign, Dog, Users, BarChart3, Edit2, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import { formatDate, toDateString } from "@/lib/dateUtils";
import { FinancialsPanel } from "@/pages/Financials";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FileUpload from "@/components/FileUpload";
import { BADGE_ICON_OPTIONS, BadgeIconGlyph } from "@/lib/dogBadgeIcons";
import { DogBadgesInline } from "@/components/DogBadgesInline";
import {
  reqVaccineLabel,
  vaxMeetsRequired,
  vaxName,
  vaxExpires,
  vaxDateGiven,
  vaxDocUrl,
} from "@/lib/vaccinationUtils";
import { OwnerSubscriptionSettingsCard } from "@/components/OwnerSubscriptionPromo";

export default function Settings() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const {
    activeKennelId,
    setActiveKennelId,
    linkedKennels,
    allKennels,
    linkToKennel,
    unlinkFromKennel,
    toggleFavorite,
  } = useKennel();

  const [contactKennelId, setContactKennelId] = useState<number | null>(null);
  const [financialsOpen, setFinancialsOpen] = useState(false);
  const [ownersPetsOpen, setOwnersPetsOpen] = useState(false);
  const [badgeSettingsOpen, setBadgeSettingsOpen] = useState(false);

  const [loc] = useLocation();
  useEffect(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    const tab = new URLSearchParams(search).get("tab");
    if (tab === "financials" && user?.role === "owner") {
      setFinancialsOpen(true);
    }
    if (tab === "owners-pets" && user?.role === "owner") {
      setOwnersPetsOpen(true);
    }
  }, [loc, user?.role]);

  const openFinancials = () => {
    setFinancialsOpen(true);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "financials");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  };

  const closeFinancials = () => {
    setFinancialsOpen(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("tab");
      window.history.replaceState({}, "", url.pathname + (url.search || ""));
    }
  };

  const openOwnersPets = () => {
    setOwnersPetsOpen(true);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "owners-pets");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  };

  const closeOwnersPets = () => {
    setOwnersPetsOpen(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("tab");
      window.history.replaceState({}, "", url.pathname + (url.search || ""));
    }
  };

  // Fetch kennel details when contact dialog is opened
  const { data: contactKennel } = trpc.kennel.getById.useQuery(
    { id: contactKennelId! },
    { enabled: !!contactKennelId }
  );

  // Fetch per-day business hours for the contact dialog
  const { data: kennelHours } = trpc.businessHours.getByKennel.useQuery(
    { kennelId: contactKennelId! },
    { enabled: !!contactKennelId }
  );

  const unlinkedKennels = allKennels.filter(
    k => !linkedKennels.some(lk => lk.id === k.id)
  );

  const sortedLinked = [...linkedKennels].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return a.name.localeCompare(b.name);
  });

  const formatTime = (time: string | null | undefined) => {
    if (!time) return null;
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

  const isCustomer = user?.role === "customer";
  const isOwner = user?.role === "owner";

  const settingsBody = (
    <>
      {/* Profile Card */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{user?.name || "User"}</p>
              <p className="text-xs text-muted-foreground">{user?.email || "No email"}</p>
              <p className="text-[10px] text-primary font-medium capitalize mt-0.5">{user?.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kennel Selection */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
          Kennel
        </h2>

        {/* My Kennels */}
        {sortedLinked.length > 0 && (
          <Card className="border-0 shadow-sm bg-white mb-2">
            <CardContent className="p-0">
              <div className="px-4 py-2.5 border-b">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Kennels</p>
              </div>
              {sortedLinked.map((kennel, idx) => (
                <div key={kennel.id}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      kennel.id === activeKennelId ? "bg-primary/5" : "hover:bg-muted/50"
                    } ${idx < sortedLinked.length - 1 || isCustomer ? "border-b border-muted/50" : ""}`}
                  >
                    <button
                      onClick={() => setActiveKennelId(kennel.id)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        kennel.id === activeKennelId ? "bg-primary/10" : "bg-muted"
                      }`}>
                        <Building2 className={`h-4.5 w-4.5 ${
                          kennel.id === activeKennelId ? "text-primary" : "text-muted-foreground"
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm truncate ${
                          kennel.id === activeKennelId ? "font-semibold text-primary" : "font-medium"
                        }`}>
                          {kennel.name}
                        </p>
                        {kennel.id === activeKennelId && (
                          <p className="text-[10px] text-primary font-medium">Active</p>
                        )}
                      </div>
                      {kennel.id === activeKennelId && (
                        <Check className="h-4 w-4 text-primary shrink-0 ml-auto" />
                      )}
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={async () => {
                          await toggleFavorite(kennel.id);
                        }}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title={kennel.isFavorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Star className={`h-4 w-4 ${
                          kennel.isFavorite ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
                        }`} />
                      </button>
                      <button
                        onClick={async () => {
                          await unlinkFromKennel(kennel.id);
                          toast.success(`Unlinked from ${kennel.name}`);
                        }}
                        className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Unlink from kennel"
                      >
                        <Unlink className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                  {/* Contact Kennel button for customers */}
                  {isCustomer && (
                    <div className="px-4 py-2 border-b border-muted/50 last:border-b-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-9 text-xs gap-2 text-primary border-primary/20 hover:bg-primary/5"
                        onClick={() => setContactKennelId(kennel.id)}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Contact Kennel
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Available Kennels */}
        {unlinkedKennels.length > 0 && (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-0">
              <div className="px-4 py-2.5 border-b">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available Kennels</p>
              </div>
              {unlinkedKennels.map((kennel, idx) => (
                <div
                  key={kennel.id}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${
                    idx < unlinkedKennels.length - 1 ? "border-b border-muted/50" : ""
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Building2 className="h-4.5 w-4.5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium flex-1 truncate">{kennel.name}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={async () => {
                      await linkToKennel(kennel.id);
                      toast.success(`Linked to ${kennel.name}`);
                    }}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Link
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {sortedLinked.length === 0 && unlinkedKennels.length === 0 && (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No kennels available yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Settings Items */}
      <div className="space-y-2">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-0">
            <button className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors rounded-lg">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Account & Security</p>
                <p className="text-xs text-muted-foreground">Manage your account settings</p>
              </div>
            </button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-0">
            <button className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors rounded-lg">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Notifications</p>
                <p className="text-xs text-muted-foreground">Configure notification preferences</p>
              </div>
            </button>
          </CardContent>
        </Card>

        {isOwner && (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-0">
              <button
                type="button"
                onClick={() => setBadgeSettingsOpen(true)}
                className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
              >
                <Dog className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Dog Badges</p>
                  <p className="text-xs text-muted-foreground">Create operational dog icons and meanings</p>
                </div>
              </button>
            </CardContent>
          </Card>
        )}

        {isOwner && (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-0">
              <button
                type="button"
                onClick={openFinancials}
                className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
              >
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Financials</p>
                  <p className="text-xs text-muted-foreground">Payments, revenue, and recent activity</p>
                </div>
              </button>
            </CardContent>
          </Card>
        )}

        {isOwner && activeKennelId != null && <OwnerSubscriptionSettingsCard kennelId={activeKennelId} />}

        {isOwner && (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-0">
              <button
                type="button"
                onClick={() => setLocation("/reports")}
                className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
              >
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Reports</p>
                  <p className="text-xs text-muted-foreground">Operational, vaccine, and financial reports</p>
                </div>
              </button>
            </CardContent>
          </Card>
        )}

        {isOwner && (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-0">
              <button
                type="button"
                onClick={openOwnersPets}
                className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
              >
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">All Owners and Pets</p>
                  <p className="text-xs text-muted-foreground">Search owners/customers and pets in one place</p>
                </div>
              </button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sign Out */}
      <Button
        variant="outline"
        className="w-full h-12 text-destructive border-destructive/30 hover:bg-destructive/5 font-semibold gap-2"
        onClick={() => logout()}
      >
        <LogOut className="h-4 w-4" /> Sign Out
      </Button>
    </>
  );

  return (
    <div className="p-4 space-y-4">
      {isOwner && financialsOpen ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={closeFinancials}
              className="p-1.5 rounded-lg hover:bg-muted"
              aria-label="Back to settings"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">Financials</h1>
          </div>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <FinancialsPanel />
            </CardContent>
          </Card>
          <Button
            variant="outline"
            className="w-full h-12 text-destructive border-destructive/30 hover:bg-destructive/5 font-semibold gap-2"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      ) : isOwner && ownersPetsOpen ? (
        <OwnersPetsDirectory kennelId={activeKennelId} onBack={closeOwnersPets} />
      ) : isOwner && badgeSettingsOpen ? (
        <DogBadgeSettings kennelId={activeKennelId} onBack={() => setBadgeSettingsOpen(false)} />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/")} className="p-1.5 rounded-lg hover:bg-muted">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">Settings</h1>
          </div>
          <div className="space-y-4">{settingsBody}</div>
        </>
      )}

      {/* Contact Kennel Dialog */}
      <Dialog open={!!contactKennelId} onOpenChange={(open) => !open && setContactKennelId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {contactKennel?.name || "Kennel"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Phone */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</p>
                {contactKennel?.phone ? (
                  <a
                    href={`tel:${contactKennel.phone}`}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    {contactKennel.phone}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Not provided</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p>
                {contactKennel?.email ? (
                  <a
                    href={`mailto:${contactKennel.email}`}
                    className="text-sm font-semibold text-blue-600 hover:underline break-all"
                  >
                    {contactKennel.email}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Not provided</p>
                )}
              </div>
            </div>

            {/* Business Hours */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Business Hours</p>
                {kennelHours && kennelHours.length > 0 ? (
                  <div className="space-y-1">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => {
                      const entry = kennelHours.find(h => h.dayOfWeek === i);
                      const isClosed = entry?.isClosed ?? true;
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="font-medium w-8">{day}</span>
                          {isClosed ? (
                            <span className="text-muted-foreground italic">Closed</span>
                          ) : (
                            <span className="font-semibold">
                              {formatTime(entry?.openTime)} – {formatTime(entry?.closeTime)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Not provided</p>
                )}
              </div>
            </div>

            {/* Address */}
            {contactKennel?.address && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</p>
                  <p className="text-sm font-semibold">
                    {contactKennel.address}
                    {contactKennel.city && `, ${contactKennel.city}`}
                    {contactKennel.state && `, ${contactKennel.state}`}
                    {contactKennel.zip && ` ${contactKennel.zip}`}
                  </p>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {contactKennel?.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 gap-2 text-xs"
                  onClick={() => window.open(`tel:${contactKennel.phone}`, '_self')}
                >
                  <Phone className="h-3.5 w-3.5" />
                  Call
                </Button>
              )}
              {contactKennel?.email && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 gap-2 text-xs"
                  onClick={() => window.open(`mailto:${contactKennel.email}`, '_blank')}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DogBadgeSettings({ kennelId, onBack }: { kennelId: number | null; onBack: () => void }) {
  const [iconId, setIconId] = useState("paw");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const utils = trpc.useUtils();
  const { data: badges, isLoading } = trpc.dogBadge.listByKennel.useQuery(
    { kennelId: kennelId! },
    { enabled: !!kennelId },
  );
  const createBadge = trpc.dogBadge.create.useMutation({
    onSuccess: () => {
      utils.dogBadge.listByKennel.invalidate();
      setIconId("paw");
      setName("");
      setDescription("");
      toast.success("Badge saved");
    },
    onError: (e) => toast.error(e.message || "Could not save badge"),
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Dog Badges</h1>
      </div>
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground">Visible to owner and employee only in operational views.</p>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Badge name" />
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Meaning / explanation" />
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Icon</Label>
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5">
              {BADGE_ICON_OPTIONS.map(({ id, label, Icon }) => {
                const selected = iconId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    title={label}
                    onClick={() => setIconId(id)}
                    className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border p-2 transition-colors ${
                      selected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:bg-muted/60"
                    }`}
                  >
                    <Icon className="h-5 w-5 text-emerald-700" aria-hidden />
                    <span className="text-[9px] text-muted-foreground leading-tight text-center line-clamp-2">{label.split(" / ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <Button
            className="w-full"
            disabled={!kennelId || !name.trim() || !description.trim() || createBadge.isPending}
            onClick={() =>
              createBadge.mutate({
                kennelId: kennelId!,
                name: name.trim(),
                description: description.trim(),
                iconId,
              })
            }
          >
            {createBadge.isPending ? "Saving..." : "Save Badge"}
          </Button>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active badges</p>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (badges || []).map((b: any) => (
            <div key={`${b.key}-${b.id}`} className="rounded border p-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <BadgeIconGlyph icon={b.icon} className="h-4 w-4 shrink-0" />
                {b.name}
              </p>
              <p className="text-xs text-muted-foreground">{b.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function OwnersPetsDirectory({ kennelId, onBack }: { kennelId: number | null; onBack: () => void }) {
  const [view, setView] = useState<"owners" | "pets">("owners");
  const [query, setQuery] = useState("");
  const [expandedOwner, setExpandedOwner] = useState<string | null>(null);
  const [expandedPet, setExpandedPet] = useState<number | null>(null);
  const [ownerDialog, setOwnerDialog] = useState<any | null>(null);
  const [petDialog, setPetDialog] = useState<any | null>(null);
  const [oName, setOName] = useState("");
  const [oEmail, setOEmail] = useState("");
  const [oPhone, setOPhone] = useState("");
  const [oCity, setOCity] = useState("");
  const [oState, setOState] = useState("");
  const [oZip, setOZip] = useState("");
  const [dName, setDName] = useState("");
  const [dBreed, setDBreed] = useState("");
  const [dWeight, setDWeight] = useState("");
  const [dBirthday, setDBirthday] = useState("");
  const [dEmergName, setDEmergName] = useState("");
  const [dEmergPhone, setDEmergPhone] = useState("");
  const [dSpecial, setDSpecial] = useState("");
  const [vaxForm, setVaxForm] = useState({
    vaccineName: "",
    dateAdministered: "",
    expirationDate: "",
    status: "current" as string,
    documentUrl: "",
  });
  const [useCustomVax, setUseCustomVax] = useState(false);
  const [customVaxName, setCustomVaxName] = useState("");
  const [badgeKeysSel, setBadgeKeysSel] = useState<Set<string>>(new Set());
  const { data: myKennels, isLoading: kennelsLoading } = trpc.kennel.myKennels.useQuery();
  const resolvedKennelId = kennelId ?? myKennels?.[0]?.id ?? null;
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.report.ownerDirectory.useQuery(
    { kennelId: resolvedKennelId! },
    { enabled: !!resolvedKennelId },
  );
  const { data: editDog } = trpc.dog.getById.useQuery(
    { id: petDialog?.dogId ?? 0 },
    { enabled: !!petDialog?.dogId },
  );
  const { data: editVax } = trpc.vaccination.byDog.useQuery(
    { dogId: petDialog?.dogId ?? 0 },
    { enabled: !!petDialog?.dogId },
  );
  const { data: badgeCatalog } = trpc.dogBadge.listByKennel.useQuery(
    { kennelId: resolvedKennelId! },
    { enabled: !!resolvedKennelId },
  );
  const { data: requiredVaccinesEdit } = trpc.requiredVaccine.byKennel.useQuery(
    { kennelId: resolvedKennelId! },
    { enabled: !!resolvedKennelId && !!petDialog },
  );
  const badgeByKey = useMemo(
    () => new Map(((badgeCatalog || []) as any[]).map((b: any) => [String(b.key || "").toLowerCase(), b])),
    [badgeCatalog],
  );
  const { data: badgeAssignPet } = trpc.dogBadge.assignedForDogs.useQuery(
    { kennelId: resolvedKennelId!, dogIds: petDialog ? [petDialog.dogId] : [] },
    { enabled: !!resolvedKennelId && !!petDialog },
  );
  const updateDirectoryCustomer = trpc.report.updateDirectoryCustomer.useMutation({
    onSuccess: () => {
      toast.success("Owner saved");
      utils.report.ownerDirectory.invalidate();
      setOwnerDialog(null);
    },
    onError: (e) => toast.error(e.message || "Could not save owner"),
  });
  const updateDirectoryDog = trpc.report.updateDirectoryDog.useMutation({
    onError: (e) => toast.error(e.message || "Could not save dog"),
  });
  const assignBadges = trpc.dogBadge.assignToDog.useMutation({
    onError: (e) => toast.error(e.message || "Dog saved but badges failed to update"),
  });
  const createVax = trpc.vaccination.create.useMutation({
    onSuccess: () => {
      toast.success("Vaccination added");
      const did = petDialog?.dogId ?? 0;
      utils.vaccination.byDog.invalidate({ dogId: did });
      utils.report.ownerDirectory.invalidate();
      setVaxForm({
        vaccineName: "",
        dateAdministered: "",
        expirationDate: "",
        status: "current",
        documentUrl: "",
      });
      setUseCustomVax(false);
      setCustomVaxName("");
    },
    onError: (e) => toast.error(e.message || "Could not add vaccination"),
  });
  const hasSearch = query.trim().length > 0;

  useEffect(() => {
    if (!ownerDialog) return;
    setOName(String(ownerDialog.name || ""));
    setOEmail(String(ownerDialog.email || ""));
    setOPhone(String(ownerDialog.phone || ""));
    setOCity(String(ownerDialog.city || ""));
    setOState(String(ownerDialog.state || ""));
    setOZip(String(ownerDialog.zip || ""));
  }, [ownerDialog]);

  useEffect(() => {
    if (!editDog || !petDialog) return;
    setDName(editDog.name || "");
    setDBreed(editDog.breed || "");
    setDWeight(editDog.weight != null ? String(editDog.weight) : "");
    setDBirthday(editDog.birthday ? toDateString(editDog.birthday) : "");
    setDEmergName(editDog.emergencyContactName || "");
    setDEmergPhone(editDog.emergencyContactPhone || "");
    setDSpecial(editDog.specialNeeds || "");
  }, [editDog, petDialog]);

  useEffect(() => {
    if (!petDialog || !badgeAssignPet) return;
    const keys = ((badgeAssignPet as any)?.[String(petDialog.dogId)] || []).map((k: string) => String(k).toLowerCase());
    setBadgeKeysSel(new Set(keys));
  }, [petDialog, badgeAssignPet]);

  useEffect(() => {
    if (!petDialog) {
      setVaxForm({
        vaccineName: "",
        dateAdministered: "",
        expirationDate: "",
        status: "current",
        documentUrl: "",
      });
      setUseCustomVax(false);
      setCustomVaxName("");
    }
  }, [petDialog]);

  const owners = useMemo(() => {
    const list = [...(data?.owners || [])].sort((a: any, b: any) =>
      String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" }),
    );
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((o: any) =>
      String(o.name || "").toLowerCase().includes(q) ||
      String(o.email || "").toLowerCase().includes(q) ||
      String(o.phone || "").toLowerCase().includes(q),
    );
  }, [data?.owners, query]);

  const pets = useMemo(() => {
    const list = [...(data?.pets || [])].sort((a: any, b: any) =>
      String(a.dogName || "").localeCompare(String(b.dogName || ""), undefined, { sensitivity: "base" }),
    );
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p: any) =>
      String(p.dogName || "").toLowerCase().includes(q) ||
      String(p.ownerName || "").toLowerCase().includes(q),
    );
  }, [data?.pets, query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted" aria-label="Back to settings">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">All Owners and Pets</h1>
      </div>

      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={view === "owners" ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => setView("owners")}
            >
              Owners
            </Button>
            <Button
              size="sm"
              variant={view === "pets" ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => setView("pets")}
            >
              Pets
            </Button>
          </div>
          <Input
            placeholder={view === "owners" ? "Search name, phone, or email" : "Search pet or owner name"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 text-sm"
          />
        </CardContent>
      </Card>

      {isLoading || (kennelsLoading && !resolvedKennelId) ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : !resolvedKennelId ? (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No kennel selected yet.
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            Could not load owners/pets data: {error.message}
          </CardContent>
        </Card>
      ) : view === "owners" ? (
        <div className="space-y-2">
          {owners.map((o: any) => (
            <Card key={o.ownerId} className="border-0 shadow-sm bg-white">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedOwner((prev) => (prev === o.ownerId ? null : o.ownerId))}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{o.name}</p>
                        <p className="text-xs text-muted-foreground">{o.email || "No email"}{o.phone ? ` · ${o.phone}` : ""}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground shrink-0">
                        <p>{o.petCount} pets</p>
                        <p>{o.activeStays} active stays</p>
                      </div>
                    </div>
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 shrink-0"
                    title="Edit owner"
                    onClick={() => setOwnerDialog(o)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {expandedOwner === o.ownerId && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Pets at this kennel
                    </p>
                    {o.pets?.length ? (
                      o.pets.map((p: any) => (
                        <div key={p.dogId} className="text-xs rounded-lg bg-muted/30 px-2 py-2 space-y-1.5 border border-border/60">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{p.dogName}</span>
                            <DogBadgesInline
                              badgeKeys={p.badgeKeys || []}
                              badgeByKey={badgeByKey}
                              max={6}
                            />
                          </div>
                          {p.vaccinations?.length ? (
                            <ul className="text-[10px] text-muted-foreground space-y-0.5 pl-0.5">
                              {p.vaccinations.slice(0, 6).map((v: any, i: number) => (
                                <li key={i}>
                                  {v.vaccineName}
                                  {v.expirationDate ? ` · exp ${formatDate(v.expirationDate)}` : ""}
                                  {v.status ? ` (${v.status})` : ""}
                                </li>
                              ))}
                              {p.vaccinations.length > 6 && (
                                <li className="italic">+{p.vaccinations.length - 6} more…</li>
                              )}
                            </ul>
                          ) : (
                            <p className="text-[10px] text-muted-foreground">No vaccinations on file yet.</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No pets listed for this customer at this kennel yet.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {owners.length === 0 && (
            <Card className="border-dashed border-2 bg-muted/30">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                {hasSearch ? "No owners match this search." : "No owners found for this kennel yet."}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {pets.map((p: any) => (
            <Card key={p.dogId} className="border-0 shadow-sm bg-white">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedPet((prev) => (prev === p.dogId ? null : p.dogId))}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{p.dogName}</p>
                          <DogBadgesInline
                            badgeKeys={p.badgeKeys || []}
                            badgeByKey={badgeByKey}
                            max={5}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.ownerName} · {p.breed || "Breed —"}
                          {p.age != null ? ` · ${p.age}y` : ""}
                        </p>
                      </div>
                      <div className="text-right text-[11px] shrink-0">
                        <p className={p.vaccineStatus === "expired" || p.vaccineStatus === "missing_required" ? "text-red-600 font-medium" : "text-muted-foreground"}>
                          {p.vaccineStatus === "missing_required"
                            ? "Required vaccines missing"
                            : p.vaccineStatus === "expired"
                            ? "Vax expired"
                            : p.vaccineStatus === "on_file"
                            ? "Vax on file"
                            : "No vax data"}
                        </p>
                      </div>
                    </div>
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 shrink-0"
                    title="Edit dog"
                    onClick={() => setPetDialog(p)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {expandedPet === p.dogId && (
                  <div className="mt-3 pt-3 border-t space-y-2 text-xs">
                    <p className="text-muted-foreground">Owner: {p.ownerName}</p>
                    <p className="text-muted-foreground">Email: {p.ownerEmail || "—"}{p.ownerPhone ? ` · Phone: ${p.ownerPhone}` : ""}</p>
                    <p className="text-muted-foreground">
                      Current room: {p.checkedIn ? (p.currentRoomName || "No room assigned") : "Not currently checked in"}
                      {p.currentBuilding ? ` · ${p.currentBuilding}` : ""}
                    </p>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Vaccinations</p>
                      {p.vaccinations?.length ? (
                        <ul className="text-muted-foreground space-y-1">
                          {p.vaccinations.map((v: any, i: number) => (
                            <li key={i}>
                              <span className="font-medium text-foreground">{v.vaccineName}</span>
                              {v.expirationDate ? ` · expires ${formatDate(v.expirationDate)}` : ""}
                              {v.dateAdministered ? ` · given ${formatDate(v.dateAdministered)}` : ""}
                              {v.status ? ` · ${v.status}` : ""}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">None on file — customer can add them from the dog profile.</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {pets.length === 0 && (
            <Card className="border-dashed border-2 bg-muted/30">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                {hasSearch ? "No pets match this search." : "No pets found for this kennel yet."}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={!!ownerDialog} onOpenChange={(o) => !o && setOwnerDialog(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit owner</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input className="h-9 mt-0.5" value={oName} onChange={(e) => setOName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input className="h-9 mt-0.5" type="email" value={oEmail} onChange={(e) => setOEmail(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input className="h-9 mt-0.5" value={oPhone} onChange={(e) => setOPhone(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">City</Label>
                <Input className="h-9 mt-0.5" value={oCity} onChange={(e) => setOCity(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">State</Label>
                <Input className="h-9 mt-0.5" value={oState} onChange={(e) => setOState(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">ZIP</Label>
                <Input className="h-9 mt-0.5" value={oZip} onChange={(e) => setOZip(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setOwnerDialog(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!resolvedKennelId || !ownerDialog || updateDirectoryCustomer.isPending}
              onClick={() => {
                if (!resolvedKennelId || !ownerDialog) return;
                const em = oEmail.trim();
                if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
                  toast.error("Enter a valid email or leave blank");
                  return;
                }
                updateDirectoryCustomer.mutate({
                  kennelId: resolvedKennelId,
                  customerId: ownerDialog.ownerId,
                  name: oName.trim() || undefined,
                  email: em || undefined,
                  phone: oPhone.trim() || null,
                  city: oCity.trim() || null,
                  state: oState.trim() || null,
                  zip: oZip.trim() || null,
                });
              }}
            >
              {updateDirectoryCustomer.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!petDialog} onOpenChange={(o) => !o && setPetDialog(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit dog</DialogTitle>
          </DialogHeader>
          {!editDog ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input className="h-9 mt-0.5" value={dName} onChange={(e) => setDName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Breed</Label>
                  <Input className="h-9 mt-0.5" value={dBreed} onChange={(e) => setDBreed(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Weight (lbs)</Label>
                  <Input className="h-9 mt-0.5" value={dWeight} onChange={(e) => setDWeight(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Birthday</Label>
                  <Input className="h-9 mt-0.5" type="date" value={dBirthday} onChange={(e) => setDBirthday(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Emergency contact</Label>
                <Input className="h-9 mt-0.5" placeholder="Name" value={dEmergName} onChange={(e) => setDEmergName(e.target.value)} />
                <Input className="h-9 mt-1" placeholder="Phone" value={dEmergPhone} onChange={(e) => setDEmergPhone(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Special needs</Label>
                <Textarea className="mt-0.5 text-sm min-h-[60px]" value={dSpecial} onChange={(e) => setDSpecial(e.target.value)} />
              </div>
              <div className="border-t pt-2 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Badges</p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {(badgeCatalog || []).map((b: any) => {
                    const k = String(b.key || "").toLowerCase();
                    const on = badgeKeysSel.has(k);
                    return (
                      <button
                        key={`${b.id}-${k}`}
                        type="button"
                        onClick={() => {
                          setBadgeKeysSel((prev) => {
                            const next = new Set(prev);
                            if (on) next.delete(k);
                            else next.add(k);
                            return next;
                          });
                        }}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${
                          on ? "border-primary bg-primary/10" : "border-border"
                        }`}
                      >
                        <BadgeIconGlyph icon={b.icon} className="h-3 w-3 shrink-0" />
                        {b.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="border-t pt-2 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <Shield className="h-3.5 w-3.5 text-primary" /> Vaccinations
                  </h4>
                </div>
                {requiredVaccinesEdit && requiredVaccinesEdit.length > 0 && (() => {
                  const missing = requiredVaccinesEdit.filter((rv) => {
                    const label = reqVaccineLabel(rv);
                    if (!label) return false;
                    return !(editVax ?? []).some((v: any) => vaxMeetsRequired(v, label));
                  });
                  if (missing.length === 0) return null;
                  return (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-[10px] text-destructive">
                      <span className="font-semibold">Missing required: </span>
                      {missing.map((rv) => reqVaccineLabel(rv)).filter(Boolean).join(", ")}
                    </div>
                  );
                })()}
                {(!editVax || editVax.length === 0) ? (
                  <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20 px-3 py-4 text-center">
                    <Shield className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">No vaccinations on file</p>
                  </div>
                ) : (
                  <ul className="text-xs space-y-2 max-h-36 overflow-y-auto">
                    {(editVax || [])
                      .filter((v: any) => v != null && v.id != null)
                      .map((v: any) => (
                        <li key={v.id} className="rounded-md border bg-card px-2 py-1.5 text-muted-foreground">
                          <span className="font-medium text-foreground">{vaxName(v)}</span>
                          {vaxExpires(v) ? ` · expires ${formatDate(vaxExpires(v)!)}` : ""}
                          {vaxDateGiven(v) ? ` · given ${formatDate(vaxDateGiven(v)!)}` : ""}
                          {v.status ? ` · ${v.status}` : ""}
                          {vaxDocUrl(v) && (
                            <a
                              href={vaxDocUrl(v)}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-[10px] text-primary mt-0.5"
                            >
                              View certificate
                            </a>
                          )}
                        </li>
                      ))}
                  </ul>
                )}
                <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Add vaccination</p>
                  <div>
                    <Label className="text-xs">Vaccine Name *</Label>
                    {requiredVaccinesEdit && requiredVaccinesEdit.length > 0 ? (
                      <>
                        {!useCustomVax ? (
                          <Select
                            value={vaxForm.vaccineName}
                            onValueChange={(v) => {
                              if (v === "__other") {
                                setUseCustomVax(true);
                                setVaxForm((f) => ({ ...f, vaccineName: "" }));
                              } else {
                                setVaxForm((f) => ({ ...f, vaccineName: v }));
                              }
                            }}
                          >
                            <SelectTrigger className="mt-1 h-9 text-xs">
                              <SelectValue placeholder="Select required vaccine" />
                            </SelectTrigger>
                            <SelectContent>
                              {requiredVaccinesEdit
                                .map((rv) => ({ rv, label: reqVaccineLabel(rv) }))
                                .filter(({ label }) => label.length > 0)
                                .map(({ rv, label }) => (
                                  <SelectItem key={rv.id} value={label}>
                                    {label}
                                  </SelectItem>
                                ))}
                              <SelectItem value="__other">Other (custom)</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex gap-2 mt-1">
                            <Input
                              value={customVaxName}
                              onChange={(e) => {
                                setCustomVaxName(e.target.value);
                                setVaxForm((f) => ({ ...f, vaccineName: e.target.value }));
                              }}
                              placeholder="Enter custom vaccine name"
                              className="flex-1 h-9 text-xs"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 shrink-0 text-xs"
                              onClick={() => {
                                setUseCustomVax(false);
                                setCustomVaxName("");
                                setVaxForm((f) => ({ ...f, vaccineName: "" }));
                              }}
                            >
                              Back
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <Input
                        value={vaxForm.vaccineName}
                        onChange={(e) => setVaxForm((f) => ({ ...f, vaccineName: e.target.value }))}
                        placeholder="e.g. Rabies"
                        className="mt-1 h-9 text-xs"
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Date Given</Label>
                      <Input
                        type="date"
                        value={vaxForm.dateAdministered}
                        onChange={(e) => setVaxForm((f) => ({ ...f, dateAdministered: e.target.value }))}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Expires</Label>
                      <Input
                        type="date"
                        value={vaxForm.expirationDate}
                        onChange={(e) => setVaxForm((f) => ({ ...f, expirationDate: e.target.value }))}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={vaxForm.status} onValueChange={(v) => setVaxForm((f) => ({ ...f, status: v }))}>
                      <SelectTrigger className="mt-1 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
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
                        onUpload={(url) => setVaxForm((f) => ({ ...f, documentUrl: url }))}
                        currentUrl={vaxForm.documentUrl || null}
                        onRemove={() => setVaxForm((f) => ({ ...f, documentUrl: "" }))}
                        accept="image/*,.pdf,.jpg,.jpeg,.png"
                        folder="vaccination-certs"
                        variant="document"
                        label="Upload Certificate"
                        maxSizeMB={10}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="w-full h-9 text-xs gap-1"
                    disabled={
                      !petDialog ||
                      !resolvedKennelId ||
                      !vaxForm.vaccineName.trim() ||
                      !vaxForm.expirationDate.trim() ||
                      createVax.isPending
                    }
                    onClick={() => {
                      if (!petDialog || !resolvedKennelId) return;
                      if (!vaxForm.vaccineName.trim()) {
                        toast.error("Vaccine name required");
                        return;
                      }
                      if (!vaxForm.expirationDate.trim()) {
                        toast.error("Expiration date required");
                        return;
                      }
                      createVax.mutate({
                        dogId: petDialog.dogId,
                        kennelId: resolvedKennelId,
                        vaccineName: vaxForm.vaccineName.trim(),
                        expirationDate: vaxForm.expirationDate,
                        dateAdministered: vaxForm.dateAdministered || undefined,
                        documentUrl: vaxForm.documentUrl || undefined,
                        status: vaxForm.status as 'current' | 'expiring_soon' | 'expired' | 'missing',
                      });
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    {createVax.isPending ? "Adding…" : "Add Vaccination"}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setPetDialog(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={
                !resolvedKennelId ||
                !petDialog ||
                !editDog ||
                updateDirectoryDog.isPending ||
                assignBadges.isPending
              }
              onClick={async () => {
                if (!resolvedKennelId || !petDialog || !editDog) return;
                const w = dWeight.trim() ? parseFloat(dWeight) : null;
                if (dWeight.trim() && (w == null || Number.isNaN(w))) {
                  toast.error("Weight must be a number");
                  return;
                }
                try {
                  await updateDirectoryDog.mutateAsync({
                    kennelId: resolvedKennelId,
                    dogId: petDialog.dogId,
                    name: dName.trim(),
                    breed: dBreed.trim() || null,
                    weight: w,
                    birthday: dBirthday.trim() || null,
                    emergencyContactName: dEmergName.trim() || null,
                    emergencyContactPhone: dEmergPhone.trim() || null,
                    specialNeeds: dSpecial.trim() || null,
                  });
                  await assignBadges.mutateAsync({
                    kennelId: resolvedKennelId,
                    dogId: petDialog.dogId,
                    badgeKeys: Array.from(badgeKeysSel),
                  });
                  toast.success("Dog updated");
                  utils.report.ownerDirectory.invalidate();
                  setPetDialog(null);
                } catch {
                  /* toasts from mutations */
                }
              }}
            >
              {updateDirectoryDog.isPending || assignBadges.isPending ? "Saving…" : "Save dog"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
