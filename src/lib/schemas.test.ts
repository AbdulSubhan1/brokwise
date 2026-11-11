import { describe, expect, it } from "vitest";
import { formFieldOf, fullFormSchema, quickFormSchema } from "./schemas";

const quick = {
  customerName: "Ayesha Rahman",
  email: "Ayesha@Example.test",
  countryCode: "+92",
  mobile: "3001234567",
  make: "Toyota",
  model: "Corolla",
  year: "2021",
};

const full = {
  ...quick,
  gccSpec: "yes",
  carValue: "18,500",
  dateOfBirth: "1990-04-12",
  nationality: "Pakistani",
  city: "Lahore",
  yearsLicensed: "8",
};

function fieldErrors(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return (result.error?.issues ?? []).map((i) => i.path.join("."));
}

describe("quickFormSchema", () => {
  it("quick form accepts a valid lead", () => {
    const result = quickFormSchema.safeParse(quick);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      customerName: "Ayesha Rahman",
      email: "ayesha@example.test",
      phone: "+923001234567",
      details: { make: "Toyota", model: "Corolla", year: 2021 },
    });
  });

  it("rejects a one-word name", () => {
    const result = quickFormSchema.safeParse({ ...quick, customerName: "Ayesha" });
    expect(result.success).toBe(false);
    expect(fieldErrors(result)).toEqual(["customerName"]);
  });

  it("builds +923001234567 from +92 and 3001234567", () => {
    expect(quickFormSchema.parse(quick).phone).toBe("+923001234567");
    expect(quickFormSchema.parse({ ...quick, mobile: "0300 123-4567" }).phone).toBe("+923001234567");
  });

  it("rejects a mobile number of the wrong length for its country", () => {
    const result = quickFormSchema.safeParse({ ...quick, mobile: "30012345" });
    expect(fieldErrors(result)).toEqual(["mobile"]);
  });

  it("rejects a model that does not belong to the make", () => {
    const result = quickFormSchema.safeParse({ ...quick, model: "Civic" });
    expect(fieldErrors(result)).toEqual(["model"]);
  });

  it("rejects a year before 1990 or after next year", () => {
    expect(fieldErrors(quickFormSchema.safeParse({ ...quick, year: "1989" }))).toEqual(["year"]);
    const tooNew = String(new Date().getFullYear() + 2);
    expect(fieldErrors(quickFormSchema.safeParse({ ...quick, year: tooNew }))).toEqual(["year"]);
  });
});

describe("fullFormSchema", () => {
  it("accepts a full lead and builds the details", () => {
    expect(fullFormSchema.parse(full).details).toEqual({
      make: "Toyota",
      model: "Corolla",
      year: 2021,
      gccSpec: true,
      carValue: 18500,
      dateOfBirth: "1990-04-12",
      nationality: "Pakistani",
      city: "Lahore",
      yearsLicensed: 8,
    });
  });

  it("full form needs city", () => {
    const result = fullFormSchema.safeParse({ ...full, city: "" });
    expect(result.success).toBe(false);
    expect(fieldErrors(result)).toEqual(["city"]);
  });

  it("rejects a driver younger than 18", () => {
    const year = new Date().getFullYear() - 17;
    expect(fieldErrors(fullFormSchema.safeParse({ ...full, dateOfBirth: `${year}-01-01` }))).toEqual(["dateOfBirth"]);
  });
});

describe("formFieldOf", () => {
  it("maps PolicyDesk field paths back to form fields", () => {
    expect(formFieldOf("details.city")).toBe("city");
    expect(formFieldOf("phone")).toBe("mobile");
    expect(formFieldOf("customerName")).toBe("customerName");
    expect(formFieldOf("details.unknown")).toBeNull();
    expect(formFieldOf(undefined)).toBeNull();
  });
});
