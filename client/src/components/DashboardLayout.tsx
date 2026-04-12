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
  DollarSign,
  PawPrint,
  Clock,
  Dog,
  Plus,
  DoorOpen,
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

const CUSTOMER_NAV_SLOTS: NavItem[] = [
  { icon: Home, label: "Home", path: "/app" },
  { icon: Dog, label: "My Dogs", path: "/dogs" },
  { icon: Calendar, label: "My Stays", path: "/stays" },
  { icon: DollarSign, label: "Payments", path: "/payments" },
];

function CustomerBottomNav({ location, isNative }: { location: string; isNative: boolean }) {
  const bookActive = location === "/book";
  const [, navigate] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 w-full border-t border-slate-200/90 bg-white/95 shadow-[0_-8px_32px_rgba(15,23,42,0.07)] backdrop-blur-md supports-[backdrop-filter]:bg-white/90"
      aria-label="Main navigation"
    >
      <div
        className={cn(
          "relative w-full px-2 sm:px-4 md:px-8",
          isNative
            ? "pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-7"
            : "pb-[max(0.65rem,env(safe-area-inset-bottom,0px))] pt-9 sm:pt-10",
        )}
      >
        <button
          type="button"
          onClick={() => navigate("/book")}
          aria-label="Book a new stay"
          aria-current={bookActive ? "page" : undefined}
          className="group absolute left-1/2 top-0 z-10 flex w-[5.25rem] -translate-x-1/2 flex-col items-center border-0 bg-transparent p-0 focus:outline-none focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:[&_.book-fab-circle]:scale-95 sm:w-[5.5rem]"
        >
          <span
            className={`book-fab-circle flex h-[3.75rem] w-[3.75rem] shrink-0 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-[0_8px_28px_rgba(22,163,74,0.45)] transition-[transform,box-shadow,background] duration-200 sm:h-16 sm:w-16 ${
              bookActive
                ? "scale-[1.02] bg-gradient-to-b from-green-600 to-green-700 ring-[3px] ring-white"
                : "bg-gradient-to-b from-green-500 to-green-600 ring-4 ring-white group-hover:from-green-500 group-hover:to-green-700 group-hover:shadow-[0_10px_32px_rgba(22,163,74,0.5)]"
            }`}
            aria-hidden
          >
            <Plus className="h-[1.25rem] w-[1.25rem] shrink-0 stroke-[2.75] sm:h-5 sm:w-5" />
          </span>
          <span
            className={`relative z-10 -mt-[1.7rem] text-[9px] font-bold leading-none tracking-wide transition-colors sm:-mt-[1.85rem] sm:text-[10px] ${
              bookActive ? "text-green-700" : "text-slate-700 group-hover:text-slate-900"
            }`}
          >
            Book
          </span>
        </button>

        <div className="grid min-h-[3.25rem] w-full grid-cols-5 items-end gap-0">
          <div className="flex justify-center">
            <CustomerNavTabButton item={CUSTOMER_NAV_SLOTS[0]} active={location === CUSTOMER_NAV_SLOTS[0].path} />
          </div>
          <div className="flex justify-center">
            <CustomerNavTabButton item={CUSTOMER_NAV_SLOTS[1]} active={location === CUSTOMER_NAV_SLOTS[1].path} />
          </div>
          <div className="pointer-events-none flex min-h-[1px] justify-center" aria-hidden="true" />
          <div className="flex justify-center">
            <CustomerNavTabButton item={CUSTOMER_NAV_SLOTS[2]} active={location === CUSTOMER_NAV_SLOTS[2].path} />
          </div>
          <div className="flex justify-center">
            <CustomerNavTabButton item={CUSTOMER_NAV_SLOTS[3]} active={location === CUSTOMER_NAV_SLOTS[3].path} />
          </div>
        </div>
      </div>
    </nav>
  );
}

function BottomNav({ role, isNative }: { role: string; isNative: boolean }) {
  const location = useLocation()[0];

  if (role !== "owner" && role !== "employee") {
    return <CustomerBottomNav location={location} isNative={isNative} />;
  }

  const getNavItems = (): NavItem[] => {
    switch (role) {
      case "owner":
        return [
          { icon: Home, label: "Dashboard", path: "/app" },
          { icon: Calendar, label: "Bookings", path: "/bookings" },
          { icon: AlertCircle, label: "Alerts", path: "/alerts" },
          { icon: DoorOpen, label: "Rooms", path: "/rooms" },
          { icon: PawPrint, label: "Kennel", path: "/kennel" },
        ];
      case "employee":
        return [
          { icon: Home, label: "Dashboard", path: "/app" },
          { icon: Clock, label: "Today", path: "/today" },
          { icon: Calendar, label: "Check-In/Out", path: "/checkin" },
          { icon: DoorOpen, label: "Rooms", path: "/rooms" },
          { icon: Dog, label: "Dogs", path: "/dogs" },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

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
              <NativeMainTransition routeKey={location}>{children}</NativeMainTransition>
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
