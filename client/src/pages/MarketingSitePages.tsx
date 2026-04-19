import type { ReactNode } from "react";
import { CalendarDays, CreditCard, LayoutDashboard, UsersRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  MarketingScreenshotSlideshow,
  MARKETING_FEATURES_GALLERY_SLIDES,
  OWNER_HERO_SLIDES,
} from "@/components/MarketingScreenshotSlideshow";
import { MarketingScreenshotGrid, type MarketingGridItem } from "@/components/MarketingScreenshotGrid";
import { marketingImages } from "@/lib/marketingImagePaths";
import { marketingCaptionTextClass } from "@/lib/marketingScreenshotStyles";
import { cn } from "@/lib/utils";

/** Owner page — full-width gallery (edit captions here or swap paths in `marketingImagePaths.ts`). */
const OWNERS_PRODUCT_GALLERY: MarketingGridItem[] = [
  {
    src: marketingImages.owners.dashboard,
    alt: "KennelSync owner dashboard",
    caption:
      "Steer the business from one authoritative dashboard—occupancy, momentum, and what deserves your attention before the day runs away from you.",
  },
  {
    src: marketingImages.owners.availWeek,
    alt: "KennelSync availability calendar for kennel owners",
    caption:
      "Plan and protect capacity with a calendar that stays truthful as bookings move. Your team stops debating “what’s open” and starts executing.",
  },
  {
    src: marketingImages.owners.bookingsMonth,
    alt: "KennelSync bookings month view",
    caption:
      "See the month like an owner should: peaks, holes, and stay volume at a glance—so staffing and revenue decisions stay grounded in reality.",
  },
  {
    src: marketingImages.owners.financials,
    alt: "KennelSync financials for kennel owners",
    caption:
      "Pair operations with financial context in a view that feels enterprise-grade—built for owners who need numbers without living in a spreadsheet.",
  },
  {
    src: marketingImages.owners.reports,
    alt: "KennelSync owner reports",
    caption:
      "Export-ready insight that respects how kennels actually operate—professional enough for partners, clear enough for day-to-day leadership.",
  },
];

const EMPLOYEES_PRODUCT_GALLERY: MarketingGridItem[] = [
  {
    src: marketingImages.employees.today,
    alt: "KennelSync employee tasks and today view",
    caption:
      "Walk in knowing exactly what to tackle first—tasks, priorities, and alerts surfaced so nothing important waits on a sticky note.",
  },
  {
    src: marketingImages.employees.dogs,
    alt: "KennelSync employee dog profiles",
    caption:
      "Pull the right care context in seconds: feeding, meds, behavior, and signals your team needs to keep every dog safe and comfortable.",
  },
  {
    src: marketingImages.employees.checkIn,
    alt: "KennelSync check-in workflow",
    caption:
      "Check-ins that follow a consistent, professional rhythm—fewer missed steps, smoother handoffs, and a lobby that stays under control.",
  },
  {
    src: marketingImages.employees.checkOut,
    alt: "KennelSync check-out workflow",
    caption:
      "Close out stays with clarity for staff and pet parents alike—accurate handoffs, tidy records, and a polished last impression.",
  },
  {
    src: marketingImages.employees.dashboard,
    alt: "KennelSync employee dashboard",
    caption:
      "Your shift at a glance: active dogs, room reality, and the flow of the day—one calm hub instead of five different tools.",
  },
];

