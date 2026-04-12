import { useCallback, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CalendarDays, Dog, Users } from "lucide-react";
import { setMobileAppOnboardingComplete } from "@/lib/mobileAppOnboardingStorage";

const features = [
  {
    title: "Bookings",
    body: "Schedule stays and see status at a glance.",
    icon: CalendarDays,
  },
  {
    title: "Dog profiles",
    body: "Keep pet details, care notes, and vaccines organized.",
    icon: Dog,
  },
  {
    title: "Staff management",
    body: "Give your team the tools they need for daily ops.",
    icon: Users,
  },
] as const;

export default function MobileAppOnboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);

  const goAuth = useCallback(
    (mode: "login" | "signup") => {
      setMobileAppOnboardingComplete();
      setLocation(mode === "signup" ? "/login?mode=signup" : "/login?mode=login");
    },
    [setLocation],
  );

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-emerald-50/90 via-white to-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-10 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
        <div className="mb-6 flex items-center justify-center gap-2">
          {([0, 1, 2] as const).map((i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === i ? "w-7 bg-emerald-600" : "w-1.5 bg-emerald-200"
              }`}
            />
          ))}
        </div>

        <div className="relative flex flex-1 flex-col overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {step === 0 ? (
              <motion.div
                key="welcome"
                role="region"
                aria-label="Welcome"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="flex flex-1 flex-col justify-center gap-8"
              >
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Welcome</p>
                  <h1 className="mt-2 text-3xl font-bold leading-tight text-slate-900">KennelSync</h1>
                  <p className="mt-3 text-base leading-relaxed text-slate-600">
                    Run your kennel from your phone—bookings, dogs, and staff in one place.
                  </p>
                </div>
                <Button
                  type="button"
                  className="h-12 w-full rounded-xl bg-emerald-600 text-base font-semibold text-white shadow-sm hover:bg-emerald-700"
                  onClick={() => setStep(1)}
                >
                  Get started
                </Button>
              </motion.div>
            ) : null}

            {step === 1 ? (
              <motion.div
                key="features"
                role="region"
                aria-label="What you can do"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="flex flex-1 flex-col justify-center gap-6"
              >
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">What you can do</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">Built for real kennel work</h2>
                </div>
                <ul className="flex flex-col gap-4">
                  {features.map(({ title, body, icon: Icon }) => (
                    <li
                      key={title}
                      className="flex gap-4 rounded-2xl border border-emerald-100/80 bg-white/90 p-4 shadow-sm"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <Icon className="h-5 w-5" aria-hidden />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{title}</p>
                        <p className="mt-1 text-sm leading-snug text-slate-600">{body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  className="h-12 w-full rounded-xl bg-emerald-600 text-base font-semibold text-white shadow-sm hover:bg-emerald-700"
                  onClick={() => setStep(2)}
                >
                  Continue
                </Button>
              </motion.div>
            ) : null}

            {step === 2 ? (
              <motion.div
                key="account"
                role="region"
                aria-label="Account"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="flex flex-1 flex-col justify-center gap-8"
              >
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Your account</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">Sign in or create an account</h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    Use the same credentials on web and mobile.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    className="h-12 w-full rounded-xl bg-emerald-600 text-base font-semibold text-white shadow-sm hover:bg-emerald-700"
                    onClick={() => goAuth("signup")}
                  >
                    Sign up
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 w-full rounded-xl border-slate-300 text-base font-semibold text-slate-800 hover:bg-slate-50"
                    onClick={() => goAuth("login")}
                  >
                    Log in
                  </Button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
