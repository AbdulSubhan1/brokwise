"use client";

import { BadgeCheck, Check, ChevronDown, LoaderCircle, Plus, Tag } from "lucide-react";
import { type FormEvent, useId, useState, useTransition } from "react";
import { selectPlan } from "@/app/[lob]/actions";
import { formatUsd } from "@/lib/money";
import { planTotal } from "@/lib/plan-total";
import type { WebsitePlan } from "@/lib/policydesk";
import { InsurerMark } from "./insurer-mark";
import { Badge } from "./ui/badge";
import { focusRing, primaryButton } from "./ui/styles";

import type { PlanTag } from "@/lib/plan-tags";

export type { PlanTag };

const TAGS = {
  cheapest: { label: "Cheapest", icon: Tag, tone: "saffron" },
  best_value: { label: "Best value", icon: BadgeCheck, tone: "solid" },
} as const;

/**
 * One plan with its add-ons. Included add-ons are listed with the benefits; optional and pre-ticked ones sit in a
 * collapsible "Add-ons" list of checkboxes, and the total follows them as the visitor ticks. The form sends only the
 * line, the plan id and the ticked add-on ids. `chosenIds` is set on the visitor's saved choice: the card is marked
 * and those add-ons are ticked again. On mobile the total and the button stick to the bottom while the card is in view.
 * `priceWords` say how long the price runs ("Total a year", "Total for this trip"), from the line's cover config.
 */
export function PlanCard({
  lob,
  plan,
  chosenIds,
  tags = [],
  priceWords,
}: {
  lob: string;
  plan: WebsitePlan;
  chosenIds?: number[];
  tags?: readonly PlanTag[];
  priceWords: { total: string; price: string };
}) {
  const titleId = useId();
  const addOnsId = useId();
  const [pending, startTransition] = useTransition();
  const isChoice = chosenIds !== undefined;
  const [ticked, setTicked] = useState<number[]>(
    () => chosenIds ?? plan.addOns.filter((a) => a.kind === "preselected").map((a) => a.id),
  );
  const [showAddOns, setShowAddOns] = useState(false);
  const total = planTotal(plan, ticked);
  const included = plan.addOns.filter((a) => a.kind === "included");
  const extras = plan.addOns.filter((a) => a.kind !== "included");
  const tickedCount = extras.filter((a) => ticked.includes(a.id)).length;

  function toggle(id: number, on: boolean) {
    setTicked((ids) => (on ? [...ids, id] : ids.filter((x) => x !== id)));
  }

  // Same as the journey forms: run the action without React's automatic form reset, so the ticks stay as they are if
  // the visitor comes back to this page. Without JavaScript the plain `action` still works.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => selectPlan(formData));
  }

  return (
    <article
      aria-labelledby={titleId}
      className={`flex flex-col rounded-2xl border bg-card p-5 md:p-6 ${isChoice ? "border-pine ring-2 ring-pine" : "border-line"}`}
    >
      {(isChoice || tags.length > 0) && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {isChoice && (
            <Badge tone="solid" icon={Check}>
              Your choice
            </Badge>
          )}
          {tags.map((t) => (
            <Badge key={t} tone={TAGS[t].tone} icon={TAGS[t].icon}>
              {TAGS[t].label}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <InsurerMark insurer={plan.insurer} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted">{plan.insurer}</p>
          <h2 id={titleId} className="text-xl font-bold">
            {plan.name}
          </h2>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-paper p-3 text-sm">
        <div className="col-span-3 sm:col-span-1">
          <dt className="text-muted">Cover</dt>
          <dd className="mt-0.5">
            <Badge tone="pine">{plan.coverLabel}</Badge>
          </dd>
        </div>
        <div className="col-span-3 sm:col-span-1">
          <dt className="text-muted">Excess</dt>
          <dd className="mt-0.5 font-semibold">{formatUsd(plan.excess)}</dd>
        </div>
        <div className="col-span-3 sm:col-span-1">
          <dt className="text-muted">Plan price</dt>
          <dd className="mt-0.5 font-semibold" data-testid="plan-price">
            {formatUsd(plan.basePremium)}
          </dd>
        </div>
      </dl>

      {(plan.benefits.length > 0 || included.length > 0) && (
        <ul className="mt-4 flex flex-col gap-1.5 text-sm">
          {plan.benefits.map((benefit) => (
            <li key={benefit} className="flex gap-2">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-pine" strokeWidth={3} />
              {benefit}
            </li>
          ))}
          {included.map((addOn) => (
            <li key={addOn.id} className="flex gap-2">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-pine" strokeWidth={3} />
              <span className="flex-1">{addOn.name}</span>
              <span className="font-semibold text-pine-dark">Included</span>
            </li>
          ))}
        </ul>
      )}

      <form action={selectPlan} onSubmit={onSubmit} className="mt-5 flex flex-1 flex-col gap-4">
        <input type="hidden" name="lob" value={lob} />
        <input type="hidden" name="planId" value={plan.id} />

        {extras.length > 0 && (
          <div className="rounded-xl border border-line">
            <button
              type="button"
              aria-expanded={showAddOns}
              aria-controls={addOnsId}
              onClick={() => setShowAddOns((v) => !v)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left font-semibold ${focusRing}`}
            >
              <span className="flex items-center gap-2">
                <Plus aria-hidden className="size-4 text-pine" />
                Add-ons ({extras.length})
              </span>
              <span className="flex items-center gap-2 text-sm font-medium text-muted">
                {tickedCount > 0 && <span>{tickedCount} added</span>}
                <ChevronDown
                  aria-hidden
                  className={`size-4 transition-transform motion-reduce:transition-none ${showAddOns ? "rotate-180" : ""}`}
                />
              </span>
            </button>
            {/* Collapsed add-ons stay in the form, so their ticks are still sent. */}
            <fieldset id={addOnsId} hidden={!showAddOns} className="border-t border-line p-2">
              <legend className="sr-only">Add-ons</legend>
              <ul className="flex flex-col gap-1.5">
                {extras.map((addOn) => (
                  <li key={addOn.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-paper has-checked:bg-pine-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-pine">
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
          </div>
        )}

        <div className="sticky bottom-0 -mx-5 mt-auto flex items-center justify-between gap-3 border-t border-line bg-card px-5 py-3 md:static md:mx-0 md:px-0 md:pt-4 md:pb-0">
          <p aria-live="polite">
            <span className="block text-xs text-muted">{priceWords.total}</span>
            <strong className="text-2xl font-extrabold" data-testid="plan-total">
              {formatUsd(total)}
            </strong>
          </p>
          {/* Every card has this button, so its name says which plan and price it picks. */}
          <button
            type="submit"
            disabled={pending}
            aria-label={pending ? undefined : `Select ${plan.name}, ${formatUsd(total)} ${priceWords.price}`}
            className={`${primaryButton} shrink-0`}
          >
            {pending && <LoaderCircle aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />}
            {pending ? "Saving…" : "Select"}
          </button>
        </div>
      </form>
    </article>
  );
}
