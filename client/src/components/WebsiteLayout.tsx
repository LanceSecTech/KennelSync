import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/kennels", label: "Find Kennels" },
  { href: "/help", label: "Contact a Professional" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/guidelines", label: "Guidelines" },
];

export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(34,197,94,0.16),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(134,239,172,0.22),transparent_40%),linear-gradient(180deg,#f0fdf4_0%,#ffffff_52%,#f8fafc_100%)]" />

      <header className="sticky top-0 z-20 border-b border-emerald-100/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/">
            <span className="text-lg font-semibold tracking-wide text-emerald-700">KennelSync</span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-slate-700 lg:flex">
            <a href="/#features" className="transition hover:text-emerald-700">Features</a>
            <a href="/#for-owners" className="transition hover:text-emerald-700">For Owners</a>
            <a href="/#for-employees" className="transition hover:text-emerald-700">For Employees</a>
            <a href="/#for-customers" className="transition hover:text-emerald-700">For Customers</a>
            <a href="/#contact-professional" className="transition hover:text-emerald-700">Contact a Professional</a>
          </nav>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/login?mode=login">
              <Button
                variant="ghost"
                className="h-9 rounded-full px-4 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
              >
                Login
              </Button>
            </Link>
            <Link href="/login?mode=signup">
              <Button
                size="sm"
                className="h-9 rounded-full bg-emerald-500 px-4 text-white hover:bg-emerald-600"
              >
                Sign Up
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 pb-24">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
            <p className="text-base font-semibold text-slate-900">KennelSync</p>
            <p className="text-sm text-slate-500">Professional kennel operations software</p>
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
