import { Info } from "lucide-react";

export function DemoNotice() {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-saffron/60 bg-saffron-soft px-4 py-3 text-sm font-medium text-ink">
      <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-ink/70" />
      <span>Demo site: use made-up details. Payments are in PaySandbox test mode.</span>
    </p>
  );
}
