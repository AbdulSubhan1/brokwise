import { Check } from "lucide-react";

/** The four steps every self-serve journey goes through. */
export const JOURNEY_STEPS = [
  { key: "details", label: "Fill details" },
  { key: "plan", label: "Choose plan" },
  { key: "pay", label: "Pay" },
  { key: "done", label: "Done" },
] as const;

export type StepKey = (typeof JOURNEY_STEPS)[number]["key"];
export type StepState = "done" | "current" | "upcoming";

export function stepStates(current: StepKey): { key: StepKey; label: string; state: StepState }[] {
  const at = JOURNEY_STEPS.findIndex((s) => s.key === current);
  return JOURNEY_STEPS.map((s, i) => ({
    key: s.key,
    label: s.label,
    state: i < at ? "done" : i === at ? "current" : "upcoming",
  }));
}

/**
 * Where the visitor is in the journey. Every label is in the page for screen readers; on mobile only the current
 * step's label shows next to the numbered dots, on desktop all of them do.
 */
export function Stepper({ current }: { current: StepKey }) {
  const steps = stepStates(current);
  const at = steps.findIndex((s) => s.state === "current");
  return (
    <nav aria-label="Progress">
      <p className="text-sm text-muted md:sr-only">
        Step {at + 1} of {steps.length}: <span className="font-semibold text-ink">{steps[at].label}</span>
      </p>
      <ol className="mt-2 flex items-center gap-2 md:mt-0 md:gap-3">
        {steps.map((step, i) => (
          <li
            key={step.key}
            aria-current={step.state === "current" ? "step" : undefined}
            className={`flex items-center gap-2 md:gap-3 ${i < steps.length - 1 ? "flex-1" : ""}`}
          >
            <span
              aria-hidden
              className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                step.state === "done"
                  ? "bg-pine text-white"
                  : step.state === "current"
                    ? "bg-saffron text-ink ring-4 ring-saffron-soft"
                    : "border border-line bg-card text-muted"
              }`}
            >
              {step.state === "done" ? <Check className="size-4" strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={`sr-only text-sm md:not-sr-only md:whitespace-nowrap ${
                step.state === "current" ? "font-bold text-ink" : step.state === "done" ? "text-pine-dark" : "text-muted"
              }`}
            >
              {step.label}
              {step.state === "done" && <span className="sr-only"> (done)</span>}
            </span>
            {i < steps.length - 1 && (
              <span aria-hidden className={`h-0.5 flex-1 rounded-full ${step.state === "done" ? "bg-pine" : "bg-line"}`} />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
