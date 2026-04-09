import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/kennels", label: "Kennels" },
  { href: "/mobile", label: "Mobile" },
  { href: "/guidelines", label: "Guidelines" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/help", label: "Help" },
];

export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(34,197,94,0.16),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(134,239,172,0.22),transparent_40%),linear-gradient(180deg,#f0fdf4_0%,#ffffff_52%,#f8fafc_100%)]" />

      <header className="relative z-20">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between border-b border-emerald-100/70 px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <span className="text-lg font-semibold tracking-wide text-emerald-700">KennelSync</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/login?mode=login">
              <Button
                variant="ghost"
                className="h-9 rounded-full px-4 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
              >
                Log In
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

      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-emerald-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-center gap-1 overflow-x-auto px-3 text-sm text-slate-600 sm:gap-2 sm:px-6">
          {footerLinks.map((item) => {
            const isActive = location === item.href;
            const classes = `whitespace-nowrap rounded-full px-3 py-1.5 transition ${
              isActive ? "bg-emerald-50 text-emerald-700" : "hover:bg-emerald-50 hover:text-emerald-700"
            }`;
            return (
              <Link key={item.href} href={item.href} className={classes}>
                {item.label}
              </Link>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
