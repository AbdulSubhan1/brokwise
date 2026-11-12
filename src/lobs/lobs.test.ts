import { describe, expect, it } from "vitest";
import { getLob, LOB_SLUGS, lobForProduct } from "./index";

// buildDetails turns a form's raw strings into what PolicyDesk's POST /opportunities takes, or field errors.

const CONTACT = { customerName: "Ayesha Rahman", email: "Ayesha@Example.test", countryCode: "+92", mobile: "3001234567" };
const nextYear = new Date().getFullYear() + 1;

function details(slug: string, form: "short" | "full", values: Record<string, string>) {
  const result = getLob(slug)!.buildDetails(form, { ...CONTACT, ...values });
  if (!result.ok) throw new Error(`unexpected errors: ${JSON.stringify(result.errors)}`);
  return result.request;
}

function errors(slug: string, form: "short" | "full", values: Record<string, string>) {
  const result = getLob(slug)!.buildDetails(form, { ...CONTACT, ...values });
  return result.ok ? {} : result.errors;
}

describe("lines of business", () => {
  it("has car, travel, home and health, each selling its own product", () => {
    expect(LOB_SLUGS).toEqual(["car", "travel", "home", "health"]);
    for (const slug of LOB_SLUGS) expect(getLob(slug)!.product).toBe(slug);
    expect(getLob("boat")).toBeNull();
    expect(lobForProduct("health")?.slug).toBe("health");
    expect(lobForProduct("bike")).toBeNull();
  });
});

describe("buildDetails", () => {
  it("car full form", () => {
    const request = details("car", "full", {
      make: "Toyota",
      model: "Corolla",
      year: "2021",
      gccSpec: "yes",
      carValue: "18,500",
      dateOfBirth: "1990-04-12",
      nationality: "Pakistani",
      city: "Lahore",
      yearsLicensed: "8",
    });
    expect(request).toEqual({
      customerName: "Ayesha Rahman",
      email: "ayesha@example.test",
      phone: "+923001234567",
      details: {
        make: "Toyota",
        model: "Corolla",
        year: 2021,
        gccSpec: true,
        carValue: 18500,
        dateOfBirth: "1990-04-12",
        nationality: "Pakistani",
        city: "Lahore",
        yearsLicensed: 8,
      },
    });
  });

  it("travel quick form sends only the destination", () => {
    expect(details("travel", "short", { destination: "asia" }).details).toEqual({ destination: "asia" });
    expect(errors("travel", "short", { destination: "mars" })).toEqual({ destination: "Pick a destination." });
  });

  it("travel single trip", () => {
    expect(
      details("travel", "full", {
        destination: "europe_schengen",
        tripType: "single",
        startDate: `${nextYear}-03-01`,
        endDate: `${nextYear}-03-15`,
        travellers: "2",
        oldestAge: "41",
      }).details,
    ).toEqual({
      destination: "europe_schengen",
      tripType: "single",
      startDate: `${nextYear}-03-01`,
      endDate: `${nextYear}-03-15`,
      travellers: 2,
      oldestAge: 41,
    });
  });

  it("travel annual trip has no end date", () => {
    const request = details("travel", "full", {
      destination: "worldwide",
      tripType: "annual",
      startDate: `${nextYear}-01-10`,
      endDate: "",
      travellers: "1",
      oldestAge: "0",
    });
    expect(request.details).toEqual({
      destination: "worldwide",
      tripType: "annual",
      startDate: `${nextYear}-01-10`,
      travellers: 1,
      oldestAge: 0,
    });
  });

  it("travel refuses too many travellers and an age over 85", () => {
    const e = errors("travel", "full", {
      destination: "gcc",
      tripType: "annual",
      startDate: `${nextYear}-01-10`,
      travellers: "10",
      oldestAge: "86",
    });
    expect(Object.keys(e).sort()).toEqual(["oldestAge", "travellers"]);
  });

  it("home owner sends the building value", () => {
    expect(
      details("home", "full", {
        propertyType: "villa",
        occupancy: "owner",
        city: "Dubai",
        buildingValue: "450,000",
        contentsValue: "60000",
      }).details,
    ).toEqual({ propertyType: "villa", occupancy: "owner", city: "Dubai", buildingValue: 450000, contentsValue: 60000 });
  });

  it("home tenant needs no building value", () => {
    expect(
      details("home", "full", { propertyType: "apartment", occupancy: "tenant", city: "Lahore", contentsValue: "5000" })
        .details,
    ).toEqual({ propertyType: "apartment", occupancy: "tenant", city: "Lahore", contentsValue: 5000 });
    expect(
      errors("home", "full", {
        propertyType: "apartment",
        occupancy: "tenant",
        city: "Lahore",
        buildingValue: "100000",
        contentsValue: "5000",
      }),
    ).toEqual({ buildingValue: "Only owners insure the building. Leave it empty." });
  });

  it("home quick form sends the city", () => {
    expect(details("home", "short", { city: " Karachi " }).details).toEqual({ city: "Karachi" });
  });

  it("health family sends the children", () => {
    expect(
      details("health", "full", {
        coverFor: "family",
        children: "2",
        dateOfBirth: "1988-06-15",
        city: "Karachi",
        preExisting: "no",
      }).details,
    ).toEqual({ coverFor: "family", children: 2, dateOfBirth: "1988-06-15", city: "Karachi", preExisting: false });
  });

  it("health children only for family", () => {
    expect(
      details("health", "full", { coverFor: "me", dateOfBirth: "1988-06-15", city: "Karachi", preExisting: "yes" })
        .details,
    ).toEqual({ coverFor: "me", dateOfBirth: "1988-06-15", city: "Karachi", preExisting: true });
    expect(
      errors("health", "full", {
        coverFor: "me_spouse",
        children: "1",
        dateOfBirth: "1988-06-15",
        city: "Karachi",
        preExisting: "no",
      }),
    ).toEqual({ children: "Children are covered on a family plan only." });
  });

  it("health refuses an age outside 18 to 75", () => {
    const tooOld = `${new Date().getFullYear() - 76}-01-01`;
    expect(
      errors("health", "full", { coverFor: "me", dateOfBirth: tooOld, city: "Karachi", preExisting: "no" }),
    ).toEqual({ dateOfBirth: "You must be 18 to 75 years old." });
  });

  it("contact mistakes come back with the details' ones", () => {
    const result = getLob("health")!.buildDetails("short", { ...CONTACT, email: "nope", coverFor: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["coverFor", "email"]);
  });
});
