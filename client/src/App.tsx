import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { KennelProvider } from "./contexts/KennelContext";
import { useAuth } from "./_core/hooks/useAuth";
import DashboardLayout from "./components/DashboardLayout";
import WebsiteLayout from "./components/WebsiteLayout";
import {
  WebsiteAbout,
  WebsiteAuth,
  WebsiteGuidelines,
  WebsiteHelp,
  WebsiteHome,
  WebsiteKennels,
  WebsitePlaceholderPage,
  WebsitePrivacy,
  WebsiteTerms,
} from "./pages/WebsitePages";
import {
  WebsiteMarketingContact,
  WebsiteMarketingCustomers,
  WebsiteMarketingEmployees,
  WebsiteMarketingFeatures,
  WebsiteMarketingOwners,
} from "./pages/MarketingSitePages";
import Onboarding from "./pages/Onboarding";
import { getOnboardingState } from "./lib/onboarding";
import { isNativeAppClient } from "./lib/capacitorPlatform";
import { hasCompletedMobileAppOnboarding } from "./lib/mobileAppOnboardingStorage";
import MobileAppOnboarding from "./pages/MobileAppOnboarding";
import { trpc } from "./lib/trpc";
import { useEffect, useMemo, useRef, useState } from "react";

// Customer pages
import CustomerDashboard from "./pages/CustomerDashboard";
import MyDogs from "./pages/MyDogs";
import DogProfile from "./pages/DogProfile";
import BookingFlow from "./pages/BookingFlow";
import MyStays from "./pages/MyStays";
import Payments from "./pages/Payments";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";

// Owner pages
import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerBookings from "./pages/OwnerBookings";
import KennelProfile from "./pages/KennelProfile";
import OwnerReports from "./pages/OwnerReports";

// Employee pages
import EmployeeDashboard from "./pages/EmployeeDashboard";
import Today from "./pages/Today";
import CheckInOut from "./pages/CheckInOut";
import EmployeeDogs from "./pages/EmployeeDogs";

// Room pages
import RoomManagement from "./pages/RoomManagement";
import RoomOverview from "./pages/RoomOverview";

// Shared pages
import Alerts from "./pages/Alerts";
import { SETTINGS_ROUTE_FRAGMENT } from "./pages/SettingsSubpages";
import NotFound from "./pages/NotFound";
import { Redirect } from "wouter";
import { useLocation } from "wouter";

function CustomerRoutes() {
  return (
    <Switch>
      <Route path="/app" component={CustomerDashboard} />
      <Route path="/dogs" component={MyDogs} />
      <Route path="/dogs/:id" component={DogProfile} />
      <Route path="/book" component={BookingFlow} />
      <Route path="/stays" component={MyStays} />
      <Route path="/payments" component={Payments} />
      <Route path="/payment/success" component={PaymentSuccess} />
      <Route path="/payment/cancel" component={PaymentCancel} />
      {SETTINGS_ROUTE_FRAGMENT}
      <Route component={NotFound} />
    </Switch>
  );
}

function OwnerRoutes() {
  return (
    <Switch>
      <Route path="/app" component={OwnerDashboard} />
      <Route path="/bookings" component={OwnerBookings} />
      <Route path="/reports" component={OwnerReports} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/financials">
        <Redirect to="/settings?tab=financials" />
      </Route>
      <Route path="/kennel" component={KennelProfile} />
      <Route path="/rooms" component={RoomManagement} />
      {SETTINGS_ROUTE_FRAGMENT}
      <Route component={NotFound} />
    </Switch>
  );
}

function EmployeeRoutes() {
  return (
    <Switch>
      <Route path="/app" component={EmployeeDashboard} />
      <Route path="/today" component={Today} />
      <Route path="/checkin" component={CheckInOut} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/dogs" component={EmployeeDogs} />
      <Route path="/rooms" component={RoomOverview} />
      {SETTINGS_ROUTE_FRAGMENT}
      <Route component={NotFound} />
    </Switch>
  );
}

function RoleRouter() {
  const { user, loading } = useAuth();

  if (loading || !user) return null;

  switch (user.role) {
    case "owner":
      return <OwnerRoutes />;
    case "employee":
      return <EmployeeRoutes />;
    default:
      return <CustomerRoutes />;
  }
}

/** While owner onboarding runs, RoleRouter is not mounted — deep links must still render real pages. */
function OwnerOnboardingRoutes({
  user,
  onOnboardingComplete,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  onOnboardingComplete: () => void;
}) {
  return (
    <Switch>
      <Route path="/kennel" component={KennelProfile} />
      <Route path="/rooms" component={RoomManagement} />
      {SETTINGS_ROUTE_FRAGMENT}
      <Route path="/reports" component={OwnerReports} />
      <Route>
        <Onboarding user={user} onComplete={onOnboardingComplete} />
      </Route>
    </Switch>
  );
}

