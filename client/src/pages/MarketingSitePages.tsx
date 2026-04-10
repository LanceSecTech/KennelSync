import type { ReactNode } from "react";
import { CalendarDays, CreditCard, LayoutDashboard, UsersRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

/** Shared marketing page chrome — edit copy inside each page component below. */
function PageSection({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

function MarketingHero({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-emerald-100/70">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_20%,rgba(16,185,129,0.1),transparent_38%),linear-gradient(180deg,#f8fffb_0%,#ffffff_70%)]" />
      <PageSection className="relative py-16 sm:py-20 lg:py-24">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">{subtitle}</p>
        {children ? <div className="mt-8">{children}</div> : null}
      </PageSection>
    </section>
  );
}

function ScreenshotPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex aspect-[16/10] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
      <span className="px-4 text-center text-sm font-medium text-slate-500">{label}</span>
    </div>
  );
}

function BottomCTA({
  headline,
  sub,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  headline: string;
  sub: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <section className="border-t border-slate-200 bg-slate-50/80">
      <PageSection className="py-16 text-center sm:py-20">
        <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{headline}</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">{sub}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href={primaryHref}>
            <Button className="h-11 rounded-full bg-emerald-600 px-7 text-sm font-semibold text-white hover:bg-emerald-700">
              {primaryLabel}
            </Button>
          </Link>
          <Link href={secondaryHref}>
            <Button variant="outline" className="h-11 rounded-full border-slate-300 px-7 text-sm font-semibold">
              {secondaryLabel}
            </Button>
          </Link>
        </div>
      </PageSection>
    </section>
  );
}

export function WebsiteMarketingFeatures() {
  const pillars = [
    {
      title: "Bookings & scheduling",
      body: "Reduce double-bookings and front-desk friction with a single source of truth for stays and services.",
    },
    {
      title: "Rooms & occupancy",
      body: "See capacity and assignments clearly so teams can place dogs confidently and respond to changes fast.",
    },
    {
      title: "Dog profiles & compliance",
      body: "Keep vaccination and care notes organized so staff and owners stay aligned on requirements.",
    },
    {
      title: "Staff workflows",
      body: "Check-in, check-out, and daily tasks flow in one system—built for busy kennel floors.",
    },
    {
      title: "Customer experience",
      body: "Give pet parents a straightforward way to book, pay, and stay informed without overwhelming your team.",
    },
    {
      title: "Owner visibility",
      body: "Dashboards and reports help leaders understand utilization, revenue signals, and operational load.",
    },
  ];

  return (
    <div>
      <MarketingHero
        eyebrow="Features"
        title="Everything your kennel needs to run day-to-day—without the clutter."
        subtitle="KennelSync connects bookings, rooms, dog records, staff tasks, and customer touchpoints into one professional platform."
      />
      <PageSection className="py-16 sm:py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p) => (
            <Card key={p.title} className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">{p.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-600">{p.body}</CardContent>
            </Card>
          ))}
        </div>
      </PageSection>
      <PageSection className="pb-16 sm:pb-20">
        <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Product gallery</h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Swap these placeholders for real screenshots in <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">MarketingSitePages.tsx</code>{" "}
          (search for <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">ScreenshotPlaceholder</code>).
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {["Owner Dashboard", "Booking Management", "Dog Profiles", "Employee Workflow", "Customer Booking"].map((label) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <ScreenshotPlaceholder label={`${label} — add image`} />
              <p className="mt-3 text-sm font-semibold text-slate-900">{label}</p>
            </div>
          ))}
        </div>
      </PageSection>
      <BottomCTA
        headline="See how KennelSync fits your operation"
        sub="Walk through workflows with your team and map the rollout that makes sense for your kennel."
        primaryHref="/contact"
        primaryLabel="Book a Demo"
        secondaryHref="/login?mode=signup"
        secondaryLabel="Start Free"
      />
    </div>
  );
}

/**
 * Owner marketing screenshots — drop files in `client/public/` (e.g. `/owner-hero.png`) and set URLs here.
 * Leave as null to show styled placeholders until assets are ready.
 */
const OWNER_PAGE_SCREENSHOTS = {
  /** Main hero preview (wide) — recommended ~1600×1200 or similar, top-cropped dashboard. */
  heroMain: null as string | null,
  /** Smaller inset card (e.g. bookings or reports) — ~640×480 works well. */
  heroInset: null as string | null,
} as const;

