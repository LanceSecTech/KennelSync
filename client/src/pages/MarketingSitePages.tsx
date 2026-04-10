import type { ReactNode } from "react";
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

export function WebsiteMarketingOwners() {
  return (
    <div>
      <MarketingHero
        eyebrow="For Owners"
        title="Command your kennel with clarity—not spreadsheets and side channels."
        subtitle="Set the standard for how your team operates: services, rooms, bookings, and financial visibility in one trusted place."
      />
      <PageSection className="py-16 sm:py-20">
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle>Operational control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-slate-600">
              <p>Configure services and pricing, manage room inventory, and keep booking status visible across the team.</p>
              <p>Reduce reliance on informal updates—everyone works from the same live picture of the business.</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Growth-ready</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-600">
              Scale headcount and locations with roles for staff and a customer experience that stays consistent.
            </CardContent>
          </Card>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Reporting & insight</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-600">
              Understand occupancy patterns, booking volume, and financial signals to guide staffing and promotions.
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Professional brand</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-600">
              Present a polished, trustworthy experience to pet parents from first browse through checkout.
            </CardContent>
          </Card>
        </div>
      </PageSection>
      <BottomCTA
        headline="Lead your kennel with a platform built for real operations"
        sub="Talk through owner workflows, onboarding, and how KennelSync supports your team."
        primaryHref="/contact"
        primaryLabel="Book a Demo"
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
