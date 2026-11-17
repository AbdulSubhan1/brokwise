import { describe, expect, test } from "vitest";
import { matchCar, type RegReadResult } from "./regread";

const now = new Date("2026-11-17T00:00:00Z");

function result(make: string | null, model: string | null, year: string | null, status = "ok"): RegReadResult {
  const field = (value: string | null) => ({ value, status: value ? status : "empty" });
  return { country: "AE", fields: { make: field(make), model: field(model), year: field(year) } };
}

describe("matchCar", () => {
  test("fills make, model and year that are in Brokwise's lists", () => {
    expect(matchCar(result("Toyota", "Land Cruiser", "2021"), now)).toEqual({
      values: { make: "Toyota", model: "Land Cruiser", year: "2021" },
      notes: [],
    });
  });

  test("matches regardless of case, and a longer model name to the list's model", () => {
    expect(matchCar(result("TOYOTA", "corolla altis", "2014"), now).values).toEqual({
      make: "Toyota",
      model: "Corolla",
      year: "2014",
    });
  });

  test("a make that isn't in the list is left empty with a note", () => {
    const m = matchCar(result("Lexus", "LX 570", "2018"), now);
    expect(m.values).toEqual({ year: "2018" });
    expect(m.notes).toEqual(["The card says Lexus LX 570, which isn't in our list. Please pick the make and model."]);
  });

  test("a model that isn't in the make's list is left empty with a note", () => {
    const m = matchCar(result("Toyota", "Vitz", "2012"), now);
    expect(m.values).toEqual({ make: "Toyota", year: "2012" });
    expect(m.notes).toEqual(["The card says Toyota Vitz, which isn't in our list. Please pick the model."]);
  });

  test("a year outside the form's range is left empty with a note", () => {
    const m = matchCar(result("Nissan", "Patrol", "1985"), now);
    expect(m.values).toEqual({ make: "Nissan", model: "Patrol" });
    expect(m.notes).toEqual(["The card says 1985. Please pick the model year."]);
  });

  test("a value RegRead flagged is not used", () => {
    expect(matchCar(result("Toyota", "Corolla", "2014", "flagged"), now).values).toEqual({});
  });

  test("nothing readable gives no values and one note", () => {
    expect(matchCar(result(null, null, null), now)).toEqual({
      values: {},
      notes: ["We couldn't read the car on this card. Please fill in the fields."],
    });
  });
});
