import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { marketingImages } from "@/lib/marketingImagePaths";
import {
  marketingCaptionTextClass,
  marketingShotFrame,
  marketingShotFrameInner,
  marketingSlideTitleClass,
} from "@/lib/marketingScreenshotStyles";

/**
 * Mobile / tablet slideshow frame sizing (Tailwind). Tweak the `clamp()` values to change
 * how tall the preview feels on phones without affecting desktop (`md:` and up use aspect ratio).
 *
 * - First clamp: default slides on small screens
 * - Second: `compactMobile` preset (homepage hero) — shorter, more “preview” than “hero panel”
 */
const SLIDE_MEDIA_FRAME_DEFAULT =
  "flex h-[clamp(8.75rem,36vw,10.5rem)] max-h-[42dvh] w-full min-w-0 flex-col sm:h-[clamp(10rem,34vw,12.5rem)] sm:max-h-none md:h-auto md:max-h-none md:min-h-[13.5rem] md:aspect-[16/10] lg:min-h-[14.5rem]";
const SLIDE_MEDIA_FRAME_COMPACT =
  "flex h-[clamp(7.75rem,32vw,9rem)] max-h-[36dvh] w-full min-w-0 flex-col sm:h-[clamp(9rem,30vw,11rem)] sm:max-h-none md:h-auto md:max-h-none md:min-h-[14rem] md:aspect-[16/10] lg:min-h-[16rem]";

export type MarketingSlide = {
  /** Set to a public URL (e.g. `/marketing/owner-1.png` from `client/public/`) or `null` for a placeholder. */
  src: string | null;
  title: string;
  caption?: string;
};

/** Features page — product gallery carousel. */
export const MARKETING_FEATURES_GALLERY_SLIDES: MarketingSlide[] = [
  {
    src: marketingImages.landing.dashboard,
    title: "Owner command center",
    caption:
      "See occupancy, today’s workload, and what needs attention before the floor gets busy—so you lead with data, not guesswork.",
  },
  {
    src: marketingImages.landing.availWeek,
    title: "Availability & rooms",
    caption:
      "Plan capacity across days and rooms without spreadsheet gymnastics. Everyone works from the same live picture of what’s open and what’s full.",
  },
  {
    src: marketingImages.landing.bookingsMonth,
    title: "Bookings pipeline",
    caption:
      "Track stays from inquiry to checkout in one professional workflow—fewer conflicts, clearer handoffs, and less time chasing status.",
  },
  {
    src: marketingImages.employees.checkIn,
    title: "Staff workflows",
    caption:
      "Give your team consistent check-in and daily tools so care stays high and errors stay low, even when the lobby is packed.",
  },
  {
    src: marketingImages.customers.book,
    title: "Customer booking",
    caption:
      "Pet parents get a guided, trustworthy booking path that reduces back-and-forth and reflects the quality of your kennel.",
  },
];

/** Homepage — hero / product preview carousel (strong desktop product shots). */
export const MARKETING_HOME_HERO_SLIDES: MarketingSlide[] = [
  {
    src: marketingImages.landing.dashboard,
    title: "Owner dashboard",
    caption:
      "Your day at a glance: occupancy, momentum, and operational signals in one polished view built for real kennel leadership.",
  },
  {
    src: marketingImages.landing.availWeek,
    title: "Availability calendar",
    caption:
      "Plan and defend capacity with a calendar your whole team can trust—clear, current, and ready for busy seasons.",
  },
  {
    src: marketingImages.landing.bookTab,
    title: "Bookings & workflow",
    caption:
      "Move stays through your pipeline with confidence—from holds and confirmations to the details that keep runs smooth.",
  },
];

/** Homepage — “At a glance” (secondary carousel — depth without repeating hero). */
export const MARKETING_HOME_GLANCE_SLIDES: MarketingSlide[] = [
  {
    src: marketingImages.landing.financials,
    title: "Financial visibility",
    caption:
      "Connect operational reality to revenue signals so pricing, utilization, and cash flow stay in view as you grow.",
  },
  {
    src: marketingImages.landing.bookingsMonth,
    title: "Month-wide booking view",
    caption:
      "Step back and see the month: spot peaks, gaps, and patterns before they become problems on the floor.",
  },
  {
    src: marketingImages.owners.reports,
    title: "Reporting & insight",
    caption:
      "Turn day-to-day activity into owner-ready insight—professional, export-friendly, and ready for how you actually run the business.",
  },
];

/** Owners marketing hero (inside browser chrome). */
export const OWNER_HERO_SLIDES: MarketingSlide[] = [
  {
    src: marketingImages.owners.dashboard,
    title: "Owner dashboard",
    caption:
      "Start every day with clarity: who’s in, what’s coming, and where your team should focus first.",
  },
  {
    src: marketingImages.owners.availWeek,
    title: "Availability calendar",
    caption:
      "Protect margin and service quality with scheduling and room context that stays accurate as bookings shift.",
  },
  {
    src: marketingImages.owners.bookingsMonth,
    title: "Bookings",
    caption:
      "Run a professional pipeline from request to departure—your staff and customers see the same trustworthy story.",
  },
];

