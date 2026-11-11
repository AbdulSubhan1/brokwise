import type { WebsitePlan } from "./policydesk";

/**
 * The yearly total a plan card shows while the visitor ticks add-ons: base premium plus every chosen optional or
 * pre-ticked add-on. Display only: PolicyDesk works out the real total when the choice is saved.
 */
export function planTotal(plan: WebsitePlan, chosenIds: number[]): number {
  const chosen = new Set(chosenIds);
  return plan.addOns.reduce(
    (total, addOn) => (addOn.kind !== "included" && chosen.has(addOn.id) ? total + addOn.price : total),
    plan.basePremium,
  );
}
