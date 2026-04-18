import { Link } from "wouter";
import { cn } from "@/lib/utils";

const MARK_SRC = "/branding/kennelsync-mark.svg";

type WebsiteBrandLockupProps = {
  className?: string;
  /** Slightly smaller type + icon for footer density */
  variant?: "header" | "footer";
};

export function WebsiteBrandLockup({ className, variant = "header" }: WebsiteBrandLockupProps) {
  const isFooter = variant === "footer";

  return (
    <Link
      href="/"
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-2 rounded-lg outline-offset-4 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600",
        className,
      )}
      aria-label="KennelSync home"
    >
      <img
        src={MARK_SRC}
        alt=""
        width={32}
        height={32}
        className={cn("shrink-0 select-none", isFooter ? "h-7 w-7" : "h-8 w-8")}
        decoding="async"
      />
      <span
        className={cn(
          "truncate font-semibold tracking-wide text-emerald-700",
          isFooter ? "text-base sm:text-[17px]" : "text-lg",
        )}
      >
        KennelSync
      </span>
    </Link>
  );
}
