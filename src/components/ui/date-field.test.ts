import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DateField } from "./date-field";
import { daysInMonth, isoFromParts, partsFromIso, yearOptions } from "./date-parts";

describe("DateField", () => {
  it("DateField builds 1995-11-15", () => {
    expect(isoFromParts("15", "11", "1995")).toBe("1995-11-15");
    expect(isoFromParts("5", "1", "2026")).toBe("2026-01-05");
  });

  it("DateField refuses 31 February", () => {
    expect(isoFromParts("31", "2", "2025")).toBe("");
    expect(isoFromParts("29", "2", "2025")).toBe("");
    expect(isoFromParts("29", "2", "2024")).toBe("2024-02-29");
  });

  it("an unfinished date is empty", () => {
    expect(isoFromParts("", "11", "1995")).toBe("");
    expect(isoFromParts("15", "", "1995")).toBe("");
    expect(isoFromParts("15", "11", "")).toBe("");
  });

  it("reads a saved ISO value back into its parts", () => {
    expect(partsFromIso("1995-11-15")).toEqual({ day: "15", month: "11", year: "1995" });
    expect(partsFromIso("nonsense")).toEqual({ day: "", month: "", year: "" });
    expect(partsFromIso(undefined)).toEqual({ day: "", month: "", year: "" });
  });

  it("knows the days of each month", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2025, 2)).toBe(28);
    expect(daysInMonth(2025, 4)).toBe(30);
    expect(daysInMonth(2025, 12)).toBe(31);
  });

  it("lists years between min and max, newest first or oldest first", () => {
    expect(yearOptions(2024, 2026, "desc")).toEqual([2026, 2025, 2024]);
    expect(yearOptions(2024, 2026, "asc")).toEqual([2024, 2025, 2026]);
  });

  it("renders a labelled group with Day, Month and Year and one hidden ISO value", () => {
    const html = renderToStaticMarkup(
      createElement(DateField, { name: "dateOfBirth", label: "Date of birth", minYear: 1950, maxYear: 2008, defaultValue: "1995-11-15" }),
    );
    expect(html).toMatch(/<fieldset[^>]*>.*<legend[^>]*>Date of birth<\/legend>/);
    expect(html).toContain(">Day<");
    expect(html).toContain(">Month<");
    expect(html).toContain(">Year<");
    // The part labels are for screen readers; the placeholders show the same words.
    expect(html).toContain('<label for="dateOfBirth-day" class="sr-only">Day</label>');
    expect(html).toMatch(/<input[^>]*type="hidden"[^>]*name="dateOfBirth"[^>]*value="1995-11-15"/);
  });
});
