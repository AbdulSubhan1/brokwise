import { describe, expect, it } from "vitest";
import { errorKeyOf, errorsLeft } from "./form-state";

describe("errorKeyOf", () => {
  it("maps a date's parts to the date's own name", () => {
    expect(errorKeyOf("dateOfBirth-day")).toBe("dateOfBirth");
    expect(errorKeyOf("startDate-year")).toBe("startDate");
    expect(errorKeyOf("carValue")).toBe("carValue");
  });
});

describe("errorsLeft", () => {
  const errors = { make: "Pick a car make.", customerName: "Enter your full name.", dateOfBirth: "Enter your date of birth." };

  it("drops the errors of fields changed since the last send", () => {
    expect(errorsLeft(errors, ["make", "dateOfBirth"])).toEqual({ customerName: "Enter your full name." });
  });

  it("keeps every error when nothing changed", () => {
    expect(errorsLeft(errors, [])).toBe(errors);
  });
});
