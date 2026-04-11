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
    <div className="flex h-full min-h-[200px] w-full flex-col justify-end bg-gradient-to-br from-slate-100/80 via-white to-emerald-50/35 p-4 sm:min-h-[220px] sm:p-5">
      <div className="space-y-2">
        <div className="h-2 w-24 rounded-md bg-slate-200/90" />
        <div className="h-2 max-w-[55%] rounded-md bg-slate-100" />
      </div>
      <div className="mt-auto flex gap-2 pt-8">
        <div className="h-[52px] flex-1 rounded-lg bg-white/85 shadow-sm ring-1 ring-slate-200/70 sm:h-16" />
        <div className="h-[52px] w-[4.5rem] shrink-0 rounded-lg bg-emerald-100/50 ring-1 ring-emerald-200/50 sm:h-16 sm:w-20" />
      </div>
    </div>
  );
}

type MarketingScreenshotSlideshowProps = {
  slides: MarketingSlide[];
  /** Default 6.5s — calm, not flashy. */
  autoplayIntervalMs?: number;
  className?: string;
  /** Media area aspect ratio. */
  aspectClassName?: string;
  /** When true, omits outer card chrome (for nested frames like the owner hero). */
  embedded?: boolean;
};

export function MarketingScreenshotSlideshow({
  slides,
  autoplayIntervalMs = 6500,
  className,
  aspectClassName = "aspect-[4/3] sm:aspect-[16/10]",
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

  const shell = (inner: ReactNode) =>
    embedded ? (
      <div className={cn("w-full", className)}>{inner}</div>
    ) : (
      <div
        className={cn(
          "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4",
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
      <div className="relative">
        <Carousel
          opts={{ loop: slides.length > 1, align: "start", duration: 22, skipSnaps: false }}
          setApi={setApi}
          className="w-full"
          aria-label="Product screenshots"
        >
          <CarouselContent className="ml-0">
            {slides.map((slide, i) => (
              <CarouselItem key={`${slide.title}-${i}`} className="basis-full pl-0">
                <div
                  className={cn(
                    "overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50",
                    aspectClassName,
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
                className="left-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 border-slate-200/90 bg-white/95 text-slate-700 shadow-sm hover:bg-white"
              />
              <CarouselNext
                variant="outline"
                className="right-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 border-slate-200/90 bg-white/95 text-slate-700 shadow-sm hover:bg-white"
              />
            </>
          ) : null}
        </Carousel>
      </div>

      <div className="mt-3 px-0.5 sm:px-1">
        <p className="text-sm font-semibold text-slate-900">{active.title}</p>
        {active.caption ? (
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{active.caption}</p>
        ) : null}
      </div>

      {slides.length > 1 ? (
        <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="Slides">
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
