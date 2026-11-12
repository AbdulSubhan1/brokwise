import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const TONES = {
  pine: "bg-pine-soft text-pine-dark",
  saffron: "bg-saffron-soft text-ink",
  solid: "bg-pine text-white",
  neutral: "bg-paper text-muted border border-line",
} as const;

/** A small rounded label: a cover type, a plan tag or a status. */
export function Badge({
  tone = "neutral",
  icon: Icon,
  children,
}: {
  tone?: keyof typeof TONES;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[tone]}`}>
      {Icon && <Icon aria-hidden className="size-3.5" />}
      {children}
    </span>
  );
}
