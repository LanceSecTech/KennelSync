import { cn } from "@/lib/utils";
import {
  marketingCaptionTextClass,
  marketingShotFrame,
  marketingShotFrameInner,
} from "@/lib/marketingScreenshotStyles";

export type MarketingGridItem = {
  src: string;
  /** Short label for accessibility */
  alt: string;
  /** Benefit-focused marketing copy (shown below the image) */
  caption: string;
};

type MarketingScreenshotGridProps = {
  items: MarketingGridItem[];
  className?: string;
  /** Default 2 columns from `md` up */
  columnsClassName?: string;
};

export function MarketingScreenshotGrid({
  items,
  className,
  columnsClassName = "md:grid-cols-2",
}: MarketingScreenshotGridProps) {
  if (!items.length) return null;

  return (
    <div className={cn("grid gap-x-8 gap-y-9 md:gap-x-10 md:gap-y-10", columnsClassName, className)}>
      {items.map((item) => (
        <figure key={item.src} className="mx-auto flex w-full max-w-2xl flex-col md:mx-0 md:max-w-none">
          <div className={cn(marketingShotFrame, "p-[3px] sm:p-1")}>
            <div className={cn("overflow-hidden rounded-lg", marketingShotFrameInner)}>
              <img
                src={item.src}
                alt={item.alt}
                className="h-auto w-full object-contain object-top"
                loading="lazy"
              />
            </div>
          </div>
          <figcaption className={cn(marketingCaptionTextClass, "mt-3 sm:mt-3.5")}>{item.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}
