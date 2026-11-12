import { describe, expect, it } from "vitest";
import { getLob } from "./index";
import { ageOn, countOf, dayOf, usdOf } from "./summary";

const TODAY = "2026-11-12";

describe("summary pieces", () => {
  it("works out an age on a day", () => {
    expect(ageOn("1990-03-21", TODAY)).toBe(36);
    expect(ageOn("1990-11-12", TODAY)).toBe(36);
    expect(ageOn("1990-11-13", TODAY)).toBe(35);
    expect(ageOn("", TODAY)).toBeUndefined();
    expect(ageOn("21/03/1990", TODAY)).toBeUndefined();
  });

  it("writes money, counts and days, or nothing for a value the form doesn't send", () => {
    expect(usdOf("18000")).toBe("$18,000");
    expect(usdOf("lots")).toBeUndefined();
    expect(countOf("1", "traveller")).toBe("1 traveller");
    expect(countOf("3", "child", "children")).toBe("3 children");
    expect(countOf("", "year")).toBeUndefined();
    expect(dayOf("2026-12-05")).toBe("5 Dec 2026");
    expect(dayOf("soon")).toBeUndefined();
  });
});

describe("each line's quote summary", () => {
  it("car: the car, then what sets the price", () => {
    const summary = getLob("car")!.summary(
      {
        make: "Toyota",
        model: "Corolla",
        year: "2021",
        gccSpec: "yes",
        carValue: "18000",
        dateOfBirth: "1992-01-05",
        yearsLicensed: "6",
        city: "Lahore",
        customerName: "Bilal Ahmed",
        email: "bilal@example.test",
      },
      TODAY,
    );
    expect(summary).toEqual({
      title: "Toyota Corolla 2021",
      facts: ["GCC spec", "worth $18,000", "driver 34", "licence 6 years", "Lahore"],
      forWhom: "your Corolla",
    });
  });

  it("car: leaves out what it doesn't have", () => {
    expect(getLob("car")!.summary({ make: "Honda", gccSpec: "no", yearsLicensed: "1" }, TODAY)).toEqual({
      title: "Honda",
      facts: ["not GCC spec", "licence 1 year"],
      forWhom: "your car",
    });
    expect(getLob("car")!.summary({}, TODAY)).toEqual({ title: "Your car", facts: [], forWhom: "your car" });
  });

  it("travel: where, the dates and who", () => {
    const travel = getLob("travel")!;
    expect(
      travel.summary(
        { destination: "europe_schengen", tripType: "single", startDate: "2026-12-05", endDate: "2026-12-20", travellers: "2", oldestAge: "41" },
        TODAY,
      ),
    ).toEqual({
      title: "Europe (Schengen)",
      facts: ["single trip", "5 Dec 2026 to 20 Dec 2026", "2 travellers", "oldest 41"],
      forWhom: "your trip",
    });
    expect(travel.summary({ destination: "asia", tripType: "annual", startDate: "2027-01-01", travellers: "1", oldestAge: "30" }, TODAY))
      .toEqual({ title: "Asia", facts: ["annual plan", "from 1 Jan 2027", "1 traveller", "age 30"], forWhom: "your year of trips" });
  });

  it("home: the property and the values", () => {
    expect(
      getLob("home")!.summary(
        { propertyType: "villa", occupancy: "owner", city: "Karachi", buildingValue: "250000", contentsValue: "20000" },
        TODAY,
      ),
    ).toEqual({ title: "Villa in Karachi", facts: ["owner", "building $250,000", "contents $20,000"], forWhom: "your villa" });
  });

  it("health: who is covered", () => {
    expect(
      getLob("health")!.summary(
        { coverFor: "family", children: "2", dateOfBirth: "1990-03-21", preExisting: "no", city: "Lahore" },
        TODAY,
      ),
    ).toEqual({
      title: "My family",
      facts: ["2 children", "you 36", "no pre-existing conditions", "Lahore"],
      forWhom: "your family",
    });
    expect(getLob("health")!.summary({ coverFor: "me" }, TODAY).forWhom).toBe("you");
  });
});
