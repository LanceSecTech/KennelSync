import { useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { WebsiteBrandLockup } from "@/components/WebsiteBrandLockup";

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/kennels", label: "Find Kennels" },
  { href: "/contact", label: "Book a Demo" },
  { href: "/help", label: "Help" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/guidelines", label: "Guidelines" },
];

const MOBILE_NAV_ITEMS = [
  { href: "/features", label: "Features" },
  { href: "/owners", label: "For Owners" },
  { href: "/employees", label: "For Employees" },
  { href: "/customers", label: "For Customers" },
  { href: "/contact", label: "Book a Demo" },
] as const;

export default function WebsiteLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(34,197,94,0.16),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(134,239,172,0.22),transparent_40%),linear-gradient(180deg,#f0fdf4_0%,#ffffff_52%,#f8fafc_100%)]" />

      <header className="relative sticky top-0 z-50 border-b border-emerald-100/70 bg-white/95 backdrop-blur">
        <div className="relative z-20 mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:min-h-0 lg:px-8">
          <WebsiteBrandLockup className="shrink-0 py-0.5" />

          <nav className="hidden flex-1 flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-700 lg:flex">
            {MOBILE_NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-emerald-700">
                {item.label}
              </Link>
            ))}
          </nav>

          <nav className="hidden shrink-0 items-center gap-2 text-sm lg:flex">
            <Link href="/login?mode=login">
              <Button
                variant="ghost"
                className="h-9 rounded-full px-4 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
              >
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="h-9 rounded-full bg-emerald-500 px-4 text-white hover:bg-emerald-600">
                Sign Up
              </Button>
            </Link>
          </nav>

          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 lg:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-10 bg-slate-900/40 backdrop-blur-[2px] lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="absolute left-0 right-0 top-full z-30 max-h-[min(72vh,560px)] overflow-y-auto border-t border-slate-100 bg-white px-4 py-4 shadow-lg lg:hidden">
              <nav className="flex flex-col gap-0.5 text-[15px] font-medium text-slate-800">
                {MOBILE_NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-xl px-3 py-3 transition hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-4 grid gap-2.5 border-t border-slate-100 pt-4">
                <Link href="/login?mode=login">
                  <Button variant="outline" className="h-11 w-full rounded-full border-slate-300 text-sm font-semibold">
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="h-11 w-full rounded-full bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-600">
                    Sign Up
                  </Button>
                </Link>
              </div>
            </div>
          </>
        ) : null}
      </header>

      <main className="relative z-10 pb-24">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
            <WebsiteBrandLockup variant="footer" />
            <p className="max-w-md text-sm text-slate-500 sm:text-right">Professional kennel operations software</p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
            {footerLinks.map((item) => {
              const isActive = location === item.href;
              const classes = isActive ? "text-emerald-700" : "transition hover:text-emerald-700";
              return (
                <Link key={item.href} href={item.href} className={classes}>
                  {item.label}
                </Link>
              );
            })}
          </div>
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} KennelSync. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
