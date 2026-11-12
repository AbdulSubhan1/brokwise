"use client";

import { BadgeCheck, Check, ChevronDown, LoaderCircle, Tag } from "lucide-react";
import { type FormEvent, useId, useState, useTransition } from "react";
import { selectPlan } from "@/app/[lob]/actions";
import { formatUsd } from "@/lib/money";
import { planTotal } from "@/lib/plan-total";
import type { WebsitePlan } from "@/lib/policydesk";
import { InsurerMark } from "./insurer-mark";
import { Badge } from "./ui/badge";
import { focusRing, primaryButton, secondaryButton } from "./ui/styles";

import type { PlanTag } from "@/lib/plan-tags";

export type { PlanTag };

const TAGS = {
  cheapest: { icon: Tag, tone: "pine" },
  best_value: { icon: BadgeCheck, tone: "accent" },
} as const;

/** Pre-ticked extras before optional ones. */
const byKind = (a: { kind: string }, b: { kind: string }) =>
  Number(b.kind === "preselected") - Number(a.kind === "preselected");

/** "1 extra", "2 extras". */
const extrasWord = (n: number) => `${n} ${n === 1 ? "extra" : "extras"}`;

/**
 * One plan as a row of the plans list. On a phone it is a compact card: name and price on one line, the cover and
 * excess under them, then "Extras · N" and Select side by side. From md up it is one row that wraps as the design's
 * does: the insurer and plan name, then Cover / Excess / one key fact (an included add-on, or the first benefits), then
 * the price and Select pushed to the right, then "Add extras · N available" under a divider.
 *
 * The extras (optional and pre-ticked add-ons, with the included ones listed beside them) stay collapsed until asked
 * for; the price follows the ticks, and the line under them adds it up. The form sends only the line, the plan id and
 * the ticked add-on ids, collapsed or not. `chosenIds` is set on the visitor's saved choice: the row is marked and
 * those add-ons are ticked again. The saved choice and the best-value plan stand out with a thicker border and a solid
 * Select. `priceWords` say how long the price runs ("a year", "for this trip"), from the line's cover config;
 * `bestValueLabel` names the best-value tag after the cover it is for ("Best value comprehensive").
 */