function SlideMedia({ slide, imageClassName }: { slide: MarketingSlide; imageClassName?: string }) {
  if (slide.src) {
    return (
      <img
        src={slide.src}
        alt={slide.title}
        className={cn("h-full w-full object-contain object-top", imageClassName)}
        loading="lazy"
      />
    );
  }
  return (
    <div className="flex h-full min-h-0 w-full flex-col justify-end bg-gradient-to-br from-slate-100/80 via-white to-emerald-50/35 p-3 sm:p-5">
      <div className="space-y-1.5 sm:space-y-2">
        <div className="h-1.5 w-20 rounded-md bg-slate-200/90 sm:h-2 sm:w-24" />
        <div className="h-1.5 max-w-[55%] rounded-md bg-slate-100 sm:h-2" />
      </div>
      <div className="mt-auto flex gap-1.5 pt-4 sm:gap-2 sm:pt-8">
        <div className="h-10 flex-1 rounded-lg bg-white/85 shadow-sm ring-1 ring-slate-200/70 sm:h-16" />
        <div className="h-10 w-14 shrink-0 rounded-lg bg-emerald-100/50 ring-1 ring-emerald-200/50 sm:h-16 sm:w-20" />
      </div>
    </div>
  );
}

type MarketingScreenshotSlideshowProps = {
  slides: MarketingSlide[];
  /** Default 6.5s — calm, not flashy. */
  autoplayIntervalMs?: number;
  className?: string;
  /**
   * When set, replaces the default responsive frame sizing (see `SLIDE_MEDIA_FRAME_*` above).
   * Omit to use built-in mobile/tablet/desktop behavior.
   */
  mediaFrameClassName?: string;
  /** Shorter frame on phones — use for homepage hero embedded preview. */
  compactMobile?: boolean;
  /** When true, omits outer card chrome (for nested frames like the owner hero). */
  embedded?: boolean;
};

export function MarketingScreenshotSlideshow({
  slides,
  autoplayIntervalMs = 6500,
  className,
  mediaFrameClassName,
  compactMobile = false,
  embedded = false,
}: MarketingScreenshotSlideshowProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [pause, setPause] = useState(false);

  const onSelect = useCallback((carousel: CarouselApi | undefined) => {
    if (!carousel) return;
    setCurrent(carousel.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  useEffect(() => {
    if (!api || slides.length <= 1 || pause) return;
    const id = window.setInterval(() => {
      api.scrollNext();
    }, autoplayIntervalMs);
    return () => window.clearInterval(id);
  }, [api, autoplayIntervalMs, pause, slides.length]);

  if (!slides.length) return null;

  const frameClass = mediaFrameClassName ?? (compactMobile ? SLIDE_MEDIA_FRAME_COMPACT : SLIDE_MEDIA_FRAME_DEFAULT);

  const shell = (inner: ReactNode) =>
    embedded ? (
      <div className={cn("w-full min-w-0 max-w-full", className)}>{inner}</div>
    ) : (
      <div
        className={cn(
          "w-full min-w-0 max-w-full rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-[0_10px_36px_-10px_rgba(15,23,42,0.11)] ring-1 ring-slate-900/[0.035] sm:rounded-2xl sm:p-3",
          className,
        )}
      >
        {inner}
      </div>
    );

  const active = slides[current] ?? slides[0];

  return shell(
    <div
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
      onTouchStart={() => setPause(true)}
      onTouchEnd={() => {
        window.setTimeout(() => setPause(false), 2500);
      }}
    >
      <div className="relative min-w-0 max-w-full">
        <Carousel
          opts={{ loop: slides.length > 1, align: "start", duration: 22, skipSnaps: false }}
          setApi={setApi}
          className="w-full min-w-0 max-w-full"
          aria-label="Product screenshots"
        >
          <CarouselContent className="ml-0 min-w-0">
            {slides.map((slide, i) => (
              <CarouselItem key={`${slide.title}-${i}`} className="min-w-0 basis-full pl-0">
                <div className={cn(marketingShotFrame, "flex flex-col p-[3px] sm:p-1", frameClass)}>
                  <div className={cn("min-h-0 flex-1 overflow-hidden rounded-lg", marketingShotFrameInner)}>
                    <SlideMedia slide={slide} />
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {slides.length > 1 ? (
            <>
              <CarouselPrevious
                variant="outline"
                className="left-1.5 top-1/2 z-10 h-7 w-7 -translate-y-1/2 border-slate-200/80 bg-white/90 text-slate-600 shadow-sm hover:bg-white hover:text-slate-900 sm:left-2 sm:h-8 sm:w-8"
              />
              <CarouselNext
                variant="outline"
                className="right-1.5 top-1/2 z-10 h-7 w-7 -translate-y-1/2 border-slate-200/80 bg-white/90 text-slate-600 shadow-sm hover:bg-white hover:text-slate-900 sm:right-2 sm:h-8 sm:w-8"
              />
            </>
          ) : null}
        </Carousel>
      </div>

      <div className="mt-2.5 space-y-1.5 sm:mt-3">
        <p className={marketingSlideTitleClass}>{active.title}</p>
        {active.caption ? <p className={marketingCaptionTextClass}>{active.caption}</p> : null}
      </div>

      {slides.length > 1 ? (
        <div className="mt-2 flex justify-center gap-1 sm:mt-2.5" role="tablist" aria-label="Slides">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                i === current ? "w-5 bg-slate-800" : "w-1 bg-slate-300 hover:bg-slate-400",
              )}
              onClick={() => api?.scrollTo(i)}
            />
          ))}
        </div>
      ) : null}
    </div>,
  );
}
