import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useKennel } from "@/contexts/KennelContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft, User, Shield, Bell, LogOut, Building2, Star, Link2, Unlink, Check,
  Phone, Mail, Clock, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

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

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setLocation("/")} className="p-1.5 rounded-lg hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

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
      </div>

      {/* Sign Out */}
      <Button
        variant="outline"
        className="w-full h-12 text-destructive border-destructive/30 hover:bg-destructive/5 font-semibold gap-2"
        onClick={() => logout()}
      >
        <LogOut className="h-4 w-4" /> Sign Out
      </Button>

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
