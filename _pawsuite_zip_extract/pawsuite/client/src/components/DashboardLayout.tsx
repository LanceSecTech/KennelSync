import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Button } from './ui/button';
import { Settings, LogOut, Home, Calendar, AlertCircle, DollarSign, PawPrint, Clock, Dog, Users } from 'lucide-react';
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/lib/supabase';

function TopBar() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
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

function BottomNav({ role }: { role: string }) {
  const [, navigate] = useLocation();
  const location = useLocation()[0];

  const getNavItems = () => {
    switch (role) {
      case 'owner':
        return [
          { icon: Home, label: 'Dashboard', path: '/' },
          { icon: Calendar, label: 'Bookings', path: '/bookings' },
          { icon: AlertCircle, label: 'Alerts', path: '/alerts' },
          { icon: DollarSign, label: 'Financials', path: '/financials' },
          { icon: PawPrint, label: 'Kennel', path: '/kennel' },
        ];
      case 'employee':
        return [
          { icon: Home, label: 'Dashboard', path: '/' },
          { icon: Clock, label: 'Today', path: '/today' },
          { icon: Calendar, label: 'Check-In/Out', path: '/checkin' },
          { icon: AlertCircle, label: 'Alerts', path: '/alerts' },
          { icon: Dog, label: 'Dogs', path: '/dogs' },
        ];
      default: // customer
        return [
          { icon: Home, label: 'Dashboard', path: '/' },
          { icon: Dog, label: 'My Dogs', path: '/dogs' },
          { icon: Calendar, label: 'My Stays', path: '/stays' },
          { icon: DollarSign, label: 'Payments', path: '/payments' },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
      <div className="flex items-center justify-around gap-2 max-w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
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
      
      <main className="flex-1 overflow-auto pb-24">
        <div className="max-w-7xl mx-auto p-6">
          {children}
        </div>
      </main>
      
      <BottomNav role={user.role} />
    </div>
  );
}
