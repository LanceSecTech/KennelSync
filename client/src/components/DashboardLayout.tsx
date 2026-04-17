import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { useEffect, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "./ui/button";
import {
  Settings,
  LogOut,
  Home,
  Calendar,
  AlertCircle,
  MessageCircle,
  Dog,
  Plus,
} from "lucide-react";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import OwnerSubscriptionGate from "./OwnerSubscriptionGate";
import { isNativeAppClient } from "@/lib/capacitorPlatform";
import { cn } from "@/lib/utils";

function TopBar({ isNative }: { isNative: boolean }) {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div
      className={cn(
        "z-50 flex items-center justify-between border-b border-gray-200 bg-white sticky top-0",
        isNative
          ? "px-4 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+0.375rem)]"
          : "px-6 py-4",
      )}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={cn(isNative ? "text-xl" : "text-2xl")}>🐾</div>
        <h1 className={cn("font-bold text-gray-900", isNative ? "text-lg" : "text-xl")}>KennelSync</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900" asChild>
          <Link href="/settings" aria-label="Settings" title="Settings">
            <Settings className="h-5 w-5" />
          </Link>
        </Button>

        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-600 hover:text-gray-900">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

type NavItem = { icon: typeof Home; label: string; path: string };

function NavTabButton({ item, active }: { item: NavItem; active: boolean }) {
  const [, navigate] = useLocation();
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => navigate(item.path)}
      className={`flex min-w-0 max-w-[5.5rem] flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 transition-colors ${
        active ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:text-gray-900"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="text-center text-[10px] font-medium leading-tight sm:text-xs">{item.label}</span>
    </button>
  );
}

function CustomerNavTabButton({ item, active }: { item: NavItem; active: boolean }) {
  const [, navigate] = useLocation();
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => navigate(item.path)}
      className={`mx-auto flex min-h-[3rem] w-full max-w-[6.5rem] flex-col items-center justify-end gap-1 rounded-xl px-1 py-2 transition-all ${
        active
          ? "bg-blue-50/90 text-blue-600 shadow-sm"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100"
      }`}
    >
      <Icon className="h-[1.35rem] w-[1.35rem] shrink-0 sm:h-6 sm:w-6" strokeWidth={active ? 2.25 : 2} />
      <span className="text-center text-[9px] font-semibold leading-tight tracking-tight sm:text-[11px]">
        {item.label}
      </span>
    </button>
  );
}

function mobileNavItemsForRole(role: string): NavItem[] {
  if (role === "owner") {
    return [
      { icon: Home, label: "Dashboard", path: "/app" },
      { icon: Calendar, label: "Bookings", path: "/bookings" },
      { icon: Dog, label: "Pets", path: "/settings?tab=owners-pets" },
      { icon: MessageCircle, label: "Messages", path: "/alerts" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ];
  }

  if (role === "employee") {
    return [
      { icon: Home, label: "Dashboard", path: "/app" },
      { icon: Calendar, label: "Bookings", path: "/checkin" },
      { icon: Dog, label: "Pets", path: "/dogs" },
      { icon: MessageCircle, label: "Messages", path: "/alerts" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ];
  }

  return [
    { icon: Home, label: "Dashboard", path: "/app" },
    { icon: Calendar, label: "Bookings", path: "/stays" },
    { icon: Dog, label: "Pets", path: "/dogs" },
    { icon: MessageCircle, label: "Messages", path: "/settings/notifications" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];
}

function CustomerBottomNav({
  location,
  isNative,
  role,
}: {
  location: string;
  isNative: boolean;
  role: string;
}) {
  const navItems = mobileNavItemsForRole(role);
  const isMessagesActive = location.startsWith(navItems[3].path);
  const isSettingsActive = location.startsWith(navItems[4].path);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 w-full border-t border-slate-200/90 bg-white/95 shadow-[0_-8px_32px_rgba(15,23,42,0.07)] backdrop-blur-md supports-[backdrop-filter]:bg-white/90"
      aria-label="Main navigation"
    >
      <div
        className={cn(
          "relative w-full px-2 sm:px-4 md:px-8",
          isNative ? "pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-2" : "py-3",
        )}
      >
        <div className="grid min-h-[3.25rem] w-full grid-cols-5 items-end gap-0">
          <div className="flex justify-center">
            <CustomerNavTabButton item={navItems[0]} active={location.startsWith(navItems[0].path)} />
          </div>
          <div className="flex justify-center">
            <CustomerNavTabButton item={navItems[1]} active={location.startsWith(navItems[1].path)} />
          </div>
          <div className="flex justify-center">
            <CustomerNavTabButton item={navItems[2]} active={location.startsWith(navItems[2].path)} />
          </div>
          <div className="flex justify-center">
            <CustomerNavTabButton item={navItems[3]} active={isMessagesActive} />
          </div>
          <div className="flex justify-center">
            <CustomerNavTabButton item={navItems[4]} active={isSettingsActive} />
          </div>
        </div>
      </div>
    </nav>
  );
}

function BottomNav({ role, isNative }: { role: string; isNative: boolean }) {
  const location = useLocation()[0];

  if (isNative) {
    return <CustomerBottomNav location={location} isNative={isNative} role={role} />;
  }

  const navItems: NavItem[] =
    role === "owner"
      ? [
          { icon: Home, label: "Dashboard", path: "/app" },
          { icon: Calendar, label: "Bookings", path: "/bookings" },
          { icon: AlertCircle, label: "Alerts", path: "/alerts" },
          { icon: Settings, label: "Settings", path: "/settings" },
        ]
      : [
          { icon: Home, label: "Dashboard", path: "/app" },
          { icon: Dog, label: "Pets", path: "/dogs" },
          { icon: Calendar, label: "Bookings", path: "/stays" },
          { icon: Settings, label: "Settings", path: "/settings" },
        ];

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white px-4",
        isNative ? "pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-2" : "py-3",
      )}
    >
      <div className="flex max-w-full items-center justify-around gap-2">
        {navItems.map((item) => (
          <NavTabButton key={item.path} item={item} active={location === item.path} />
        ))}
      </div>
    </div>
  );
}

function MobileNativeLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const canShowFab = user?.role === "customer";
  const isBookRoute = location === "/book" || location.startsWith("/book?");

  return (
    <div className="relative rounded-3xl border border-slate-200/70 bg-gradient-to-b from-white via-slate-50/70 to-white px-2 pb-2 pt-2 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      {children}
      {canShowFab && (
        <button
          type="button"
          aria-label="Create booking"
          onClick={() => navigate("/book")}
          className={cn(
            "fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_10px_24px_rgba(16,185,129,0.35)] transition-all",
            isBookRoute ? "bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700",
          )}
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

function NativeMainTransition({
  children,
  routeKey,
}: {
  children: React.ReactNode;
  routeKey: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        className="min-h-0"
        initial={reduceMotion ? false : { opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, x: -6 }}
        transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const isNative = useMemo(() => isNativeAppClient(), []);
  const location = useLocation()[0];

  useEffect(() => {
    if (!isNative) return;
    document.documentElement.classList.add("native-app");
    return () => document.documentElement.classList.remove("native-app");
  }, [isNative]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex w-full max-w-md flex-col items-center gap-8 p-8">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-center text-2xl font-semibold tracking-tight">Sign in to continue</h1>
            <p className="max-w-sm text-center text-sm text-muted-foreground">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const mainBottomPad =
    user.role === "owner" || user.role === "employee"
      ? isNative
        ? "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
        : "pb-24"
      : isNative
        ? "pb-[calc(7rem+env(safe-area-inset-bottom,0px))]"
        : "pb-32 sm:pb-36";

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopBar isNative={isNative} />

      <main className={cn("flex-1 overflow-auto", mainBottomPad)}>
        <div
          className={cn(
            "mx-auto max-w-7xl",
            isNative ? "px-3 pb-4 pt-1 sm:px-4" : "p-6",
          )}
        >
          <OwnerSubscriptionGate>
            {isNative ? (
              <MobileNativeLayout>
                <NativeMainTransition routeKey={location}>{children}</NativeMainTransition>
              </MobileNativeLayout>
            ) : (
              children
            )}
          </OwnerSubscriptionGate>
        </div>
      </main>

      <BottomNav role={user.role} isNative={isNative} />
    </div>
  );
}
