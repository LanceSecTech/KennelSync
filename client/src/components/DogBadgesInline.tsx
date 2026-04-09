import { BadgeIconGlyph } from "@/lib/dogBadgeIcons";

type BadgeItem = {
  key: string;
  name: string;
  description?: string;
  icon?: string;
};

export function DogBadgesInline({
  badgeKeys,
  badgeByKey,
  max = 4,
  className = "",
}: {
  badgeKeys?: string[];
  badgeByKey: Map<string, BadgeItem>;
  max?: number;
  className?: string;
}) {
  const keys = (badgeKeys || []).map((k) => String(k || "").trim().toLowerCase()).filter(Boolean);
  if (!keys.length) return null;
  const shown = keys.slice(0, max);
  const hidden = Math.max(0, keys.length - shown.length);
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {shown.map((k) => {
        const badge = badgeByKey.get(k);
        const label = badge?.name || k;
        return (
          <span
            key={k}
            title={`${label}${badge?.description ? `: ${badge.description}` : ""}`}
            className="inline-flex items-center justify-center rounded-full bg-emerald-50/90 border border-emerald-200/80 shadow-[0_1px_0_rgba(16,185,129,0.12)] text-[10px] leading-none p-1"
          >
            <BadgeIconGlyph icon={badge?.icon} className="h-3 w-3" colored />
          </span>
        );
      })}
      {hidden > 0 && (
        <span className="text-[10px] text-muted-foreground">+{hidden}</span>
      )}
    </span>
  );
}
