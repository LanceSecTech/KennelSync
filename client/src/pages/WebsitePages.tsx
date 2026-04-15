import { useEffect, useMemo, useState, type ReactNode, type FormEvent } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { accountDisplayName } from "@/lib/accountDisplayName";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import {
  MarketingScreenshotSlideshow,
  MARKETING_HOME_GLANCE_SLIDES,
  MARKETING_HOME_HERO_SLIDES,
} from "@/components/MarketingScreenshotSlideshow";

function getAuthModeFromUrl(): "login" | "signup" {
  if (typeof window === "undefined") return "login";
  const mode = new URLSearchParams(window.location.search).get("mode");
  return mode === "signup" ? "signup" : "login";
}

export function WebsiteHome() {
  const roles = [
    {
      title: "Owners",
      body: "Run services, rooms, bookings, and visibility from one control center.",
      href: "/owners",
    },
    {
      title: "Employees",
      body: "Check-ins, room moves, and daily tasks without hunting for details.",
      href: "/employees",
    },
    {
      title: "Customers",
      body: "Book stays, keep profiles current, and see clear status.",
      href: "/customers",
    },
  ];

  return (
    <div className="relative">
      <section className="relative overflow-hidden border-b border-emerald-100/70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_20%,rgba(16,185,129,0.12),transparent_35%),radial-gradient(circle_at_90%_20%,rgba(16,185,129,0.1),transparent_40%),linear-gradient(180deg,#f8fffb_0%,#ffffff_55%,#f8fafc_100%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-7 px-4 pb-12 pt-10 sm:gap-9 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-2 lg:items-center lg:gap-14 lg:px-8 lg:pt-20">
          <div>
            <div className="inline-flex items-center rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-xs font-medium text-emerald-700">
              Built for professional kennel operations
            </div>
            <h1 className="mt-4 text-balance text-3xl font-semibold leading-tight text-slate-900 sm:mt-5 sm:text-5xl lg:text-6xl">
              KennelSync is the operating system for modern kennel teams.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:mt-5 sm:text-lg">
              One platform for bookings, dog profiles, rooms, staff workflows, and customer touchpoints—designed for real
              pet care businesses.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
              <Link href="/login?mode=signup">
                <Button className="h-11 w-full rounded-full bg-emerald-600 px-7 text-sm font-semibold text-white hover:bg-emerald-700 sm:w-auto">
                  Start Free
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" className="h-11 w-full rounded-full border-slate-300 px-7 text-sm font-semibold sm:w-auto">
                  Book a Demo
                </Button>
              </Link>
            </div>
          </div>
          <div className="mx-auto w-full max-w-md min-w-0 lg:mx-0 lg:max-w-none">
            <div className="rounded-2xl border border-slate-200/85 bg-white p-1.5 shadow-[0_12px_40px_-10px_rgba(15,23,42,0.12)] sm:rounded-3xl sm:p-3 sm:shadow-[0_16px_44px_-12px_rgba(15,23,42,0.14)] md:p-3.5">
              <div className="rounded-lg border border-slate-200/70 bg-gradient-to-b from-slate-50/80 to-white p-1.5 sm:rounded-xl sm:p-2.5">
                <MarketingScreenshotSlideshow slides={MARKETING_HOME_HERO_SLIDES} embedded compactMobile />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">At a glance</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">A quick look at the product</h2>
            <p className="mt-2 max-w-xl text-slate-600">
              Full detail lives on dedicated pages—start here, then dive deeper where you need it.
            </p>
          </div>
          <Link href="/features">
            <Button variant="outline" className="h-10 rounded-full border-slate-300 px-5 text-sm font-semibold">
              View all features
            </Button>
          </Link>
        </div>
        <div className="mx-auto mt-5 min-w-0 max-w-3xl md:mt-8">
          <MarketingScreenshotSlideshow slides={MARKETING_HOME_GLANCE_SLIDES} />
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50/60">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">Who it&apos;s for</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Built for every role</h2>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {roles.map((r) => (
              <Card key={r.title} className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">For {r.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-600">
                  <p>{r.body}</p>
                  <Link href={r.href}>
                    <Button variant="link" className="h-auto p-0 text-emerald-700">
                      Learn more →
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8">
        <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Ready to go deeper?</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          Explore features by role, or talk to us about rollout and training.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link href="/login?mode=signup">
            <Button className="h-11 w-full rounded-full bg-emerald-600 px-7 text-sm font-semibold text-white hover:bg-emerald-700 sm:w-auto">
              Sign Up
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="outline" className="h-11 w-full rounded-full border-slate-300 px-7 text-sm font-semibold sm:w-auto">
              Contact a Professional
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

export function WebsiteAbout() {
  return (
    <Card className="mx-auto mt-8 max-w-4xl border-emerald-100 bg-white text-slate-900 shadow-sm">
      <CardHeader>
        <CardTitle>About KennelSync</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-slate-600">
        <p>KennelSync helps pet care businesses run smoother operations without sacrificing service quality.</p>
        <p>We combine operational depth for staff with a clean customer experience for booking and communication.</p>
      </CardContent>
    </Card>
  );
}

export function WebsiteKennels() {
  const { data, isLoading } = trpc.kennel.list.useQuery();
  const kennels = useMemo(() => (data || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name))), [data]);

  return (
    <Card className="mx-auto mt-8 max-w-4xl border-emerald-100 bg-white text-slate-900 shadow-sm">
      <CardHeader>
        <CardTitle>Find a Kennel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? <p className="text-sm text-slate-600">Loading kennels...</p> : null}
        {!isLoading && !kennels.length ? <p className="text-sm text-slate-600">No active kennels found.</p> : null}
        {kennels.map((k: any) => (
          <div key={k.id} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
            <p className="font-medium">{k.name}</p>
            <p className="text-sm text-slate-600">{k.city || k.address || "Address coming soon"}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function WebsiteAuth() {
  const [isSignUp, setIsSignUp] = useState(() => getAuthModeFromUrl() === "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [signupRole, setSignupRole] = useState<"customer" | "employee" | "owner">("customer");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [forceShowForm, setForceShowForm] = useState(false);
  const { user, loading, signIn, signUp, logout } = useAuth();
  const updateProfileMutation = trpc.auth.updateProfile.useMutation();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!user) {
      setForceShowForm(false);
    }
  }, [user]);

  useEffect(() => {
    setIsSignUp(getAuthModeFromUrl() === "signup");
  }, [location]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      if (isSignUp) {
        const data = await signUp(email, password, name, signupRole);
        if (data.session) {
          // Persist signup profile immediately so onboarding does not re-collect the same fields.
          try {
            await updateProfileMutation.mutateAsync({
              name: name.trim(),
              phone: phone.trim() || undefined,
            });
          } catch {
            // Non-fatal: account was created; user can still continue and edit details later.
          }
        }
        if (data.session) {
          setLocation("/app");
          return;
        }
        setInfo("Account created. Please confirm email if prompted, then sign in.");
        setIsSignUp(false);
      } else {
        await signIn(email, password);
        setLocation("/app");
      }
    } catch (err: any) {
      setError(err?.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto mt-8 max-w-md border-emerald-100 bg-white text-slate-900 shadow-sm">
      <CardHeader>
        <CardTitle>{isSignUp ? "Create account" : "Sign in"}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2 py-3">
            <p className="text-sm text-slate-600">Checking session...</p>
          </div>
        ) : null}

        {!loading && user && !forceShowForm ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              You are already signed in as{" "}
              <span className="font-medium">{accountDisplayName(user)}</span>.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600"
                onClick={() => setLocation("/app")}
              >
                Continue to app
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                onClick={async () => {
                  setForceShowForm(true);
                  setBusy(true);
                  setError("");
                  try {
                    await logout();
                    setEmail("");
                    setPassword("");
                    setName("");
                    setInfo("Signed out. You can now sign in or create a new account.");
                    setIsSignUp(false);
                    setLocation("/login?mode=login");
                  } catch (err: any) {
                    setForceShowForm(false);
                    setError(err?.message || "Failed to sign out");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Sign out
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Sign out first if you want to create a different account.
            </p>
          </div>
        ) : null}

        {!loading && (!user || forceShowForm) ? (
        <form
          onSubmit={submit}
          autoComplete="off"
          className="space-y-3"
        >
          {/* Decoy fields to reduce aggressive browser/password-manager autofill */}
          <input
            type="text"
            name="fake-username"
            autoComplete="username"
            tabIndex={-1}
            aria-hidden="true"
            className="hidden"
          />
          <input
            type="password"
            name="fake-password"
            autoComplete="new-password"
            tabIndex={-1}
            aria-hidden="true"
            className="hidden"
          />
          {isSignUp ? (
            <>
              <div>
                <Label>Full name</Label>
                <Input
                  name="signup-full-name"
                  autoComplete="off"
                  data-lpignore="true"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>I am a</Label>
                <Select value={signupRole} onValueChange={(v: "customer" | "employee" | "owner") => setSignupRole(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Phone (optional)</Label>
                <Input
                  name="signup-phone"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </>
          ) : null}
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              name={isSignUp ? "signup-email" : "login-email"}
              autoComplete="off"
              inputMode="email"
              data-lpignore="true"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              name={isSignUp ? "signup-password" : "login-password"}
              autoComplete="new-password"
              data-lpignore="true"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {info ? <p className="text-sm text-emerald-700">{info}</p> : null}
          <Button type="submit" disabled={busy} className="w-full bg-emerald-500 text-white hover:bg-emerald-600">{busy ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}</Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
            onClick={() => {
              const nextIsSignUp = !isSignUp;
              setIsSignUp(nextIsSignUp);
              setLocation(nextIsSignUp ? "/login?mode=signup" : "/login?mode=login");
            }}
          >
            {isSignUp ? "Have an account? Sign in" : "Need an account? Sign up"}
          </Button>
        </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function WebsitePlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <Card className="mx-auto mt-8 max-w-4xl border-emerald-100 bg-white text-slate-900 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-slate-600">
        <p>{description}</p>
        <p className="text-sm text-slate-500">This public page is structured for expansion and can be customized next.</p>
      </CardContent>
    </Card>
  );
}

function WebsiteContentPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto mt-6 max-w-3xl px-4 pb-20 pt-4 sm:mt-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-emerald-100/80 bg-white/90 p-8 shadow-sm backdrop-blur-sm sm:p-10 lg:p-12">
        <div className="h-1 w-14 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" aria-hidden />
        <h1 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {title}
        </h1>
        <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-slate-600 sm:text-base">
          {children}
        </div>
      </div>
    </article>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="scroll-mt-8">
      <h2 className="flex gap-3 text-lg font-semibold text-slate-900">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-sm font-bold text-emerald-700">
          {n}
        </span>
        <span className="pt-0.5">{title}</span>
      </h2>
      <div className="mt-4 space-y-3 pl-0 sm:pl-11">{children}</div>
    </section>
  );
}

export function WebsiteGuidelines() {
  return (
    <WebsiteContentPage title="KennelSync Usage Guidelines">
      <p className="text-slate-600 sm:pl-11">
        Welcome to KennelSync. These guidelines are here to ensure a safe, respectful, and professional experience
        for all users.
      </p>
      <Section n={1} title="Professional Use Only">
        <p>
          KennelSync is designed for legitimate kennel operations. Users should use the platform responsibly for
          managing pets, bookings, and customer relationships.
        </p>
      </Section>
      <Section n={2} title="Accurate Information">
        <p>All users must provide accurate and up-to-date information regarding:</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-emerald-600">
          <li>Pet records</li>
          <li>Vaccination status</li>
          <li>Contact information</li>
        </ul>
      </Section>
      <Section n={3} title="Animal Welfare First">
        <p>
          Kennel operators are responsible for the safety and well-being of all animals in their care. KennelSync is a
          management tool and does not replace proper animal care standards.
        </p>
      </Section>
      <Section n={4} title="Respectful Communication">
        <p>Users must communicate respectfully. Harassment, abuse, or inappropriate behavior will not be tolerated.</p>
      </Section>
      <Section n={5} title="Data Responsibility">
        <p>
          Kennel owners are responsible for maintaining accurate business data, including services, pricing, and
          availability.
        </p>
      </Section>
      <Section n={6} title="Prohibited Use">
        <p>You may not:</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-emerald-600">
          <li>Use the platform for illegal activities</li>
          <li>Misrepresent services or credentials</li>
          <li>Attempt to access data that does not belong to you</li>
        </ul>
        <p className="mt-4 rounded-lg border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
          Violation of these guidelines may result in account suspension or termination.
        </p>
      </Section>
    </WebsiteContentPage>
  );
}

export function WebsitePrivacy() {
  return (
    <WebsiteContentPage title="Privacy Policy">
      <p className="text-slate-600 sm:pl-11">
        Your privacy is important to us. This policy explains how KennelSync collects, uses, and protects your
        information.
      </p>
      <Section n={1} title="Information We Collect">
        <p>We may collect:</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-emerald-600">
          <li>Name, email, phone number</li>
          <li>Pet information (name, breed, medical/vaccination data)</li>
          <li>Business information (for kennel owners)</li>
          <li>Payment information (processed securely via Stripe)</li>
        </ul>
      </Section>
      <Section n={2} title="How We Use Your Information">
        <p>We use your data to:</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-emerald-600">
          <li>Provide and operate the platform</li>
          <li>Manage bookings and services</li>
          <li>Improve user experience</li>
          <li>Process payments securely</li>
        </ul>
      </Section>
      <Section n={3} title="Payment Security">
        <p>All payments are handled through Stripe. KennelSync does not store full credit card details.</p>
      </Section>
      <Section n={4} title="Data Sharing">
        <p className="font-medium text-slate-800">We do NOT sell your personal data.</p>
        <p>Information is only shared when necessary to:</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-emerald-600">
          <li>Provide services</li>
          <li>Comply with legal obligations</li>
        </ul>
      </Section>
      <Section n={5} title="Data Protection">
        <p>We take reasonable measures to protect your data, including secure authentication and encrypted connections.</p>
      </Section>
      <Section n={6} title="Your Rights">
        <p>You may:</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-emerald-600">
          <li>Request access to your data</li>
          <li>Request corrections</li>
          <li>Request deletion of your account</li>
        </ul>
      </Section>
      <Section n={7} title="Changes">
        <p>We may update this policy as the platform evolves.</p>
      </Section>
    </WebsiteContentPage>
  );
}

export function WebsiteTerms() {
  return (
    <WebsiteContentPage title="Terms of Service">
      <p className="text-slate-600 sm:pl-11">By using KennelSync, you agree to the following terms:</p>
      <Section n={1} title="Acceptance of Terms">
        <p>By accessing or using KennelSync, you agree to comply with these terms.</p>
      </Section>
      <Section n={2} title="Service Description">
        <p>KennelSync provides tools for managing kennels, bookings, pets, and customer relationships.</p>
      </Section>
      <Section n={3} title="User Roles">
        <ul className="list-disc space-y-2 pl-5 marker:text-emerald-600">
          <li>
            <span className="font-medium text-slate-800">Owners:</span> manage kennel operations and data
          </li>
          <li>
            <span className="font-medium text-slate-800">Employees:</span> assist in operations
          </li>
          <li>
            <span className="font-medium text-slate-800">Customers:</span> manage pet information and bookings
          </li>
        </ul>
      </Section>
      <Section n={4} title="Payments & Subscriptions">
        <ul className="list-disc space-y-2 pl-5 marker:text-emerald-600">
          <li>Kennel owners may be required to pay a subscription fee</li>
          <li>Payments are processed through Stripe</li>
          <li>Failure to maintain an active subscription may limit access</li>
        </ul>
      </Section>
      <Section n={5} title="Responsibility">
        <p>KennelSync is not responsible for:</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-emerald-600">
          <li>Animal care decisions</li>
          <li>Disputes between users</li>
          <li>Service outcomes provided by kennels</li>
        </ul>
      </Section>
      <Section n={6} title="Account Security">
        <p>Users are responsible for maintaining the security of their accounts.</p>
      </Section>
      <Section n={7} title="Termination">
        <p>We reserve the right to suspend or terminate accounts that violate these terms.</p>
      </Section>
      <Section n={8} title="Limitation of Liability">
        <p>
          KennelSync is provided &ldquo;as is&rdquo; without warranties. We are not liable for indirect or incidental
          damages.
        </p>
      </Section>
    </WebsiteContentPage>
  );
}

export function WebsiteHelp() {
  return (
    <WebsiteContentPage title="Help & Support">
      <p className="text-slate-600 sm:pl-11">
        We&apos;re here to help you get the most out of KennelSync.
      </p>
      <section className="sm:pl-11">
        <h2 className="text-lg font-semibold text-slate-900">Getting Started</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-emerald-600">
          <li>Create an account</li>
          <li>Set up your profile</li>
          <li>Add your pets or kennel</li>
          <li>Start managing bookings</li>
        </ul>
      </section>
      <section className="sm:pl-11">
        <h2 className="text-lg font-semibold text-slate-900">For Kennel Owners</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-emerald-600">
          <li>Set up your kennel profile</li>
          <li>Add services, rooms, and pricing</li>
          <li>Manage bookings and check-ins</li>
          <li>Track payments and reports</li>
        </ul>
      </section>
      <section className="sm:pl-11">
        <h2 className="text-lg font-semibold text-slate-900">For Customers</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-emerald-600">
          <li>Add your pets</li>
          <li>Upload vaccination records</li>
          <li>Book stays with kennels</li>
          <li>Manage your reservations</li>
        </ul>
      </section>
      <section className="sm:pl-11">
        <h2 className="text-lg font-semibold text-slate-900">Common Questions</h2>
        <dl className="mt-4 space-y-5">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/35 px-4 py-4">
            <dt className="font-semibold text-slate-900">Q: How do I book a stay?</dt>
            <dd className="mt-2 text-slate-600">
              Go to your dashboard, select your pet, and choose a kennel and dates.
            </dd>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/35 px-4 py-4">
            <dt className="font-semibold text-slate-900">Q: How do I upload vaccinations?</dt>
            <dd className="mt-2 text-slate-600">
              Open your dog&apos;s profile and add vaccination records in the health section.
            </dd>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/35 px-4 py-4">
            <dt className="font-semibold text-slate-900">Q: How do payments work?</dt>
            <dd className="mt-2 text-slate-600">Payments are securely processed through Stripe.</dd>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/35 px-4 py-4">
            <dt className="font-semibold text-slate-900">Q: What if I need help?</dt>
            <dd className="mt-2 text-slate-600">Contact support using the information below.</dd>
          </div>
        </dl>
      </section>
      <section className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white px-6 py-6 sm:pl-11">
        <h2 className="text-lg font-semibold text-slate-900">Support Contact</h2>
        <p className="mt-3 text-slate-600">
          Email:{" "}
          <a
            href="mailto:support@kennelsync.com"
            className="font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
          >
            support@kennelsync.com
          </a>
        </p>
      </section>
    </WebsiteContentPage>
  );
}
