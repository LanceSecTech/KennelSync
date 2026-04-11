import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingsSubpageShell } from "./SettingsSubpageShell";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "kennelsync-notification-prefs-v1";

type Prefs = {
  bookingUpdates: boolean;
  vaccineReminders: boolean;
  marketingTips: boolean;
};

const defaultPrefs: Prefs = {
  bookingUpdates: true,
  vaccineReminders: true,
  marketingTips: false,
};

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return { ...defaultPrefs, ...parsed };
  } catch {
    return defaultPrefs;
  }
}

export function SettingsNotificationsPage() {
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const persist = useCallback((next: Prefs) => {
    setPrefs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      toast.success("Preferences saved");
    } catch {
      toast.error("Could not save preferences");
    }
  }, []);

  const row = (
    id: keyof Prefs,
    title: string,
    description: string,
  ) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/60 last:border-0 last:pb-0 first:pt-0">
      <div className="min-w-0 space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
          {title}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={prefs[id]}
        onCheckedChange={(checked) => persist({ ...prefs, [id]: checked })}
        className="shrink-0 mt-0.5"
      />
    </div>
  );

  return (
    <SettingsSubpageShell
      title="Notifications"
      description="Choose what you want to hear about. More channels can be added later."
    >
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Preferences</CardTitle>
              <CardDescription className="text-xs">
                Stored on this device for now; account-wide delivery is coming next.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {row("bookingUpdates", "Booking updates", "Check-ins, check-outs, and schedule changes.")}
          {row("vaccineReminders", "Vaccine & health reminders", "Expiry and missing vaccine alerts.")}
          {row("marketingTips", "Tips & product updates", "Occasional ideas to get more from KennelSync.")}
        </CardContent>
      </Card>
    </SettingsSubpageShell>
  );
}