const CUSTOMERS_PRODUCT_GALLERY: MarketingGridItem[] = [
  {
    src: marketingImages.customers.book,
    alt: "KennelSync customer booking flow",
    caption:
      "Reserve stays through a clear, guided flow that feels as careful as your kennel—pet parents know what to expect, and your inbox stays quieter.",
  },
  {
    src: marketingImages.customers.dogProfile,
    alt: "KennelSync pet owner dog profile",
    caption:
      "Keep every dog’s story current before arrival—vaccines, care notes, and contacts in one trustworthy place that reduces stress at drop-off.",
  },
  {
    src: marketingImages.customers.myStays,
    alt: "KennelSync upcoming stays for customers",
    caption:
      "See upcoming reservations and stay status without chasing texts—confidence for families, fewer “where are we?” interruptions for your desk.",
  },
  {
    src: marketingImages.customers.dashboard,
    alt: "KennelSync customer dashboard",
    caption:
      "A simple home for bookings, dogs, and what’s next—pet parents stay oriented, and your brand feels as organized as your facility.",
  },
  {
    src: marketingImages.customers.myDogs,
    alt: "KennelSync customer dog list",
    caption:
      "Every pet in the family, organized and ready for the next booking—less repetition, fewer errors, and a more personal experience.",
  },
];

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
      <PageSection className="relative py-12 sm:py-16 lg:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 sm:text-sm">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-balance text-3xl font-semibold leading-tight text-slate-900 sm:mt-4 sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:mt-5 sm:text-lg">{subtitle}</p>
        {children ? <div className="mt-8">{children}</div> : null}
      </PageSection>
    </section>
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
        <h2 className="text-balance text-2xl font-semibold text-slate-900 sm:text-3xl">{headline}</h2>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-slate-600">{sub}</p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link href={primaryHref}>
            <Button className="h-11 w-full rounded-full bg-emerald-600 px-7 text-sm font-semibold text-white hover:bg-emerald-700 sm:w-auto">
              {primaryLabel}
            </Button>
          </Link>
          <Link href={secondaryHref}>
            <Button variant="outline" className="h-11 w-full rounded-full border-slate-300 px-7 text-sm font-semibold sm:w-auto">
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
      <PageSection className="py-14 sm:py-20">
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
      <PageSection className="pb-14 sm:pb-20">
        <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Product gallery</h2>
        <p className="mt-2 max-w-2xl text-pretty text-slate-600">
          A quick tour across owner, staff, and customer surfaces—auto-advancing with swipe and arrow controls on any device.
        </p>
        <div className="mx-auto mt-6 max-w-4xl sm:mt-7">
          <MarketingScreenshotSlideshow slides={MARKETING_FEATURES_GALLERY_SLIDES} />
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

/** Inset card only — main hero uses `OWNER_HERO_SLIDES` in MarketingScreenshotSlideshow.tsx */
const OWNER_PAGE_INSET_IMAGE: string | null = null;

