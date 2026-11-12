"use client";

import { useRef, useState } from "react";
import type { PlanTag } from "@/lib/plan-tags";
import type { WebsitePlan } from "@/lib/policydesk";
import { PlanCard } from "./plan-card";

export type PlanListItem = {
  plan: WebsitePlan;
  chosenIds?: number[];
  tags?: PlanTag[];
  priceWords: { total: string; price: string };
};

/**
 * The plans in the order the page chose, the first `first` of them to start with and a "Show N more plans" button for
 * the rest (all of them at once when the saved choice is further down, so it is never hidden). After "Show more",
 * focus moves to the first plan that appeared, so keyboard and screen reader users carry on from there. `view` names
 * the filter and order: a new one starts again from the first plans, while each row keeps its ticks.
 */
export function PlanList({
  lob,
  items,
  first,
  bestValueLabel,
  view,
}: {
  lob: string;
  view: string;
  items: PlanListItem[];
  first: number;
  bestValueLabel: string;
}) {
  const choiceAt = items.findIndex((i) => i.chosenIds !== undefined);
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const showAll = openedFor === view || choiceAt >= first;
  const nextRef = useRef<HTMLLIElement>(null);
  const shown = showAll ? items : items.slice(0, first);
  const more = items.length - shown.length;

  function showMore() {
    setOpenedFor(view);
    // The new rows are drawn on the next frame.
    requestAnimationFrame(() => nextRef.current?.focus());
  }

  return (
    <>
      <ul className="flex flex-col gap-4">
        {shown.map(({ plan, chosenIds, tags, priceWords }, i) => (
          // The key changes when the saved choice does, so the row's ticks start again from it.
          <li
            key={`${plan.id}:${chosenIds?.join(",") ?? ""}`}
            ref={i === first ? nextRef : undefined}
            tabIndex={i === first ? -1 : undefined}
            className="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pine"
          >
            <PlanCard
              lob={lob}
              plan={plan}
              chosenIds={chosenIds}
              tags={tags}
              priceWords={priceWords}
              bestValueLabel={bestValueLabel}
            />
          </li>
        ))}
      </ul>
      {more > 0 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={showMore}
            data-pulse-event="more_plans_shown"
            data-pulse-label={lob}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-line bg-card px-6 font-bold hover:border-pine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine md:w-auto"
          >
            Show {more} more {more === 1 ? "plan" : "plans"}
          </button>
        </div>
      )}
    </>
  );
}
