import { Link } from "wouter";
import { cn } from "@/lib/utils";

/** Served from Vite `publicDir` → `client/public`. */
const LOGO_PUBLIC_PATH = "/branding/kennelsync-mark.png";

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
        "inline-flex min-w-0 max-w-full items-center gap-3 rounded-lg outline-offset-4 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600",
        className,
      )}
      aria-label="KennelSync home"
    >
      <img
        src={LOGO_PUBLIC_PATH}
        alt="KennelSync Logo"
        width={36}
        height={36}
        className={cn(
          "block shrink-0 object-contain select-none",
          isFooter ? "h-8 w-8 min-h-8 min-w-8" : "h-9 w-9 min-h-9 min-w-9",
        )}
        decoding="async"
      />
      <span
        className={cn(
          "min-w-0 truncate font-semibold tracking-wide text-emerald-700",
          isFooter ? "text-base sm:text-[17px]" : "text-lg",
        )}
      >
        KennelSync
      </span>
    </Link>
  );
}
