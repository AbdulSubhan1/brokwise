import { describe, expect, it } from "vitest";
import { planTags } from "./plan-tags";

const plan = (id: number, cover: string, basePremium: number) => ({ id, cover, basePremium });

describe("planTags", () => {
  it("tags the lowest price Cheapest and the cheapest plan of the widest cover Best value", () => {
    const tags = planTags(
      [plan(1, "third_party", 400), plan(2, "comprehensive", 900), plan(3, "comprehensive", 850), plan(4, "third_party", 420)],
      "comprehensive",
    );
    expect(tags.get(1)).toEqual(["cheapest"]);
    expect(tags.get(3)).toEqual(["best_value"]);
    expect(tags.get(2)).toBeUndefined();
  });

  it("one plan can be both", () => {
    expect(planTags([plan(5, "health_premium", 100), plan(6, "health_basic", 200)], "health_premium").get(5)).toEqual([
      "cheapest",
      "best_value",
    ]);
  });

  it("no plans, no tags; no plan of the widest cover, no Best value", () => {
    expect(planTags([], "comprehensive").size).toBe(0);
    expect([...planTags([plan(1, "third_party", 400)], "comprehensive").values()]).toEqual([["cheapest"]]);
  });
});
