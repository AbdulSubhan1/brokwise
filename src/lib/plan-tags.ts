export type PlanTag = "cheapest" | "best_value";

type Priced = { id: number; cover: string; basePremium: number };

/**
 * The plans page's tags: "Cheapest" on the lowest plan price, "Best value" on the cheapest plan of the line's widest
 * cover (comprehensive for car, building and contents for home…). Ties go to the first plan PolicyDesk listed.
 */
export function planTags(plans: readonly Priced[], bestValueCover: string): Map<number, PlanTag[]> {
  const tags = new Map<number, PlanTag[]>();
  const add = (plan: Priced | undefined, tag: PlanTag) => {
    if (plan) tags.set(plan.id, [...(tags.get(plan.id) ?? []), tag]);
  };
  const cheapest = (list: readonly Priced[]) =>
    list.reduce<Priced | undefined>((best, p) => (!best || p.basePremium < best.basePremium ? p : best), undefined);
  add(cheapest(plans), "cheapest");
  add(cheapest(plans.filter((p) => p.cover === bestValueCover)), "best_value");
  return tags;
}
