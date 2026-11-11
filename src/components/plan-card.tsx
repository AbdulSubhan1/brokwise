"use client";

import { type FormEvent, useId, useState, useTransition } from "react";
import { selectPlan } from "@/app/car/actions";
import { formatUsd } from "@/lib/money";
import { planTotal } from "@/lib/plan-total";
import type { WebsitePlan } from "@/lib/policydesk";

/**
 * One plan with its add-ons. Included add-ons are always on; optional and pre-ticked ones are checkboxes, and the
 * total follows them as the visitor ticks. The form sends only the plan id and the ticked add-on ids.
 * `chosenIds` is set on the visitor's saved choice: the card is marked and those add-ons are ticked again.
 */
export function PlanCard({ plan, chosenIds }: { plan: WebsitePlan; chosenIds?: number[] }) {
  const titleId = useId();
  const [pending, startTransition] = useTransition();
  const isChoice = chosenIds !== undefined;
  const [ticked, setTicked] = useState<number[]>(
    () => chosenIds ?? plan.addOns.filter((a) => a.kind === "preselected").map((a) => a.id),
  );
  const total = planTotal(plan, ticked);
  const included = plan.addOns.filter((a) => a.kind === "included");
  const extras = plan.addOns.filter((a) => a.kind !== "included");

  function toggle(id: number, on: boolean) {
    setTicked((ids) => (on ? [...ids, id] : ids.filter((x) => x !== id)));
  }

  // Same as the car forms: run the action without React's automatic form reset, so the ticks stay as they are if
  // the visitor comes back to this page. Without JavaScript the plain `action` still works.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => selectPlan(formData));
  }

  return (
    <article
      aria-labelledby={titleId}
      className={`flex flex-col rounded-xl border bg-card p-5 md:p-6 ${isChoice ? "border-pine ring-2 ring-pine" : "border-line"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted">{plan.insurer}</p>
          <h2 id={titleId} className="text-xl font-bold">
            {plan.name}
          </h2>
        </div>
        {isChoice && (
          <span className="shrink-0 rounded-full bg-pine px-3 py-1 text-xs font-bold tracking-wider text-white uppercase">
            Your choice
          </span>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">Cover</dt>
        <dd className="font-medium">{plan.coverLabel}</dd>
        <dt className="text-muted">Excess</dt>
        <dd className="font-medium">{formatUsd(plan.excess)}</dd>
        <dt className="text-muted">Plan price</dt>
        <dd className="font-medium" data-testid="plan-price">
          {formatUsd(plan.basePremium)}
        </dd>
      </dl>

      {plan.benefits.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1 text-sm">
          {plan.benefits.map((benefit) => (
            <li key={benefit} className="flex gap-2">
              <span aria-hidden className="text-pine">
                •
              </span>
              {benefit}
            </li>
          ))}
        </ul>
      )}

      <form action={selectPlan} onSubmit={onSubmit} className="mt-5 flex flex-1 flex-col gap-4">
        <input type="hidden" name="planId" value={plan.id} />

        {plan.addOns.length > 0 && (
          <fieldset>
            <legend className="font-semibold">Add-ons</legend>
            <ul className="mt-2 flex flex-col gap-2">
              {included.map((addOn) => (
                <li key={addOn.id} className="flex items-center gap-3 rounded-lg bg-pine-soft px-3 py-2.5 text-sm">
                  <span aria-hidden className="grid size-5 shrink-0 place-items-center font-bold text-pine">
                    ✓
                  </span>
                  <span className="flex-1">{addOn.name}</span>
                  <span className="font-semibold text-pine-dark">Included</span>
                </li>
              ))}
              {extras.map((addOn) => (
                <li key={addOn.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm has-checked:border-pine has-checked:bg-pine-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-pine">
                    <input
                      type="checkbox"
                      name="addOnIds"
                      value={addOn.id}
                      checked={ticked.includes(addOn.id)}
                      onChange={(e) => toggle(addOn.id, e.target.checked)}
                      className="size-5 shrink-0 accent-pine focus-visible:outline-none"
                    />
                    <span className="flex-1">{addOn.name}</span>
                    <span className="font-semibold" data-testid="addon-price">
                      +{formatUsd(addOn.price)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        <div className="mt-auto flex flex-col gap-3 border-t border-line pt-4 md:flex-row md:items-center md:justify-between">
          <p aria-live="polite">
            <span className="text-sm text-muted">Total </span>
            <strong className="text-2xl font-extrabold" data-testid="plan-total">
              {formatUsd(total)}
            </strong>
            <span className="text-sm text-muted"> a year</span>
          </p>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-pine px-5 py-3 font-semibold text-white hover:bg-pine-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine disabled:opacity-60 md:w-auto"
          >
            {pending ? "Saving…" : "Select this plan"}
          </button>
        </div>
      </form>
    </article>
  );
}