function PublicWebsiteRoutes() {
  return (
    <WebsiteLayout>
      <Switch>
        <Route path="/" component={WebsiteHome} />
        <Route path="/about" component={WebsiteAbout} />
        <Route path="/kennels" component={WebsiteKennels} />
        <Route path="/mobile">
          <WebsitePlaceholderPage
            title="KennelSync Mobile"
            description="Mobile app links for iOS and Android will live here."
          />
        </Route>
        <Route path="/guidelines" component={WebsiteGuidelines} />
        <Route path="/privacy" component={WebsitePrivacy} />
        <Route path="/terms" component={WebsiteTerms} />
        <Route path="/help" component={WebsiteHelp} />
        <Route path="/features" component={WebsiteMarketingFeatures} />
        <Route path="/owners" component={WebsiteMarketingOwners} />
        <Route path="/employees" component={WebsiteMarketingEmployees} />
        <Route path="/customers" component={WebsiteMarketingCustomers} />
        <Route path="/contact" component={WebsiteMarketingContact} />
        <Route path="/demo" component={WebsiteMarketingContact} />
        <Route path="/signup">
          <Redirect to="/login?mode=signup" />
        </Route>
        <Route path="/login" component={WebsiteAuth} />
        <Route component={WebsiteHome} />
      </Switch>
    </WebsiteLayout>
  );
}

function NativeAuthScreen() {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-emerald-50/80 via-white to-slate-50 px-4 pb-10 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
      <div className="mx-auto w-full max-w-md">
        <p className="mb-6 text-center text-lg font-semibold text-emerald-700">KennelSync</p>
        <WebsiteAuth />
      </div>
    </div>
  );
}

function AppWithKennel() {
  const { user, loading } = useAuth();
  const isNative = useMemo(() => isNativeAppClient(), []);
  const utils = trpc.useUtils();
  const backfillOnboarding = trpc.auth.completeOnboarding.useMutation({
    onSuccess: () => void utils.auth.me.invalidate(),
  });
  const backfillAttemptedRef = useRef(false);
  useEffect(() => {
    backfillAttemptedRef.current = false;
  }, [user?.id]);
  const [location, setLocation] = useLocation();
  const [completedNow, setCompletedNow] = useState(false);
  const publicPaths = new Set([
    "/",
    "/about",
    "/kennels",
    "/mobile",
    "/guidelines",
    "/privacy",
    "/terms",
    "/help",
    "/features",
    "/owners",
    "/employees",
    "/customers",
    "/contact",
    "/demo",
    "/login",
    "/signup",
  ]);
  const isPublicPath = publicPaths.has(location);
  const onLoginPath = location === "/login" || location.startsWith("/login?");
  const mobileIntroDone = hasCompletedMobileAppOnboarding();

  useEffect(() => {
    if (!isNative || loading) return;

    if (user) {
      if (isPublicPath || location === "/onboarding") {
        setLocation("/app");
      }
      return;
    }

    if (!mobileIntroDone) {
      if (location !== "/onboarding" && !onLoginPath) {
        setLocation("/onboarding");
      }
      return;
    }

    if (location === "/" || location === "/onboarding" || (isPublicPath && !onLoginPath)) {
      setLocation("/login");
    }
  }, [
    isNative,
    loading,
    user,
    location,
    setLocation,
    isPublicPath,
    onLoginPath,
    mobileIntroDone,
  ]);

  useEffect(() => {
    if (!user?.id) return;
    if (user.onboardingCompleted) {
      backfillAttemptedRef.current = false;
      return;
    }
    const ls = getOnboardingState(user.id);
    if (!ls?.completed || backfillAttemptedRef.current) return;
    backfillAttemptedRef.current = true;
    backfillOnboarding.mutate(undefined, {
      onError: () => {
        backfillAttemptedRef.current = false;
      },
    });
  }, [user?.id, user?.onboardingCompleted, backfillOnboarding]);

  const needsOnboarding = useMemo(() => {
    if (!user) return false;
    if (user.onboardingCompleted) return false;
    if (completedNow) return false;
    const state = getOnboardingState(user.id);
    if (state?.completed) return false;
    return true;
  }, [user, completedNow]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Loading...</p>
      </div>
    );
  }

  // Native: signed-in users should never see the marketing site.
  if (isNative && user) {
    if (isPublicPath || location === "/onboarding") {
      return <Redirect to="/app" />;
    }
  }

  // Native: guest routing — onboarding vs login (website never shown).
  if (isNative && !user) {
    if (onLoginPath) {
      return <NativeAuthScreen />;
    }
    if (!mobileIntroDone) {
      if (location === "/" || (isPublicPath && location !== "/onboarding")) {
        return <Redirect to="/onboarding" />;
      }
      if (location === "/onboarding") {
        return <MobileAppOnboarding />;
      }
      return <Redirect to="/onboarding" />;
    }
    if (location === "/" || location === "/onboarding" || isPublicPath) {
      return <Redirect to="/login" />;
    }
    return <Redirect to="/login" />;
  }

  if (isPublicPath) {
    return <PublicWebsiteRoutes />;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <KennelProvider userRole={user.role} userKennelId={user.kennelId ?? null}>
      <DashboardLayout>
        {needsOnboarding ? (
          user.role === "owner" ? (
            <OwnerOnboardingRoutes
              user={user}
              onOnboardingComplete={() => {
                setCompletedNow(true);
                setLocation("/app");
              }}
            />
          ) : (
            <Onboarding
              user={user}
              onComplete={() => {
                setCompletedNow(true);
                setLocation("/app");
              }}
            />
          )
        ) : (
          <RoleRouter />
        )}
      </DashboardLayout>
    </KennelProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AppWithKennel />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
