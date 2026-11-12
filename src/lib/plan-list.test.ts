import { describe, expect, it } from "vitest";
import { getLob } from "@/lobs";
import { coverFrom, plansHref, showsUnder, sortFrom, sortPlans, startingPrice, tabOf } from "./plan-list";
import type { WebsitePlan } from "./policydesk";

const covers = getLob("car")!.covers;

function plan(id: number, cover: string, basePremium: number, excess: number, preselected = 0): WebsitePlan {
  return {
    id,
    insurer: "Harbor Mutual",
    name: `Plan ${id}`,
    cover,
    coverLabel: cover,
    excess,
    basePremium,
    benefits: [],
    addOns: [
      { id: id * 10, key: "roadside_assistance", name: "Roadside assistance", kind: "included", price: 0 },
      ...(preselected ? [{ id: id * 10 + 1, key: "driver_accident", name: "Driver", kind: "preselected" as const, price: preselected }] : []),
      { id: id * 10 + 2, key: "windscreen", name: "Windscreen", kind: "optional", price: 35 },
    ],
  };
}

describe("the URL's cover and sort", () => {
  it("reads a known cover and ignores anything else", () => {
    expect(coverFrom("third_party", covers)).toBe("third_party");
    expect(coverFrom("boats", covers)).toBe("");
    expect(coverFrom(undefined, covers)).toBe("");
  });

  it("takes the narrower cover the filter form sends after its tab", () => {
    expect(coverFrom(["comprehensive", "comprehensive_agency"], covers)).toBe("comprehensive_agency");
    expect(coverFrom(["comprehensive"], covers)).toBe("comprehensive");
    expect(coverFrom(["comprehensive", "nope"], covers)).toBe("comprehensive");
  });

  it("sorts by price unless it asks for the lowest excess", () => {
    expect(sortFrom("excess")).toBe("excess");
    expect(sortFrom("price")).toBe("price");
    expect(sortFrom("cheapest")).toBe("price");
    expect(sortFrom(["excess", "price"])).toBe("price");
    expect(sortFrom(undefined)).toBe("price");
  });
});

describe("the cover filter", () => {
  it("puts agency repair under the comprehensive tab", () => {
    expect(tabOf("comprehensive_agency", covers)).toBe("comprehensive");
    expect(tabOf("third_party", covers)).toBe("third_party");
    expect(tabOf("", covers)).toBe("");
  });

  it("a tab shows the covers within it; a narrower cover shows only itself", () => {
    expect(showsUnder("comprehensive_agency", "comprehensive", covers)).toBe(true);
    expect(showsUnder("comprehensive", "comprehensive", covers)).toBe(true);
    expect(showsUnder("third_party", "comprehensive", covers)).toBe(false);
    expect(showsUnder("comprehensive", "comprehensive_agency", covers)).toBe(false);
    expect(showsUnder("third_party", "", covers)).toBe(true);
  });
});

describe("sortPlans", () => {
  const plans = [plan(1, "comprehensive", 1000, 100, 30), plan(2, "third_party", 1020, 50), plan(3, "comprehensive", 900, 50)];

  it("starts from the plan with its pre-ticked add-ons", () => {
    expect(startingPrice(plans[0])).toBe(1030);
    expect(startingPrice(plans[1])).toBe(1020);
  });

  it("lowest price is the price each row shows", () => {
    expect(sortPlans(plans, "price").map((p) => p.id)).toEqual([3, 2, 1]);
  });

  it("lowest excess puts the lower price first on a tie", () => {
    expect(sortPlans(plans, "excess").map((p) => p.id)).toEqual([3, 2, 1]);
    expect(sortPlans([plans[1], plans[0]], "excess").map((p) => p.id)).toEqual([2, 1]);
  });

  it("keeps PolicyDesk's order on a full tie and leaves the input alone", () => {
    const twins = [plan(4, "third_party", 800, 60), plan(5, "third_party", 800, 60)];
    expect(sortPlans(twins, "price").map((p) => p.id)).toEqual([4, 5]);
    expect(sortPlans(plans, "price")).not.toBe(plans);
    expect(plans.map((p) => p.id)).toEqual([1, 2, 3]);
  });
});

describe("plansHref", () => {
  it("leaves out the defaults", () => {
    expect(plansHref("car", "", "price")).toBe("/car/plans");
    expect(plansHref("car", "third_party", "price")).toBe("/car/plans?cover=third_party");
    expect(plansHref("car", "", "excess")).toBe("/car/plans?sort=excess");
    expect(plansHref("car", "comprehensive_agency", "excess")).toBe("/car/plans?cover=comprehensive_agency&sort=excess");
  });
});
