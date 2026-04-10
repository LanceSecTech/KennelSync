import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { Analytics } from "@vercel/analytics/react";
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
import Onboarding from "./pages/Onboarding";
import { getOnboardingState } from "./lib/onboarding";
import { useMemo, useState } from "react";

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
import Settings from "./pages/Settings";
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
      <Route path="/settings" component={Settings} />
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
      <Route path="/settings" component={Settings} />
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
      <Route path="/settings" component={Settings} />
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
      <Route path="/settings" component={Settings} />
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
        <Route path="/login" component={WebsiteAuth} />
        <Route component={WebsiteHome} />
      </Switch>
    </WebsiteLayout>
  );
}

function AppWithKennel() {
  const { user, loading } = useAuth();
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
    "/login",
  ]);
  const isPublicPath = publicPaths.has(location);

  const needsOnboarding = useMemo(() => {
    if (!user) return false;
    const state = getOnboardingState(user.id);
    return !(state?.completed || completedNow);
  }, [user, completedNow]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Loading...</p>
      </div>
    );
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
          <Analytics />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
