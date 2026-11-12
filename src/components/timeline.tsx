import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type TimelineStep = { icon: LucideIcon; title: string; body: ReactNode };

/** "What happens next": the steps after this page, top to bottom, joined by a line. */
export function Timeline({ steps }: { steps: readonly TimelineStep[] }) {
  return (
    <ol className="mt-4 flex flex-col">
      {steps.map(({ icon: Icon, title, body }, i) => (
        <li key={title} className="relative flex gap-4 pb-6 last:pb-0">
          {i < steps.length - 1 && (
            <span aria-hidden className="absolute top-10 bottom-0 left-5 w-0.5 -translate-x-1/2 bg-line" />
          )}
          <span
            aria-hidden
            className="relative grid size-10 shrink-0 place-items-center rounded-full border-2 border-pine bg-card text-pine"
          >
            <Icon className="size-5" />
          </span>
          <div className="pt-1.5">
            <h3 className="font-bold">{title}</h3>
            <div className="mt-1 text-muted">{body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
