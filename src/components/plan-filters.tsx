"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useId } from "react";
import { plansHref, type Sort, SORTS } from "@/lib/plan-list";
import { trackPulse } from "@/lib/pulse-client";
import { Select } from "./ui/select";
import { focusRing, secondaryButton } from "./ui/styles";

export type CoverTab = { value: string; label: string; count: number };

/**
 * The plans page's heading row and filters: the heading (`children`) with "Sort by" on its right, then the cover tabs
 * as a segmented control with each cover's plan count, and the line's "only" checkbox for a narrower cover ("Agency
 * repair only") when it has one. Everything lives in the URL (`cover`, `sort`): the tabs are links, and the select and
 * checkbox belong to a GET form that reloads the page with them. With JavaScript a change applies at once, without
 * leaving the page's scroll position; without it, an Apply button sends the form.
 */
export function PlanFilters({
  lob,
  tabs,
  tab,
  only,
  sort,
  children,
}: {
  lob: string;
  tabs: CoverTab[];
  /** The tab shown as current: the chosen cover, or the cover a narrower one is within. */
  tab: string;
  only?: { value: string; label: string; checked: boolean };
  sort: Sort;
  children: ReactNode;
}) {
  const router = useRouter();
  const sortId = useId();
  const action = `/${lob}/plans`;

  // The form sends its tab's cover, then the narrower one when its box is ticked; the last one wins.
  function onChange(e: FormEvent<HTMLFormElement>) {
    const data = new FormData(e.currentTarget);
    const covers = data.getAll("cover").map(String);
    const chosen = SORTS.find((s) => s.value === data.get("sort"))?.value ?? "price";
    router.replace(plansHref(lob, covers.at(-1) ?? "", chosen), { scroll: false });
    // The select and the narrower-cover box change the list without a click on a link
    const field = (e.target as HTMLInputElement).name;
    if (field === "sort") trackPulse("plans_sorted", `${lob}: ${chosen}`);
    if (field === "cover") trackPulse("plans_filtered", `${lob}: ${covers.at(-1) || "all covers"}`);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onChange(e);
  }

  return (
    <form method="get" action={action} onChange={onChange} onSubmit={onSubmit}>
      {tab && <input type="hidden" name="cover" value={tab} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>{children}</div>
        <div className="flex items-center gap-2">
          <label htmlFor={sortId} className="text-muted">
            Sort by
          </label>
          {/* Keyed by the URL's order, so it shows it again after a back or forward navigation. */}
          <Select
            key={sort}
            id={sortId}
            name="sort"
            options={SORTS}
            defaultValue={sort}
            className="w-44 [&>select]:font-semibold"
          />
          <noscript>
            <button type="submit" className={`${secondaryButton} py-2.5`}>
              Apply
            </button>
          </noscript>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 md:mt-4.5">
        <nav aria-label="Filter by cover" className="w-full md:w-auto">
          <ul className="flex gap-1 rounded-xl bg-sand p-1 md:inline-flex">
            {tabs.map((t) => {
              const active = t.value === tab;
              return (
                <li key={t.value || "all"} className="flex flex-1 md:flex-none">
                  <Link
                    href={plansHref(lob, t.value, sort)}
                    aria-current={active ? "page" : undefined}
                    scroll={false}
                    data-pulse-event="plans_filtered"
                    data-pulse-label={`${lob}: ${t.label}`}
                    className={`flex min-h-10 w-full items-center justify-center rounded-lg px-2 text-center text-sm leading-tight md:px-4 md:text-base md:whitespace-nowrap ${focusRing} ${
                      active ? "bg-card font-bold text-ink shadow-sm" : "font-semibold text-ink/80 hover:bg-card/60"
                    }`}
                  >
                    {t.label}
                    <span className="hidden sm:inline">&nbsp;· {t.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {only && (
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 font-semibold">
            <input
              key={String(only.checked)}
              type="checkbox"
              name="cover"
              value={only.value}
              defaultChecked={only.checked}
              className="size-5 accent-pine"
            />
            {only.label}
          </label>
        )}
      </div>
    </form>
  );
}