export function PlanCard({
  lob,
  plan,
  chosenIds,
  tags = [],
  priceWords,
  bestValueLabel = "Best value",
}: {
  lob: string;
  plan: WebsitePlan;
  chosenIds?: number[];
  tags?: readonly PlanTag[];
  priceWords: { total: string; price: string };
  bestValueLabel?: string;
}) {
  const titleId = useId();
  const extrasId = useId();
  const [pending, startTransition] = useTransition();
  const isChoice = chosenIds !== undefined;
  const featured = isChoice || tags.includes("best_value");
  const [ticked, setTicked] = useState<number[]>(
    () => chosenIds ?? plan.addOns.filter((a) => a.kind === "preselected").map((a) => a.id),
  );
  const [showExtras, setShowExtras] = useState(false);
  const total = planTotal(plan, ticked);
  const included = plan.addOns.filter((a) => a.kind === "included");
  const extras = plan.addOns.filter((a) => a.kind !== "included");
  const tickedCount = extras.filter((a) => ticked.includes(a.id)).length;
  const caption = tickedCount > 0 ? `${priceWords.price} with ${extrasWord(tickedCount)}` : priceWords.price;
  const keyFact =
    included.length > 0
      ? { label: "Included", value: included.slice(0, 2).map((a) => a.name).join(" · ") }
      : plan.benefits.length > 0
        ? { label: "Good to know", value: plan.benefits.slice(0, 2).join(" · ") }
        : null;
  const tagLabels: Record<PlanTag, string> = { cheapest: "Cheapest", best_value: bestValueLabel };

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

  // The price shows next to the name on a phone and next to Select from md up; only one of the two is ever displayed.
  const price = (where: "phone" | "row") => (
    <p aria-live="polite" className={`text-right ${where === "phone" ? "shrink-0 md:hidden" : "hidden md:block"}`}>
      <strong
        className={`block leading-none font-extrabold ${where === "phone" ? "text-[1.375rem]" : "text-[1.75rem]"}`}
        data-testid={where === "row" ? "plan-total" : undefined}
      >
        {formatUsd(total)}
      </strong>
      <span className={`text-muted ${where === "phone" ? "text-xs" : "text-[0.8125rem]"}`}>{caption}</span>
    </p>
  );

  const chevron = (
    <ChevronDown
      aria-hidden
      className={`size-4 transition-transform motion-reduce:transition-none ${showExtras ? "rotate-180" : ""}`}
    />
  );

  return (
    <article
      aria-labelledby={titleId}
      className={`relative rounded-2xl bg-card ${featured ? "border-2 border-pine" : "border border-line"}`}
    >
      {(isChoice || tags.length > 0) && (
        <div className="absolute -top-3 left-4 flex flex-wrap gap-1.5 *:font-extrabold *:tracking-wide *:uppercase md:left-5">
          {isChoice && (
            <Badge tone="solid" icon={Check}>
              Your choice
            </Badge>
          )}
          {tags.map((t) => (
            <Badge key={t} tone={TAGS[t].tone} icon={TAGS[t].icon}>
              {tagLabels[t]}
            </Badge>
          ))}
        </div>
      )}

      <form
        action={selectPlan}
        onSubmit={onSubmit}
        className="flex flex-wrap items-center gap-x-2.5 gap-y-3.5 p-4 md:gap-x-7 md:gap-y-4 md:px-5 md:py-5"
      >
        <input type="hidden" name="lob" value={lob} />
        <input type="hidden" name="planId" value={plan.id} />

        <div className="flex min-w-0 basis-full items-start gap-3 md:flex-[1_1_15rem] md:items-center md:gap-3.5">
          <InsurerMark insurer={plan.insurer} />
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-[1.0625rem] font-extrabold md:text-lg">
              {plan.name}
            </h2>
            <p className="hidden text-sm text-muted md:block">{plan.insurer}</p>
            <p className="mt-0.5 text-sm text-muted md:hidden">
              {plan.coverLabel} · excess {formatUsd(plan.excess)}
            </p>
            {included.length > 0 && (
              <p className="mt-0.5 text-sm font-semibold text-pine md:hidden">{included[0].name} included</p>
            )}
          </div>
          {price("phone")}
        </div>

        <dl className="hidden gap-7 text-sm md:flex md:flex-[2_1_21.25rem]">
          <div>
            <dt className="text-muted">Cover</dt>
            <dd className="mt-0.5 font-bold">{plan.coverLabel}</dd>
          </div>
          <div>
            <dt className="text-muted">Excess</dt>
            <dd className="mt-0.5 font-bold">{formatUsd(plan.excess)}</dd>
          </div>
          {keyFact && (
            <div className="min-w-0">
              <dt className="text-muted">{keyFact.label}</dt>
              <dd className="mt-0.5 font-semibold">{keyFact.value}</dd>
            </div>
          )}
        </dl>

        <div className="flex basis-full items-center gap-2.5 md:ml-auto md:basis-auto md:gap-4.5">
          {price("row")}
          {extras.length > 0 && (
            <button
              type="button"
              aria-expanded={showExtras}
              aria-controls={extrasId}
              onClick={() => setShowExtras((v) => !v)}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-card px-3 py-3 font-semibold hover:border-pine md:hidden ${focusRing}`}
            >
              Extras · {extras.length}
              {chevron}
            </button>
          )}
          {/* Every row has this button, so its name says which plan and price it picks. */}
          <button
            type="submit"
            disabled={pending}
            aria-label={pending ? undefined : `Select ${plan.name}, ${formatUsd(total)} ${priceWords.price}`}
            className={`${featured ? primaryButton : secondaryButton} flex-[1.4] md:flex-none`}
          >
            {pending && <LoaderCircle aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />}
            {pending ? "Saving…" : "Select"}
          </button>
        </div>

        {extras.length > 0 && (
          <div className="hidden basis-full border-t border-sand pt-3 md:block">
            <button
              type="button"
              aria-expanded={showExtras}
              aria-controls={extrasId}
              onClick={() => setShowExtras((v) => !v)}
              className={`flex min-h-9 items-center gap-1.5 rounded-sm font-semibold text-pine hover:text-pine-dark ${focusRing}`}
            >
              {showExtras ? "Hide extras" : `Add extras · ${extras.length} available`}
              {chevron}
            </button>
          </div>
        )}

        {/* Collapsed extras stay in the form, so their ticks are still sent. */}
        {extras.length > 0 && (
          <fieldset
            id={extrasId}
            hidden={!showExtras}
            className="min-w-0 basis-full border-t border-sand pt-3 md:-mt-2 md:border-0 md:pt-0"
          >
            <legend className="sr-only">Extras for {plan.name}</legend>
            <ul className="grid gap-2 sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]">
              {included.map((addOn) => (
                <li key={addOn.id} className="flex min-h-12 items-center gap-2.5 rounded-lg bg-pine-soft px-3.5 py-2">
                  <Check aria-hidden className="size-4.5 shrink-0 text-pine" strokeWidth={3} />
                  <span className="flex-1">{addOn.name}</span>
                  <span className="font-bold text-pine-dark">Included</span>
                </li>
              ))}
              {/* What was added for the visitor first, as in the design, then the rest in PolicyDesk's order. */}
              {[...extras].sort(byKind).map((addOn) => {
                const on = ticked.includes(addOn.id);
                return (
                  <li key={addOn.id}>
                    <label className="flex h-full min-h-12 cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3.5 py-2 hover:bg-paper has-checked:border-pine has-checked:ring-1 has-checked:ring-pine has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-pine">
                      <input
                        type="checkbox"
                        name="addOnIds"
                        value={addOn.id}
                        checked={on}
                        onChange={(e) => toggle(addOn.id, e.target.checked)}
                        className="size-5 shrink-0 accent-pine focus-visible:outline-none"
                      />
                      <span className="flex-1">
                        {addOn.name}
                        {addOn.kind === "preselected" && on && (
                          <span className="block text-[0.8125rem] text-muted">Added for you · untick to remove</span>
                        )}
                      </span>
                      <span className="font-bold" data-testid="addon-price">
                        +{formatUsd(addOn.price)}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2.5 text-sm text-muted" data-testid="plan-sum">
              {tickedCount > 0 ? (
                <>
                  Plan {formatUsd(plan.basePremium)} + {extrasWord(tickedCount)} ({formatUsd(total - plan.basePremium)}) ={" "}
                </>
              ) : (
                <>No extras ticked: </>
              )}
              <strong className="text-ink">
                {formatUsd(total)} {priceWords.price}
              </strong>
            </p>
          </fieldset>
        )}
      </form>
    </article>
  );
}
