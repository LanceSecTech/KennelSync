import { useAuth } from "@/_core/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SettingsSubpageShell } from "./SettingsSubpageShell";
import { toast } from "sonner";
import { useState } from "react";
import { KeyRound, LogOut, ShieldCheck } from "lucide-react";

export function SettingsSecurityPage() {
  const { user, logout } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const deleteAccount = trpc.auth.deleteAccount.useMutation({
    onSuccess: async () => {
      toast.success("Your account has been permanently deleted.");
      try {
        await logout();
      } finally {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    },
    onError: (e) => {
      toast.error(e.message || "Could not delete account");
    },
  });

  const sendReset = async () => {
    const email = user?.email?.trim();
    if (!email) {
      toast.error("No email on file");
      return;
    }
    setSending(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/login`,
      });
      if (error) throw error;
      toast.success("Check your email for a password reset link.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not send reset email";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <SettingsSubpageShell
      title="Security"
      description="Password and session controls for your account."
    >
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Password</CardTitle>
              <CardDescription className="text-xs">
                Reset link is sent to your sign-in email
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="text-sm text-muted-foreground">
            For your security, password updates use a one-time link. You’ll choose a new password after
            opening the email.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={sending || !user?.email}
            onClick={() => void sendReset()}
          >
            {sending ? "Sending…" : "Email me a reset link"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Session</CardTitle>
              <CardDescription className="text-xs">Signed in as {user?.email ?? "—"}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Button
            type="button"
            variant="outline"
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={() => void logout()}
          >
            <LogOut className="h-4 w-4" />
            Sign out everywhere on this device
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/20 shadow-sm bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          <CardDescription className="text-xs">
            Permanently delete your account and all related data.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Button
            type="button"
            variant="outline"
            className="w-full text-destructive border-destructive/40 hover:bg-destructive/5"
            onClick={() => setConfirmOpen(true)}
            disabled={deleteAccount.isPending}
          >
            {deleteAccount.isPending ? "Deleting account…" : "Delete account permanently"}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes your KennelSync account, profile, and related data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAccount.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteAccount.isPending}
              onClick={(e) => {
                e.preventDefault();
                deleteAccount.mutate();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAccount.isPending ? "Deleting…" : "Yes, delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSubpageShell>
  );
}
