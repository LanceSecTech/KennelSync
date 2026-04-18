import { useState } from "react";
import { Link } from "wouter";
import {
  ChevronDown,
  type LucideIcon,
  LayoutDashboard,
  Layers3,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type ValueCard = {
  id: string;
  title: string;
  kicker: string;
  summary: string;
  bullets: string[];
  href: string;
  cta: string;
  Icon: LucideIcon;
};

const VALUE_CARDS: ValueCard[] = [
  {
    id: "features",
    title: "Features",
    kicker: "Platform",
    summary: "Bookings, rooms, dog records, staff tasks, and customer touchpoints together.",
    bullets: [
      "One calendar and booking source of truth for the front desk and the floor.",
      "Dog profiles, vaccines, and care notes stay where staff already work.",
      "Owners get dashboards and reporting without living in spreadsheets.",
    ],
    href: "/features",
    cta: "View all features",
    Icon: Layers3,
  },
  {
    id: "owners",
    title: "For owners",
    kicker: "Leadership",
    summary: "Run services, capacity, and team workflows from a single control center.",
    bullets: [
      "Plan capacity and revenue with calendars built for kennel reality.",
      "Align staff on rooms, check-ins, and daily priorities.",
      "Keep customer-facing booking polished without extra tools.",
    ],
    href: "/owners",
    cta: "Owner overview",
    Icon: LayoutDashboard,
  },
  {
    id: "employees",
    title: "For employees",
    kicker: "Front line",
    summary: "Check-ins, room moves, and dog context without hunting through messages.",
    bullets: [
      "Today’s work surfaces in one calm hub under pressure.",
      "Consistent check-in and check-out steps reduce handoff mistakes.",
      "Profiles show feeding, meds, and behavior notes at a glance.",
    ],
    href: "/employees",
    cta: "Staff workflows",
    Icon: UsersRound,
  },
  {
    id: "customers",
    title: "For customers",
    kicker: "Pet parents",
    summary: "Clear booking steps, current profiles, and stay status families can trust.",
    bullets: [
      "Guided booking that reduces back-and-forth with the desk.",
      "Vaccines and care details stay current before arrival.",
      "Upcoming stays and payments visible in one simple home.",
    ],
    href: "/customers",
    cta: "Customer experience",
    Icon: Sparkles,
  },
];

export function HomepageValueCards() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section
      id="explore"
      aria-labelledby="homepage-explore-heading"
      className="border-y border-slate-200 bg-slate-50/60 scroll-mt-[5.5rem]"
    >
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">Explore KennelSync</p>
          <h2 id="homepage-explore-heading" className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Pick a lens—open only what you need
          </h2>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-600 sm:text-base">
            Short summaries on the surface; a little more depth one tap away. Full pages stay available anytime from the
            top navigation.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-12 lg:gap-5">
          {VALUE_CARDS.map((card) => {
            const open = openId === card.id;
            return (
              <Collapsible
                key={card.id}
                open={open}
                onOpenChange={(next) => setOpenId(next ? card.id : null)}
              >
                <Card
                  className={cn(
                    "overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm transition-shadow",
                    open ? "ring-1 ring-emerald-200/80 shadow-md" : "hover:shadow-md",
                  )}
                >
                  <CollapsibleTrigger
                    className="flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-slate-50/80 sm:p-6"
                    aria-expanded={open}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                      <card.Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700/90">
                        {card.kicker}
                      </p>
                      <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
                      <p className="text-sm leading-relaxed text-slate-600">{card.summary}</p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200",
                        open ? "rotate-180 text-emerald-700" : "",
                      )}
                      aria-hidden
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                      <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-slate-600 marker:text-emerald-600">
                        {card.bullets.map((b) => (
                          <li key={b} className="pl-0.5">
                            {b}
                          </li>
                        ))}
                      </ul>
                      <Link href={card.href}>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 w-full rounded-full border-slate-300 text-sm font-semibold sm:w-auto sm:px-6"
                        >
                          {card.cta}
                        </Button>
                      </Link>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </section>
  );
}