function OwnerHeroPreviewPanel() {
  const heroInset = OWNER_PAGE_INSET_IMAGE;

  return (
    <div className="relative mx-auto w-full max-w-lg pb-6 sm:pb-8 lg:max-w-none">
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
        <div className="relative mt-2 overflow-hidden rounded-xl border border-slate-100/90 bg-slate-50/50 p-1.5 sm:mt-2 sm:rounded-2xl sm:p-2">
          <MarketingScreenshotSlideshow slides={OWNER_HERO_SLIDES} embedded compactMobile autoplayIntervalMs={7000} />
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
      <PageSection className="relative py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/95">For kennel owners</p>
          <h2 className="mt-4 text-balance text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-4xl">
            Book a demo tailored to your kennel
          </h2>
          <p className="mt-4 text-pretty text-[15px] leading-relaxed text-slate-300 sm:text-lg">
            Walk through owner workflows with our team—services, rooms, staff handoffs, and how you&apos;ll measure
            performance as you grow. No generic tour; we focus on your operation.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:items-center">
            <Link href="/contact">
              <Button className="h-12 w-full rounded-full bg-emerald-500 px-8 text-sm font-semibold text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-400 sm:w-auto">
                Book a Demo
              </Button>
            </Link>
            <a href="mailto:lance@kennelsync.com?subject=KennelSync%20Owner%20Demo">
              <Button
                variant="outline"
                className="h-12 w-full rounded-full border-white/25 bg-white/5 px-7 text-sm font-semibold text-white hover:bg-white/10 hover:text-white sm:w-auto"
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
        <PageSection className="relative pb-16 pt-12 sm:pb-24 sm:pt-16 lg:pb-28 lg:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="order-2 lg:order-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">For owners</p>
              <h1 className="mt-3 text-balance text-3xl font-semibold leading-tight text-slate-900 sm:mt-4 sm:text-5xl">
                Command your kennel with clarity—not spreadsheets and side channels.
              </h1>
              <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-slate-600 sm:mt-5 sm:text-lg">
                Set the standard for how your team operates: services, rooms, bookings, and financial visibility in one
                trusted system your staff and customers can rely on.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
                <Link href="/contact">
                  <Button className="h-11 w-full rounded-full bg-emerald-600 px-7 text-sm font-semibold text-white hover:bg-emerald-700 sm:w-auto">
                    Book a Demo
                  </Button>
                </Link>
                <Link href="/login?mode=signup">
                  <Button variant="outline" className="h-11 w-full rounded-full border-slate-300 px-7 text-sm font-semibold sm:w-auto">
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

      <PageSection className="py-14 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">Why owners choose KennelSync</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">Built for how you actually run the business</h2>
        </div>
        <div className="mt-9 grid gap-4 sm:mt-12 sm:gap-5 sm:grid-cols-2">
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
        <div className="mt-12 border-t border-slate-200/70 pt-12 sm:mt-16 sm:pt-16">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Inside the owner experience</h3>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-600 sm:text-[15px]">
              Real screens from the product—paired with how each view supports revenue, capacity, and team execution.
            </p>
          </div>
          <div className="mx-auto mt-8 max-w-5xl sm:mt-9">
            <MarketingScreenshotGrid items={OWNERS_PRODUCT_GALLERY} />
          </div>
        </div>
      </PageSection>

      <OwnersBookDemoSection />

      <PageSection className="pb-14 pt-4 sm:pb-20">
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
      <PageSection className="py-14 sm:py-20">
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
      <PageSection className="pb-14 sm:pb-20">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_36px_-10px_rgba(15,23,42,0.1)] sm:p-8 lg:p-9">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Built for the floor, not the brochure</h2>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-600 sm:text-[15px]">
              The screens your team lives in—check-ins, dogs, and the rhythm of the day—presented with room to breathe.
            </p>
          </div>
          <div className="mx-auto mt-8 max-w-5xl sm:mt-9">
            <MarketingScreenshotGrid items={EMPLOYEES_PRODUCT_GALLERY} />
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
      <PageSection className="py-14 sm:py-20">
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
      <PageSection className="pb-14 sm:pb-20">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_36px_-10px_rgba(15,23,42,0.1)] sm:p-8 lg:p-9">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">The experience pet parents remember</h2>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-600 sm:text-[15px]">
              Booking, profiles, and stay visibility that feel calm, clear, and worthy of the care you deliver in person.
            </p>
          </div>
          <div className="mx-auto mt-8 max-w-5xl sm:mt-9">
            <MarketingScreenshotGrid items={CUSTOMERS_PRODUCT_GALLERY} />
          </div>
          <div className="mx-auto mt-12 max-w-lg border-t border-slate-200/70 pt-10 text-center sm:mt-14 sm:pt-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700/90">On the go</p>
            <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">Mobile booking, same premium feel</h3>
            <p className="mx-auto mt-2 max-w-sm text-pretty text-sm leading-relaxed text-slate-600">
              Pet parents can start a reservation from their phone—intentionally framed here so mobile reads as a first-class
              experience, not an afterthought.
            </p>
            <div className="mx-auto mt-6 max-w-[260px] sm:mt-7">
              <div className="rounded-[1.6rem] border-[9px] border-slate-800 bg-slate-800 p-0.5 shadow-[0_20px_48px_-12px_rgba(15,23,42,0.38)] ring-1 ring-black/10">
                <div className="overflow-hidden rounded-[1.05rem] bg-slate-950">
                  <img
                    src={marketingImages.customersMobile.newBooking}
                    alt="KennelSync mobile new booking"
                    className="w-full object-contain object-top"
                    loading="lazy"
                  />
                </div>
              </div>
              <p className={cn(marketingCaptionTextClass, "mx-auto mt-3 max-w-sm text-center sm:mt-3.5")}>
                A focused mobile flow for new bookings—fewer taps, less confusion, and a path that reinforces trust before they
                ever reach your lobby.
              </p>
            </div>
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
          <a href="mailto:lance@kennelsync.com?subject=KennelSync%20Demo%20Request">
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
      <PageSection className="py-14 sm:py-20">
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
                  href="mailto:lance@kennelsync.com"
                  className="text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
                >
                  lance@kennelsync.com
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
