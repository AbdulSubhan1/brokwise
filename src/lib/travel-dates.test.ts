import { describe, expect, it } from "vitest";
import { travelDateIssues } from "./travel-dates";

// Review Focus 3: the same rules as PolicyDesk, so the visitor sees the mistake before anything is sent.
const TODAY = "2026-11-12";

describe("travel date rules", () => {
  it("accepts a single trip from today", () => {
    expect(travelDateIssues({ tripType: "single", startDate: "2026-11-12", endDate: "2026-11-20" }, TODAY)).toEqual([]);
  });

  it("refuses an end date before the start date", () => {
    expect(travelDateIssues({ tripType: "single", startDate: "2026-12-10", endDate: "2026-12-01" }, TODAY)).toEqual([
      { field: "endDate", message: "The trip must end on or after its start date." },
    ]);
  });

  it("refuses a start date in the past", () => {
    expect(travelDateIssues({ tripType: "single", startDate: "2026-11-11", endDate: "2026-11-20" }, TODAY)).toEqual([
      { field: "startDate", message: "The trip can't start in the past." },
    ]);
  });

  it("refuses a single trip longer than 180 days", () => {
    expect(travelDateIssues({ tripType: "single", startDate: "2026-12-01", endDate: "2027-05-30" }, TODAY)).toEqual([]);
    expect(travelDateIssues({ tripType: "single", startDate: "2026-12-01", endDate: "2027-05-31" }, TODAY)).toEqual([
      { field: "endDate", message: "A single trip can be up to 180 days." },
    ]);
  });

  it("refuses an end date on an annual trip", () => {
    expect(travelDateIssues({ tripType: "annual", startDate: "2026-12-01", endDate: "2027-01-01" }, TODAY)).toEqual([
      { field: "endDate", message: "An annual plan has no end date. Leave it empty." },
    ]);
    expect(travelDateIssues({ tripType: "annual", startDate: "2026-12-01", endDate: "" }, TODAY)).toEqual([]);
  });

  it("asks for the end date of a single trip", () => {
    expect(travelDateIssues({ tripType: "single", startDate: "2026-12-01", endDate: "" }, TODAY)).toEqual([
      { field: "endDate", message: "This field is required." },
    ]);
  });
});
