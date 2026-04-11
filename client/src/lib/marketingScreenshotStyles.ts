import { cn } from "@/lib/utils";

/** Shared product-shot chrome — grid + carousel stay visually aligned. */
export const marketingShotFrame = cn(
  "overflow-hidden rounded-xl border border-slate-200/80 bg-white",
  "shadow-[0_10px_36px_-10px_rgba(15,23,42,0.13)] ring-1 ring-slate-900/[0.035]",
);

export const marketingShotFrameInner = "bg-slate-50/40";

/** Body line under a shot — use with spacing from parent or `mt-3` on figcaption. */
export const marketingCaptionTextClass = cn(
  "max-w-prose text-pretty text-left text-[13px] font-normal leading-[1.55] tracking-[-0.01em] text-slate-600",
  "sm:text-[13.5px] sm:leading-[1.58]",
);

/** Slide headline under carousel — distinct from body caption, not shouty. */
export const marketingSlideTitleClass = cn(
  "text-left text-sm font-semibold leading-snug tracking-tight text-slate-900",
);
