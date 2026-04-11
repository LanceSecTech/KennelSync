import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsSubpageShell } from "./SettingsSubpageShell";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User } from "lucide-react";

export function SettingsAccountPage() {
  const { user, refresh } = useAuth();
  const utils = trpc.useUtils();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  useEffect(() => {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.name, user?.phone]);

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: async () => {
      toast.success("Profile updated");
      await utils.auth.me.invalidate();
      await refresh();
    },
    onError: (e) => toast.error(e.message || "Could not update profile"),
  });

  const dirty =
    name.trim() !== (user?.name ?? "").trim() || phone.trim() !== (user?.phone ?? "").trim();

  return (
    <SettingsSubpageShell
      title="Account"
      description="Your profile and how you appear in KennelSync."
    >
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription className="text-xs">Name and contact on your account</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-2">
            <Label htmlFor="acct-email">Email</Label>
            <Input
              id="acct-email"
              type="email"
              value={user?.email ?? ""}
              disabled
              className="bg-muted/50 text-muted-foreground"
            />
            <p className="text-[11px] text-muted-foreground">
              Email is tied to sign-in. Contact support if you need to change it.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="acct-name">Display name</Label>
            <Input
              id="acct-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acct-phone">Phone (optional)</Label>
            <Input
              id="acct-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. (555) 123-4567"
              autoComplete="tel"
            />
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={!dirty || updateProfile.isPending || !name.trim()}
            onClick={() =>
              updateProfile.mutate({
                name: name.trim(),
                phone: phone.trim() || undefined,
              })
            }
          >
            {updateProfile.isPending ? "Saving…" : "Save changes"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Role</CardTitle>
          <CardDescription className="text-xs">How you use this kennel</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm capitalize font-medium">{user?.role ?? "—"}</p>
        </CardContent>
      </Card>
    </SettingsSubpageShell>
  );
}
