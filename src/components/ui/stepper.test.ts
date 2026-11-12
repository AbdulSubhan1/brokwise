import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JOURNEY_STEPS, Stepper, stepStates } from "./stepper";

describe("Stepper", () => {
  it("Stepper marks the current step", () => {
    expect(stepStates("plan")).toEqual([
      { key: "details", label: "Fill details", state: "done" },
      { key: "plan", label: "Choose plan", state: "current" },
      { key: "pay", label: "Pay", state: "upcoming" },
      { key: "done", label: "Done", state: "upcoming" },
    ]);

    const html = renderToStaticMarkup(createElement(Stepper, { current: "plan" }));
    const current = html.match(/<li[^>]*aria-current="step"[^>]*>/g) ?? [];
    expect(current).toHaveLength(1);
    expect(html).toMatch(/aria-current="step"[^>]*>(?:(?!<\/li>).)*Choose plan/);
  });

  it("the last step is current, not done, on the thank-you page", () => {
    expect(stepStates("done").map((s) => s.state)).toEqual(["done", "done", "done", "current"]);
  });

  it("has the four journey steps in order", () => {
    expect(JOURNEY_STEPS.map((s) => s.label)).toEqual(["Fill details", "Choose plan", "Pay", "Done"]);
  });
});
