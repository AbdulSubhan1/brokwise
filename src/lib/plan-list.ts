import type { CoverSpec } from "@/lobs/types";
import { planTotal } from "./plan-total";
import type { WebsitePlan } from "./policydesk";

// The plans page's list: which cover the URL asks for, which plans that shows, and in what order. Prices and tags are
// worked out elsewhere (plan-total.ts, plan-tags.ts); this only filters and orders.

export const SORTS = [
  { value: "price", label: "Lowest price" },
  { value: "excess", label: "Lowest excess" },
] as const;

export type Sort = (typeof SORTS)[number]["value"];

/** How many plans the page shows before "Show N more plans". */
export const FIRST_PLANS = 6;

/** The `sort` param, or "price" for a missing or unknown one. */
export function sortFrom(value: string | string[] | undefined): Sort {
  return SORTS.find((s) => s.value === value)?.value ?? "price";
}

/**
 * The `cover` param: one of the line's covers, or "" (all). The filter form sends its tab's cover and then, when its
 * "only" box is ticked, the narrower cover (`cover=comprehensive&cover=comprehensive_agency`), so the last known one wins.
 */
export function coverFrom(value: string | string[] | undefined, covers: readonly CoverSpec[]): string {
  const values = typeof value === "string" ? [value] : (value ?? []);
  return values.findLast((v) => covers.some((c) => c.value === v)) ?? "";
}

/** The filter's tab for a cover: the cover itself, or the cover it is within. "" for all. */
export function tabOf(cover: string, covers: readonly CoverSpec[]): string {
  return covers.find((c) => c.value === cover)?.within ?? cover;
}

/** Whether a plan of `planCover` shows under the chosen cover: a tab shows the covers within it too. */
export function showsUnder(planCover: string, cover: string, covers: readonly CoverSpec[]): boolean {
  if (!cover || planCover === cover) return true;
  return covers.some((c) => c.value === planCover && c.within === cover);
}

/** The price a plan's row shows before the visitor ticks anything: the plan with its pre-ticked add-ons. */
export function startingPrice(plan: WebsitePlan): number {
  return planTotal(
    plan,
    plan.addOns.filter((a) => a.kind === "preselected").map((a) => a.id),
  );
}

/**
 * The plans in the chosen order: lowest starting price (what each row shows), or lowest excess with the lower price
 * first on a tie. Plans that tie keep PolicyDesk's order.
 */
export function sortPlans<T extends WebsitePlan>(plans: readonly T[], sort: Sort): T[] {
  const byPrice = (a: T, b: T) => startingPrice(a) - startingPrice(b);
  return [...plans].sort(sort === "excess" ? (a, b) => a.excess - b.excess || byPrice(a, b) : byPrice);
}

/** The plans page's URL for a cover and an order, leaving out what is the default ("/car/plans?cover=third_party"). */
export function plansHref(lob: string, cover: string, sort: Sort): string {
  const params = new URLSearchParams();
  if (cover) params.set("cover", cover);
  if (sort !== "price") params.set("sort", sort);
  const query = params.toString();
  return query ? `/${lob}/plans?${query}` : `/${lob}/plans`;
}
