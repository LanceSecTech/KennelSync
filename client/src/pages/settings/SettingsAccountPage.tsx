import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { SettingsSubpageShell } from "./SettingsSubpageShell";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User } from "lucide-react";
import { useLocation } from "wouter";

export function SettingsAccountPage() {
  const { user, refresh, logout } = useAuth();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
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
  const deleteAccount = trpc.auth.deleteAccount.useMutation({
    onError: (e) => toast.error(e.message || "Could not delete account"),
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

      <Card className="border border-destructive/30 bg-destructive/5 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-destructive">Delete account</CardTitle>
          <CardDescription className="text-xs">
            Permanently delete your account and all related profile/app data. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" className="w-full">
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action is permanent and cannot be undone. Your sign-in account and all related data will be
                  deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteAccount.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleteAccount.isPending}
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      await deleteAccount.mutateAsync();
                      await logout();
                      localStorage.removeItem("hasCompletedOnboarding");
                      toast.success("Account deleted");
                      setLocation("/login");
                    } catch (err: any) {
                      toast.error(err?.message || "Could not delete account");
                    }
                  }}
                >
                  {deleteAccount.isPending ? "Deleting…" : "Yes, delete account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </SettingsSubpageShell>
  );
}
