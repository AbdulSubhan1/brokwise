import { describe, expect, it } from "vitest";
import type { WebsitePlan } from "./policydesk";
import { planTotal } from "./plan-total";

const plan: WebsitePlan = {
  id: 7,
  insurer: "Harbor Mutual",
  name: "Drive Plus",
  cover: "comprehensive",
  coverLabel: "Comprehensive",
  excess: 250,
  basePremium: 900,
  benefits: ["Fire and theft"],
  addOns: [
    { id: 1, key: "roadside_assistance", name: "Roadside assistance", kind: "included", price: 0 },
    { id: 2, key: "driver_accident", name: "Driver accident cover", kind: "preselected", price: 30 },
    { id: 3, key: "windscreen", name: "Windscreen cover", kind: "optional", price: 35 },
  ],
};

describe("planTotal", () => {
  it("planTotal counts preselected only when chosen", () => {
    expect(planTotal(plan, [2])).toBe(930);
    expect(planTotal(plan, [])).toBe(900);
  });

  it("counts optional add-ons when chosen", () => {
    expect(planTotal(plan, [2, 3])).toBe(965);
  });

  it("planTotal ignores included and unknown ids", () => {
    expect(planTotal(plan, [1, 99])).toBe(900);
  });

  it("counts a repeated id once", () => {
    expect(planTotal(plan, [3, 3])).toBe(935);
  });
});
