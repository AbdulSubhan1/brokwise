import { CAR_MAKES, carYears, modelsOf, type CarMake } from "./cars";

// RegRead (https://regread.vercel.app) reads a registration card and checks it. Brokwise only uses make, model and
// year, and only when they're in its own lists: the visitor still checks every field and submits the form.
export const REGREAD_URL =
  process.env.NEXT_PUBLIC_REGREAD_URL || "https://regread.vercel.app";

/** RegRead sample card used by "Try a sample card": a made-up UAE card for a Toyota Land Cruiser 2021. */
export const REGREAD_SAMPLE = "ae-clean";

type ReadField = { value: string | null; status: string };

/** The part of RegRead's answer Brokwise reads. */
export type RegReadResult = {
  country: string | null;
  fields: Record<"make" | "model" | "year", ReadField>;
};

export type CarMatch = {
  values: { make?: CarMake; model?: string; year?: string };
  notes: string[];
};

// "flagged" and "empty" mean RegRead has no trustworthy value for the field
const usable = (f: ReadField) =>
  f.value && f.status !== "flagged" && f.status !== "empty"
    ? f.value.trim()
    : null;
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function matchCar(result: RegReadResult, now = new Date()): CarMatch {
  const make = usable(result.fields.make);
  const model = usable(result.fields.model);
  const year = usable(result.fields.year);
  const values: CarMatch["values"] = {};
  const notes: string[] = [];
  if (!make && !model && !year)
    return {
      values,
      notes: [
        "We couldn't read the car on this card. Please fill in the fields.",
      ],
    };

  const listMake = make ? CAR_MAKES.find((m) => same(m, make)) : undefined;
  if (listMake) values.make = listMake;
  // A longer name on the card ("Corolla Altis") still matches the list's model ("Corolla")
  const listModel =
    listMake && model
      ? modelsOf(listMake).find(
          (m) =>
            same(m, model) ||
            model.toLowerCase().startsWith(`${m.toLowerCase()} `),
        )
      : undefined;
  if (listModel) values.model = listModel;
  const card = [make, model].filter(Boolean).join(" ");
  if (make && !listMake)
    notes.push(
      `The card says ${card}, which isn't in our list. Please pick the make and model.`,
    );
  else if (model && !listModel)
    notes.push(
      `The card says ${card}, which isn't in our list. Please pick the model.`,
    );

  if (year && carYears(now).includes(Number(year))) values.year = year;
  else if (year)
    notes.push(`The card says ${year}. Please pick the model year.`);
  return { values, notes };
}

export type ScanAnswer =
  { ok: true; result: RegReadResult } | { ok: false; status: number };

/** Sends a photo, PDF or sample id to RegRead. Status 0 = RegRead couldn't be reached. */
export async function scanWithRegRead(body: FormData): Promise<ScanAnswer> {
  try {
    const res = await fetch(`${REGREAD_URL}/api/scan`, {
      method: "POST",
      body,
    });
    return res.ok
      ? { ok: true, result: (await res.json()) as RegReadResult }
      : { ok: false, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
