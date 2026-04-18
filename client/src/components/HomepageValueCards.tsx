import { Link } from "wouter";
import { type LucideIcon, LayoutDashboard, Layers3, Sparkles, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SCROLL_MARGIN_CLASS = "scroll-mt-[5.75rem]";

type ExploreTopic = {
  key: string;
  detailSectionId: string;
  title: string;
  cardBlurb: string;
  Icon: LucideIcon;
  detailHeading: string;
  detailIntro: string;
  bullets: string[];
  moreHref: string;
  moreLabel: string;
};

const TOPICS: ExploreTopic[] = [
  {
    key: "features",
    detailSectionId: "home-detail-features",
    title: "Features",
    cardBlurb: "Bookings, rooms, dog records, staff tasks, and customer touchpoints in one platform.",
    Icon: Layers3,
    detailHeading: "Features",
    detailIntro:
      "Everything your kennel runs on day to day—without bouncing between spreadsheets, texts, and side tools.",
    bullets: [
      "One calendar and booking source of truth for the front desk and the floor.",
      "Dog profiles, vaccines, and care notes stay where staff already work.",
      "Owners get dashboards and reporting without living in spreadsheets.",
    ],
    moreHref: "/features",
    moreLabel: "View all features",
  },
  {
    key: "owners",
    detailSectionId: "home-detail-owners",
    title: "For owners",
    cardBlurb: "Run services, capacity, and team workflows from a single control center.",
    Icon: LayoutDashboard,
    detailHeading: "For owners",
    detailIntro: "Lead your operation with one place for revenue, capacity, and how your team executes.",
    bullets: [
      "Plan capacity and revenue with calendars built for kennel reality.",
      "Align staff on rooms, check-ins, and daily priorities.",
      "Keep customer-facing booking polished without extra tools.",
    ],
    moreHref: "/owners",
    moreLabel: "Owner overview",
  },
  {
    key: "employees",
    detailSectionId: "home-detail-employees",
    title: "For employees",
    cardBlurb: "Check-ins, room moves, and dog context without hunting through messages.",
    Icon: UsersRound,
    detailHeading: "For employees",
    detailIntro: "Front-line tools that stay fast when the lobby and the floor are both under pressure.",
    bullets: [
      "Today’s work surfaces in one calm hub under pressure.",
      "Consistent check-in and check-out steps reduce handoff mistakes.",
      "Profiles show feeding, meds, and behavior notes at a glance.",
    ],
    moreHref: "/employees",
    moreLabel: "Staff workflows",
  },
  {
    key: "customers",
    detailSectionId: "home-detail-customers",
    title: "For customers",
    cardBlurb: "Clear booking steps, current profiles, and stay status families can trust.",
    Icon: Sparkles,
    detailHeading: "For customers",
    detailIntro: "Pet parents get a straightforward path to book, pay, and stay informed—without flooding your inbox.",
    bullets: [
      "Guided booking that reduces back-and-forth with the desk.",
      "Vaccines and care details stay current before arrival.",
      "Upcoming stays and payments visible in one simple home.",
    ],
    moreHref: "/customers",
    moreLabel: "Customer experience",
  },
];

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function ExploreNavCard({
  topic,
  onSelect,
}: {
  topic: ExploreTopic;
  onSelect: () => void;
}) {
  const Icon = topic.Icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2"
      aria-label={`${topic.title}: jump to details further down this page`}
    >
      <Card
        className={cn(
          "h-full rounded-2xl border-slate-200/90 bg-white shadow-sm transition-all duration-200",
          "group-hover:-translate-y-0.5 group-hover:shadow-md group-active:translate-y-0",
        )}
      >
        <CardContent className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
            <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">{topic.title}</h3>
            <p className="line-clamp-2 text-sm leading-snug text-slate-600">{topic.cardBlurb}</p>
          </div>
          <span className="text-xs font-semibold text-emerald-700">Jump to details ↓</span>
        </CardContent>
      </Card>
    </button>
  );
}

function DetailPanel({ topic }: { topic: ExploreTopic }) {
  return (
    <section
      id={topic.detailSectionId}
      className={cn(SCROLL_MARGIN_CLASS, "rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8")}
      aria-labelledby={`${topic.detailSectionId}-heading`}
    >
      <h3 id={`${topic.detailSectionId}-heading`} className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
        {topic.detailHeading}
      </h3>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">{topic.detailIntro}</p>
      <ul className="mt-5 list-inside list-disc space-y-2.5 text-sm leading-relaxed text-slate-600 marker:text-emerald-600 sm:text-[15px]">
        {topic.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <div className="mt-6">
        <Link href={topic.moreHref}>
          <Button variant="outline" className="h-10 rounded-full border-slate-300 px-6 text-sm font-semibold">
            {topic.moreLabel}
          </Button>
        </Link>
      </div>
    </section>
  );
}

/** Card grid only — pairs with {@link HomepageExploreDetails} after the product snapshot. */
export function HomepageExploreCards() {
  return (
    <section
      id="explore"
      aria-labelledby="homepage-explore-heading"
      className={cn(SCROLL_MARGIN_CLASS, "border-y border-slate-200 bg-slate-50/60")}
    >
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">Explore KennelSync</p>
          <h2 id="homepage-explore-heading" className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Start with a quick lens
          </h2>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-600 sm:text-base">
            Each card scrolls to a short section below the product snapshot—full pages stay in the top navigation.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:mt-12 lg:grid-cols-4 lg:gap-5">
          {TOPICS.map((topic) => (
            <ExploreNavCard key={topic.key} topic={topic} onSelect={() => scrollToSection(topic.detailSectionId)} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Long-form bullets + links — placed after the snapshot so the page stays scannable first. */
export function HomepageExploreDetails() {
  return (
    <section
      className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:space-y-10 sm:px-6 sm:py-16 lg:space-y-12 lg:px-8 lg:py-20"
      aria-label="KennelSync details by audience"
    >
      {TOPICS.map((topic) => (
        <DetailPanel key={topic.detailSectionId} topic={topic} />
      ))}
    </section>
  );
}
