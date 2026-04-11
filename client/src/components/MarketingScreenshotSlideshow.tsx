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

/**
 * Mobile / tablet slideshow frame sizing (Tailwind). Tweak the `clamp()` values to change
 * how tall the preview feels on phones without affecting desktop (`md:` and up use aspect ratio).
 *
 * - First clamp: default slides on small screens
 * - Second: `compactMobile` preset (homepage hero) — shorter, more “preview” than “hero panel”
 */
const SLIDE_MEDIA_FRAME_DEFAULT =
  "h-[clamp(9rem,39vw,11rem)] max-h-[44dvh] w-full min-w-0 sm:h-[clamp(10.5rem,36vw,13rem)] sm:max-h-none md:h-auto md:max-h-none md:min-h-[14rem] md:aspect-[16/10] lg:min-h-[15rem]";
const SLIDE_MEDIA_FRAME_COMPACT =
  "h-[clamp(8rem,34vw,9.5rem)] max-h-[38dvh] w-full min-w-0 sm:h-[clamp(9.5rem,32vw,11.5rem)] sm:max-h-none md:h-auto md:max-h-none md:min-h-[15rem] md:aspect-[16/10] lg:min-h-[17rem]";

export type MarketingSlide = {
  /** Set to a public URL (e.g. `/marketing/owner-1.png` from `client/public/`) or `null` for a placeholder. */
  src: string | null;
  title: string;
  caption?: string;
};

/** Features page — product gallery carousel. */
export const MARKETING_FEATURES_GALLERY_SLIDES: MarketingSlide[] = [
  { src: null, title: "Owner dashboard", caption: "Occupancy, bookings, and today’s pace." },
  { src: null, title: "Booking management", caption: "Pipeline from request to checkout." },
  { src: null, title: "Dog profiles", caption: "Care notes and compliance context." },
  { src: null, title: "Employee workflow", caption: "Check-ins, rooms, and daily tasks." },
  { src: null, title: "Customer booking", caption: "A clear path for pet parents." },
];

/** Homepage — hero / product preview carousel. */
export const MARKETING_HOME_HERO_SLIDES: MarketingSlide[] = [
  { src: null, title: "Owner overview", caption: "Metrics and occupancy at a glance." },
  { src: null, title: "Bookings", caption: "Pipeline and stay management." },
  { src: null, title: "Dog profiles", caption: "Care notes and vaccine context." },
];

/** Homepage — “At a glance” section (can reuse same assets as hero or different crops). */
export const MARKETING_HOME_GLANCE_SLIDES: MarketingSlide[] = [
  { src: null, title: "Operations", caption: "What’s happening across the kennel today." },
  { src: null, title: "Bookings", caption: "Status from hold to confirmed." },
  { src: null, title: "Profiles", caption: "Dogs, services, and requirements in one place." },
];

/** Owners marketing hero (inside browser chrome). */
export const OWNER_HERO_SLIDES: MarketingSlide[] = [
  { src: null, title: "Owner dashboard", caption: "Live snapshot of occupancy and workload." },
  { src: null, title: "Bookings & revenue", caption: "See pipeline and financial signals together." },
  { src: null, title: "Rooms & capacity", caption: "Place every stay with confidence." },
];

/** Employees page workflow preview. */
export const EMPLOYEE_PREVIEW_SLIDES: MarketingSlide[] = [
  { src: null, title: "Today", caption: "What the floor needs to tackle first." },
  { src: null, title: "Check-in / check-out", caption: "Consistent steps, fewer handoff errors." },
  { src: null, title: "Rooms", caption: "Assignments that match the real schedule." },
];

/** Customers page experience preview. */
export const CUSTOMER_PREVIEW_SLIDES: MarketingSlide[] = [
  { src: null, title: "Booking flow", caption: "Simple steps for pet parents." },
  { src: null, title: "My stays", caption: "Clear reservation and payment status." },
  { src: null, title: "Dog profile", caption: "Keep details current before arrival." },
];

function SlideMedia({ slide, imageClassName }: { slide: MarketingSlide; imageClassName?: string }) {
  if (slide.src) {
    return (
      <img
        src={slide.src}
        alt={slide.title}
        className={cn("h-full w-full object-cover object-top", imageClassName)}
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
          "w-full min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-4",
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
                <div
                  className={cn(
                    "overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50 sm:rounded-xl",
                    frameClass,
                  )}
                >
                  <SlideMedia slide={slide} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {slides.length > 1 ? (
            <>
              <CarouselPrevious
                variant="outline"
                className="left-1.5 top-1/2 z-10 h-8 w-8 -translate-y-1/2 border-slate-200/90 bg-white/95 text-slate-700 shadow-sm hover:bg-white sm:left-2 sm:h-9 sm:w-9"
              />
              <CarouselNext
                variant="outline"
                className="right-1.5 top-1/2 z-10 h-8 w-8 -translate-y-1/2 border-slate-200/90 bg-white/95 text-slate-700 shadow-sm hover:bg-white sm:right-2 sm:h-9 sm:w-9"
              />
            </>
          ) : null}
        </Carousel>
      </div>

      <div className="mt-2 px-0 sm:mt-3 sm:px-1">
        <p className="text-xs font-semibold text-slate-900 sm:text-sm">{active.title}</p>
        {active.caption ? (
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500 sm:text-xs sm:leading-relaxed">{active.caption}</p>
        ) : null}
      </div>

      {slides.length > 1 ? (
        <div className="mt-2 flex justify-center gap-1.5 sm:mt-3" role="tablist" aria-label="Slides">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === current ? "w-6 bg-emerald-600" : "w-1.5 bg-slate-300 hover:bg-slate-400",
              )}
              onClick={() => api?.scrollTo(i)}
            />
          ))}
        </div>
      ) : null}
    </div>,
  );
}