function OwnerHeroPreviewPanel() {
  const { heroMain, heroInset } = OWNER_PAGE_SCREENSHOTS;

  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div className="rounded-3xl border border-slate-200/90 bg-white p-2 shadow-[0_24px_60px_-12px_rgba(16,185,129,0.2)] ring-1 ring-slate-900/[0.04]">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 py-3">
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-red-300/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/90" />
          </div>
          <div className="ml-2 min-w-0 flex-1 truncate rounded-md border border-slate-200/80 bg-white px-3 py-1.5 text-center text-[11px] font-medium tracking-tight text-slate-400 shadow-inner">
            app.kennelsync.com / owner
          </div>
        </div>
        <div className="relative mt-2 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
          {heroMain ? (
            <img
              src={heroMain}
              alt="KennelSync owner dashboard preview"
              className="aspect-[4/3] w-full object-cover object-top"
            />
          ) : (
            <div className="flex aspect-[4/3] w-full flex-col bg-gradient-to-br from-emerald-50/90 via-white to-slate-100 p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700/80">Today</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 sm:text-3xl">78%</p>
                  <p className="text-xs text-slate-500">Occupancy</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-white/90 px-3 py-2 text-right shadow-sm">
                  <p className="text-[10px] font-medium text-slate-500">Active stays</p>
                  <p className="text-lg font-semibold tabular-nums text-slate-900">46</p>
                </div>
              </div>
              <div className="mt-5 grid flex-1 grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-xl border border-slate-200/80 bg-white/80 p-2 shadow-sm sm:p-3">
                  <div className="h-2 w-8 rounded bg-emerald-200/80" />
                  <div className="mt-3 space-y-1.5">
                    <div className="h-1.5 rounded bg-slate-200" />
                    <div className="h-1.5 w-4/5 rounded bg-slate-100" />
                  </div>
                </div>
                <div className="col-span-2 rounded-xl border border-slate-200/80 bg-white/90 p-2 shadow-sm sm:p-3">
                  <div className="flex gap-2">
                    <div className="h-16 flex-1 rounded-lg bg-gradient-to-b from-emerald-100/50 to-slate-50" />
                    <div className="hidden w-20 flex-col justify-between rounded-lg border border-slate-100 bg-slate-50/80 p-2 sm:flex">
                      <div className="h-1.5 w-full rounded bg-slate-200" />
                      <div className="h-1.5 w-2/3 rounded bg-slate-200" />
                      <div className="h-1.5 w-full rounded bg-slate-200" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 mt-4 flex justify-end sm:absolute sm:bottom-[-1.25rem] sm:left-[-0.5rem] sm:mt-0 sm:w-[46%] sm:max-w-[240px] lg:bottom-[-1.75rem] lg:left-[-1rem] lg:max-w-[260px]">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_40px_-8px_rgba(15,23,42,0.18)]">
          {heroInset ? (
            <img
              src={heroInset}
              alt="KennelSync owner workflow detail"
              className="aspect-[4/3] w-full rounded-xl object-cover object-top"
            />
          ) : (
            <div className="flex aspect-[4/3] flex-col justify-between rounded-xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600">
                <span>Bookings</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Live</span>
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
                    <div className="h-6 w-6 shrink-0 rounded-md bg-emerald-100/80" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="h-1.5 rounded bg-slate-200" />
                      <div className="h-1 w-2/3 rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OwnersBookDemoSection() {
  return (
    <section className="relative overflow-hidden border-y border-emerald-900/20 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <PageSection className="relative py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/95">For kennel owners</p>
          <h2 className="mt-4 text-balance text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-4xl">
            Book a demo tailored to your kennel
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-slate-300 sm:text-lg">
            Walk through owner workflows with our team—services, rooms, staff handoffs, and how you&apos;ll measure
            performance as you grow. No generic tour; we focus on your operation.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/contact">
              <Button className="h-12 rounded-full bg-emerald-500 px-8 text-sm font-semibold text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-400">
                Book a Demo
              </Button>
            </Link>
            <a href="mailto:support@kennelsync.com?subject=KennelSync%20Owner%20Demo">
              <Button
                variant="outline"
                className="h-12 rounded-full border-white/25 bg-white/5 px-7 text-sm font-semibold text-white hover:bg-white/10 hover:text-white"
              >
                Email us
              </Button>
            </a>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            Prefer to explore first?{" "}
            <Link href="/login?mode=signup" className="font-medium text-emerald-400 underline-offset-4 hover:text-emerald-300 hover:underline">
              Start free
            </Link>
          </p>
        </div>
      </PageSection>
    </section>
  );
}

export function WebsiteMarketingOwners() {
  const ownerValues: { icon: typeof CalendarDays; title: string; body: string }[] = [
    {
      icon: CalendarDays,
      title: "Manage bookings",
      body: "One calendar for stays and services—fewer conflicts, clearer status from inquiry to checkout.",
    },
    {
      icon: UsersRound,
      title: "Organize staff workflows",
      body: "Align your team on rooms, tasks, and handoffs so the floor runs smoothly even on busy days.",
    },
    {
      icon: CreditCard,
      title: "Track payments & subscriptions",
      body: "See revenue signals and billing context alongside operations—not in a separate spreadsheet.",
    },
    {
      icon: LayoutDashboard,
      title: "Run daily operations smoothly",
      body: "Dashboards and routines built for kennels: occupancy, check-ins, and what needs attention today.",
    },
  ];

  return (
    <div>
      <section className="relative overflow-hidden border-b border-emerald-100/70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_20%,rgba(16,185,129,0.1),transparent_38%),linear-gradient(180deg,#f8fffb_0%,#ffffff_72%)]" />
        <PageSection className="relative pb-20 pt-14 sm:pb-24 sm:pt-16 lg:pb-28 lg:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="order-2 lg:order-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">For owners</p>
              <h1 className="mt-4 text-balance text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
                Command your kennel with clarity—not spreadsheets and side channels.
              </h1>
              <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-slate-600">
                Set the standard for how your team operates: services, rooms, bookings, and financial visibility in one
                trusted system your staff and customers can rely on.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/contact">
                  <Button className="h-11 rounded-full bg-emerald-600 px-7 text-sm font-semibold text-white hover:bg-emerald-700">
                    Book a Demo
                  </Button>
                </Link>
                <Link href="/login?mode=signup">
                  <Button variant="outline" className="h-11 rounded-full border-slate-300 px-7 text-sm font-semibold">
                    Start Free
                  </Button>
                </Link>
              </div>
            </div>
            <div className="order-1 lg:order-2 lg:pl-4">
              <OwnerHeroPreviewPanel />
            </div>
          </div>
        </PageSection>
      </section>

      <PageSection className="py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">Why owners choose KennelSync</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">Built for how you actually run the business</h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {ownerValues.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <CardTitle className="text-lg font-semibold leading-snug">{title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-slate-600">{body}</CardContent>
            </Card>
          ))}
        </div>
      </PageSection>

      <OwnersBookDemoSection />

      <PageSection className="pb-16 pt-4 sm:pb-20">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 sm:p-8">
          <h3 className="text-lg font-semibold text-slate-900">Reporting, brand, and scale</h3>
          <p className="mt-2 max-w-3xl text-slate-600">
            Understand occupancy and booking volume, present a polished experience to pet parents, and grow headcount or
            complexity without losing the single source of truth your team depends on.
          </p>
        </div>
      </PageSection>

      <BottomCTA
        headline="Ready when you are"
        sub="Create an account to explore the product, or browse the full feature set."
        primaryHref="/login?mode=signup"
        primaryLabel="Sign Up"
        secondaryHref="/features"
        secondaryLabel="Explore Features"
      />
    </div>
  );
}

export function WebsiteMarketingEmployees() {
  return (
    <div>
      <MarketingHero
        eyebrow="For Employees"
        title="Spend less time hunting information—and more time caring for dogs."
        subtitle="KennelSync gives front-line staff clear tasks, accurate booking context, and room assignments that match what’s happening on the floor."
      />
      <PageSection className="py-16 sm:py-20">
        <div className="grid gap-5 md:grid-cols-2">
          {[
            {
              title: "Check-in & check-out",
              body: "Move stays through the day with consistent steps and fewer handoff mistakes.",
            },
            {
              title: "Rooms & assignments",
              body: "Place dogs where they belong and adjust when the schedule shifts.",
            },
            {
              title: "Dog context at a glance",
              body: "See the profile and care signals you need without digging through messages.",
            },
            {
              title: "Daily rhythm",
              body: "Today’s work surfaces in one place so the team stays aligned under pressure.",
            },
          ].map((x) => (
            <Card key={x.title} className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">{x.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-600">{x.body}</CardContent>
            </Card>
          ))}
        </div>
      </PageSection>
      <PageSection className="pb-16 sm:pb-20">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-slate-900">Employee workflow preview</h2>
          <p className="mt-2 text-sm text-slate-600">Replace with a real screenshot of Today / Check-in / Rooms.</p>
          <div className="mt-6">
            <ScreenshotPlaceholder label="Employee Workflow — add image" />
          </div>
        </div>
      </PageSection>
      <BottomCTA
        headline="Equip your team with tools they’ll actually use"
        sub="Schedule a walkthrough focused on daily staff workflows."
        primaryHref="/contact"
        primaryLabel="Book a Demo"
        secondaryHref="/owners"
        secondaryLabel="For Owners"
      />
    </div>
  );
}

export function WebsiteMarketingCustomers() {
  return (
    <div>
      <MarketingHero
        eyebrow="For Customers"
        title="A booking experience that feels as professional as your kennel."
        subtitle="Pet parents get clear steps to reserve stays, manage dog profiles, and understand status—without overwhelming your inbox."
      />
      <PageSection className="py-16 sm:py-20">
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Simple booking</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-600">
              Book services and dates with guidance that reduces back-and-forth with the front desk.
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Dog profiles</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-600">
              Keep vaccination and care details current so check-in stays smooth and compliant.
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Stay visibility</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-600">
              Understand reservations and payment status in one place—fewer surprises for families.
            </CardContent>
          </Card>
        </div>
      </PageSection>
      <PageSection className="pb-16 sm:pb-20">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-slate-900">Customer experience preview</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <ScreenshotPlaceholder label="Booking flow — add image" />
            <ScreenshotPlaceholder label="My Stays / profile — add image" />
          </div>
        </div>
      </PageSection>
      <BottomCTA
        headline="Give your customers a experience that matches your care"
        sub="See the customer journey end-to-end with our team."
        primaryHref="/login?mode=signup"
        primaryLabel="Sign Up"
        secondaryHref="/contact"
        secondaryLabel="Book a Demo"
      />
    </div>
  );
}

export function WebsiteMarketingContact() {
  return (
    <div>
      <MarketingHero
        eyebrow="Contact a Professional"
        title="Book a demo or talk to a KennelSync specialist."
        subtitle="Whether you’re evaluating software, planning rollout, or training staff—we’ll help you map a practical path forward."
      >
        <div className="flex flex-wrap gap-3">
          <a href="mailto:support@kennelsync.com?subject=KennelSync%20Demo%20Request">
            <Button className="h-11 rounded-full bg-emerald-600 px-7 text-sm font-semibold text-white hover:bg-emerald-700">
              Email to Book a Demo
            </Button>
          </a>
          <Link href="/help">
            <Button variant="outline" className="h-11 rounded-full border-slate-300 px-7 text-sm font-semibold">
              Help &amp; Support
            </Button>
          </Link>
        </div>
      </MarketingHero>
      <PageSection className="py-16 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>What we’ll cover</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc space-y-2 text-slate-600">
                <li>Your kennel size, services, and staffing model</li>
                <li>Owner, employee, and customer workflows</li>
                <li>Rollout considerations and training expectations</li>
                <li>Questions about billing, security, and integrations</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Direct contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-slate-600">
              <p>
                <span className="font-medium text-slate-800">Email:</span>{" "}
                <a
                  href="mailto:support@kennelsync.com"
                  className="text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
                >
                  support@kennelsync.com
                </a>
              </p>
              <p className="text-sm text-slate-500">
                Edit this copy and contact details in <code className="rounded bg-slate-100 px-1 py-0.5">MarketingSitePages.tsx</code>{" "}
                (<code className="rounded bg-slate-100 px-1 py-0.5">WebsiteMarketingContact</code>).
              </p>
            </CardContent>
          </Card>
        </div>
      </PageSection>
      <BottomCTA
        headline="Prefer to explore on your own first?"
        sub="Create an account and experience KennelSync with your team."
        primaryHref="/login?mode=signup"
        primaryLabel="Sign Up"
        secondaryHref="/features"
        secondaryLabel="Browse Features"
      />
    </div>
  );
}
