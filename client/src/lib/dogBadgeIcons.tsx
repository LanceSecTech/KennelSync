import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  PawPrint,
  Shield,
  Zap,
  Fence,
  User,
  UserRound,
  Dog,
  Heart,
  Pill,
  Star,
  Syringe,
  Swords,
  DoorOpen,
  Utensils,
} from "lucide-react";

/** Stored in `dog_badges.icon` for new badges; legacy rows may still use emoji strings. */
export const BADGE_ICON_OPTIONS: Array<{
  id: string;
  label: string;
  Icon: LucideIcon;
}> = [
  { id: "alert", label: "Alert / warning", Icon: AlertTriangle },
  { id: "paw", label: "Paw", Icon: PawPrint },
  { id: "shield", label: "Shield / safety", Icon: Shield },
  { id: "bolt", label: "Energy / high drive", Icon: Zap },
  { id: "fence", label: "Fence / jump risk", Icon: Fence },
  { id: "mars", label: "Male", Icon: User },
  { id: "venus", label: "Female", Icon: UserRound },
  { id: "dog", label: "Dog", Icon: Dog },
  { id: "heart", label: "Care / affection", Icon: Heart },
  { id: "pill", label: "Medication", Icon: Pill },
  { id: "syringe", label: "Medical / vet", Icon: Syringe },
  { id: "star", label: "Special / VIP", Icon: Star },
  { id: "swords", label: "Aggression / fighter", Icon: Swords },
  { id: "door", label: "Escape / door", Icon: DoorOpen },
  { id: "food", label: "Food / feeding", Icon: Utensils },
];

const ICON_BY_ID = new Map(BADGE_ICON_OPTIONS.map((o) => [o.id, o.Icon]));

/** Muted, operational colors (emerald/teal family + restrained accents). */
export const BADGE_ICON_COLOR_CLASS: Record<string, string> = {
  alert: "text-amber-600",
  paw: "text-emerald-600",
  shield: "text-teal-700",
  bolt: "text-amber-500",
  fence: "text-emerald-700",
  mars: "text-sky-700",
  venus: "text-fuchsia-700",
  dog: "text-emerald-800",
  heart: "text-rose-600",
  pill: "text-violet-600",
  syringe: "text-cyan-700",
  star: "text-amber-600",
  swords: "text-orange-700",
  door: "text-slate-700",
  food: "text-lime-700",
};

export function isPresetBadgeIconId(value: string): boolean {
  return ICON_BY_ID.has(value);
}

export function BadgeIconGlyph({
  icon,
  className,
  colored = true,
}: {
  icon: string | undefined | null;
  /** Size/layout classes; color comes from preset when `colored` and no `text-*` in className. */
  className?: string;
  /** When true, preset icons use BADGE_ICON_COLOR_CLASS unless className overrides. */
  colored?: boolean;
}) {
  const raw = String(icon || "").trim();
  const sizeClass = className?.trim() || "h-3.5 w-3.5 shrink-0";
  const hasTextColor = /\btext-[\w/-]+/.test(sizeClass);
  const colorClass =
    colored && !hasTextColor ? BADGE_ICON_COLOR_CLASS[raw] ?? "text-emerald-700" : "";

  if (!raw) {
    const Fallback = Star;
    return <Fallback className={cn(sizeClass, colorClass || "text-emerald-600")} aria-hidden />;
  }
  const Icon = ICON_BY_ID.get(raw);
  if (Icon) return <Icon className={cn(sizeClass, colorClass)} aria-hidden />;
  return (
    <span className="inline-flex items-center justify-center text-[12px] leading-none text-emerald-800" aria-hidden>
      {raw}
    </span>
  );
}
