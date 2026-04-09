import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DashboardLayout from './DashboardLayout';
import { AlertCircle, Mail, Lock, User } from 'lucide-react';

function SplashPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [signupRole, setSignupRole] = useState<'customer' | 'employee' | 'owner'>('customer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, name, signupRole);
        // After successful signup, switch to sign in mode
        setEmail('');
        setPassword('');
        setName('');
        setSignupRole('customer');
        setIsSignUp(false);
        setError('Check your email to confirm your account');
      } else {
        await signIn(email, password);
        // Sign-in successful - the useAuth hook will update and trigger re-render
        // AppLayout will then show the dashboard
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      {/* Decorative blurs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4">
            <span className="text-2xl">🐾</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">KennelSync</h1>
          <p className="text-gray-600">Kennel management made simple</p>
        </div>

        {/* Auth Card */}
        <Card className="p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  I am a
                </label>
                <Select
                  value={signupRole}
                  onValueChange={(v: 'customer' | 'employee' | 'owner') => setSignupRole(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2 rounded-lg transition-all"
            >
              {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="w-full text-center text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Create one"}
            </button>
          </div>
        </Card>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { icon: '📅', label: 'Easy Booking' },
            { icon: '🐕', label: 'Dog Profiles' },
            { icon: '💳', label: 'Payments' },
          ].map((feature) => (
            <div key={feature.label} className="text-center">
              <div className="text-2xl mb-2">{feature.icon}</div>
              <p className="text-xs text-gray-600">{feature.label}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-8">
          🏠 Boarding • 🌞 Daycare • ✨ Grooming
        </p>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500 rounded-full mb-4 animate-pulse">
            <span className="text-xl">🐾</span>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <SplashPage />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
