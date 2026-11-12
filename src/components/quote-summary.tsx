import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { QuoteSummary as Summary } from "@/lobs";
import { textLink } from "./ui/styles";

/**
 * The strip at the top of the plans page: what was quoted (the line's icon, a title and the answers that set the
 * price), the reference, and "Edit details" back to the full form, which opens with the answers filled in. On a phone
 * it keeps the title and the first two answers. Without the answers (a journey opened from a pay link) it names the
 * line instead.
 */
export function QuoteSummary({
  icon: Icon,
  summary,
  reference,
  editHref,
}: {
  icon: LucideIcon;
  summary: Pick<Summary, "title" | "facts">;
  reference?: string;
  editHref: string;
}) {
  return (
    <section
      aria-label="Your quote"
      className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-line bg-card px-4 py-3 md:gap-y-3 md:px-4.5 md:py-3.5"
    >
      <p className="flex min-w-0 grow items-start gap-3 md:items-center">
        <Icon aria-hidden className="mt-0.5 size-5.5 shrink-0 text-pine md:mt-0" strokeWidth={1.8} />
        <span className="min-w-0">
          <strong>{summary.title}</strong>
          {summary.facts.map((fact, i) => (
            <span key={fact} className={i >= 2 ? "hidden md:inline" : undefined}>
              {" "}
              · {fact}
            </span>
          ))}
        </span>
      </p>
      {reference && (
        <p className="text-sm text-muted">
          Quote <span className="font-mono tracking-wide text-ink">{reference}</span>
        </p>
      )}
      <Link href={editHref} className={`${textLink} inline-flex min-h-11 items-center md:min-h-0`}>
        Edit details
      </Link>
    </section>
  );
}
