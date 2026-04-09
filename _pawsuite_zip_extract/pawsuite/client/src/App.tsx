import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { KennelProvider } from "./contexts/KennelContext";
import { useAuth } from "./_core/hooks/useAuth";
import AppLayout from "./components/AppLayout";

// Customer pages
import CustomerDashboard from "./pages/CustomerDashboard";
import MyDogs from "./pages/MyDogs";
import DogProfile from "./pages/DogProfile";
import BookingFlow from "./pages/BookingFlow";
import MyStays from "./pages/MyStays";
import Payments from "./pages/Payments";

// Owner pages
import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerBookings from "./pages/OwnerBookings";
import Financials from "./pages/Financials";
import KennelProfile from "./pages/KennelProfile";

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

function CustomerRoutes() {
  return (
    <Switch>
      <Route path="/" component={CustomerDashboard} />
      <Route path="/dogs" component={MyDogs} />
      <Route path="/dogs/:id" component={DogProfile} />
      <Route path="/book" component={BookingFlow} />
      <Route path="/stays" component={MyStays} />
      <Route path="/payments" component={Payments} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function OwnerRoutes() {
  return (
    <Switch>
      <Route path="/" component={OwnerDashboard} />
      <Route path="/bookings" component={OwnerBookings} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/financials" component={Financials} />
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
      <Route path="/" component={EmployeeDashboard} />
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

function AppWithKennel() {
  const { user } = useAuth();
  
  if (!user) {
    return (
      <AppLayout>
        <RoleRouter />
      </AppLayout>
    );
  }

  return (
    <KennelProvider userRole={user.role}>
      <AppLayout>
        <RoleRouter />
      </AppLayout>
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
