const TONES = [
  "bg-pine text-white",
  "bg-saffron text-ink",
  "bg-ink text-saffron",
  "bg-pine-soft text-pine-dark",
  "bg-saffron-soft text-ink",
] as const;

/** "Harbor Mutual" → "HM". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

/** The same colour for the same insurer on every page. */
function toneOf(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

/** An insurer's badge: coloured initials. Decorative, as the name is always printed next to it. */
export function InsurerMark({ insurer }: { insurer: string }) {
  return (
    <span
      aria-hidden
      className={`grid size-11 shrink-0 place-items-center rounded-xl text-sm font-extrabold tracking-wide ${toneOf(insurer)}`}
    >
      {initialsOf(insurer)}
    </span>
  );
}
