import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { Button } from './ui/button';
import { Settings, LogOut, Home, Calendar, AlertCircle, DollarSign, PawPrint, Clock, Dog, Plus, DoorOpen } from 'lucide-react';
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import OwnerSubscriptionGate from './OwnerSubscriptionGate';

function TopBar() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="text-2xl">🐾</div>
        <h1 className="text-xl font-bold text-gray-900">KennelSync</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/settings')}
          className="text-gray-600 hover:text-gray-900"
        >
          <Settings className="w-5 h-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-gray-600 hover:text-gray-900"
        >
          <LogOut className="w-5 h-5" />
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
      className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors min-w-0 flex-1 max-w-[5.5rem] ${
        active ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">{item.label}</span>
    </button>
  );
}

/** Customer tabs: one per grid column, full width of column, centered content */
function CustomerNavTabButton({ item, active }: { item: NavItem; active: boolean }) {
  const [, navigate] = useLocation();
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => navigate(item.path)}
      className={`flex w-full max-w-[6.5rem] mx-auto flex-col items-center justify-end gap-1 rounded-xl px-1 py-2 min-h-[3rem] transition-all ${
        active
          ? 'text-blue-600 bg-blue-50/90 shadow-sm'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 active:bg-slate-100'
      }`}
    >
      <Icon className="w-[1.35rem] h-[1.35rem] sm:w-6 sm:h-6 shrink-0" strokeWidth={active ? 2.25 : 2} />
      <span className="text-[9px] sm:text-[11px] font-semibold text-center leading-tight tracking-tight">
        {item.label}
      </span>
    </button>
  );
}

const CUSTOMER_NAV_SLOTS: NavItem[] = [
  { icon: Home, label: 'Home', path: '/app' },
  { icon: Dog, label: 'My Dogs', path: '/dogs' },
  { icon: Calendar, label: 'My Stays', path: '/stays' },
  { icon: DollarSign, label: 'Payments', path: '/payments' },
];

function CustomerBottomNav({ location }: { location: string }) {
  const bookActive = location === '/book';
  const [, navigate] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 w-full border-t border-slate-200/90 bg-white/95 shadow-[0_-8px_32px_rgba(15,23,42,0.07)] backdrop-blur-md supports-[backdrop-filter]:bg-white/90"
      aria-label="Main navigation"
    >
      <div className="relative w-full px-2 sm:px-4 md:px-8 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-9 sm:pt-10">
        {/* Floating green circle (plus only) + “Book” label below — single hit target */}
        <button
          type="button"
          onClick={() => navigate('/book')}
          aria-label="Book a new stay"
          aria-current={bookActive ? 'page' : undefined}
          className="group absolute left-1/2 top-0 z-10 flex w-[5.25rem] sm:w-[5.5rem] -translate-x-1/2 flex-col items-center border-0 bg-transparent p-0 focus:outline-none focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:[&_.book-fab-circle]:scale-95"
        >
          <span
            className={`book-fab-circle flex h-[3.75rem] w-[3.75rem] sm:h-16 sm:w-16 shrink-0 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-[0_8px_28px_rgba(22,163,74,0.45)] transition-[transform,box-shadow,background] duration-200 ${
              bookActive
                ? 'bg-gradient-to-b from-green-600 to-green-700 ring-[3px] ring-white scale-[1.02]'
                : 'bg-gradient-to-b from-green-500 to-green-600 ring-4 ring-white group-hover:from-green-500 group-hover:to-green-700 group-hover:shadow-[0_10px_32px_rgba(22,163,74,0.5)]'
            }`}
            aria-hidden
          >
            <Plus className="h-[1.25rem] w-[1.25rem] sm:h-5 sm:w-5 shrink-0 stroke-[2.75]" />
          </span>
          <span
            className={`relative z-10 -mt-[1.7rem] sm:-mt-[1.85rem] text-[9px] sm:text-[10px] font-bold leading-none tracking-wide transition-colors ${
              bookActive ? 'text-green-700' : 'text-slate-700 group-hover:text-slate-900'
            }`}
          >
            Book
          </span>
        </button>

        {/* Five columns: tab | tab | spacer for FAB | tab | tab — equal width, items in 1,2,4,5 */}
        <div className="grid w-full grid-cols-5 items-end gap-0 min-h-[3.25rem]">
          <div className="flex justify-center">
            <CustomerNavTabButton item={CUSTOMER_NAV_SLOTS[0]} active={location === CUSTOMER_NAV_SLOTS[0].path} />
          </div>
          <div className="flex justify-center">
            <CustomerNavTabButton item={CUSTOMER_NAV_SLOTS[1]} active={location === CUSTOMER_NAV_SLOTS[1].path} />
          </div>
          {/* Center column: visual anchor for FAB (no duplicate Book tab) */}
          <div className="flex justify-center pointer-events-none min-h-[1px]" aria-hidden="true" />
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

function BottomNav({ role }: { role: string }) {
  const location = useLocation()[0];

  if (role !== 'owner' && role !== 'employee') {
    return <CustomerBottomNav location={location} />;
  }

  const getNavItems = (): NavItem[] => {
    switch (role) {
      case 'owner':
        return [
          { icon: Home, label: 'Dashboard', path: '/app' },
          { icon: Calendar, label: 'Bookings', path: '/bookings' },
          { icon: AlertCircle, label: 'Alerts', path: '/alerts' },
          { icon: DoorOpen, label: 'Rooms', path: '/rooms' },
          { icon: PawPrint, label: 'Kennel', path: '/kennel' },
        ];
      case 'employee':
        return [
          { icon: Home, label: 'Dashboard', path: '/app' },
          { icon: Clock, label: 'Today', path: '/today' },
          { icon: Calendar, label: 'Check-In/Out', path: '/checkin' },
          { icon: DoorOpen, label: 'Rooms', path: '/rooms' },
          { icon: Dog, label: 'Dogs', path: '/dogs' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-3">
      <div className="flex items-center justify-around gap-2 max-w-full">
        {navItems.map((item) => (
          <NavTabButton key={item.path} item={item} active={location === item.path} />
        ))}
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user } = useAuth();

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar />
      
      <main
        className={`flex-1 overflow-auto ${
          user.role === 'owner' || user.role === 'employee' ? 'pb-24' : 'pb-32 sm:pb-36'
        }`}
      >
        <div className="max-w-7xl mx-auto p-6">
          <OwnerSubscriptionGate>{children}</OwnerSubscriptionGate>
        </div>
      </main>
      
      <BottomNav role={user.role} />
    </div>
  );
}
