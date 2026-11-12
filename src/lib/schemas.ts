import { z } from "zod";
import { FIRST_CAR_YEAR, isCarMake, modelsOf } from "./cars";
import { travelDateIssues } from "./travel-dates";

// Form rules for every line of business. They mirror PolicyDesk's schemas/website.ts (products, fields, ranges and the
// rules across fields) so most mistakes are caught here, before a request is sent; PolicyDesk checks everything again.
// Inputs are the raw strings of a form; outputs are shaped for PolicyDesk's POST /opportunities (without `form` and
// `product`). A field the form did not show arrives as "" and is left out of the details.

export const REQUIRED = "This field is required.";

/** Dialling codes offered on the forms, with the allowed length of the national number. */
export const COUNTRY_CODES = [
  { dial: "+92", label: "Pakistan +92", min: 10, max: 10 },
  { dial: "+971", label: "UAE +971", min: 8, max: 9 },
  { dial: "+966", label: "Saudi Arabia +966", min: 9, max: 9 },
  { dial: "+44", label: "UK +44", min: 10, max: 10 },
  { dial: "+1", label: "US/Canada +1", min: 10, max: 10 },
] as const;

const DIALS = COUNTRY_CODES.map((c) => c.dial) as [string, ...string[]];

// The choices of the new lines, as PolicyDesk's constants/website.ts has them. Their labels are in src/lobs.
export const TRAVEL_REGIONS = ["gcc", "asia", "europe_schengen", "worldwide_ex_us", "worldwide"] as const;
export const TRIP_TYPES = ["single", "annual"] as const;
export const PROPERTY_TYPES = ["apartment", "villa", "townhouse"] as const;
export const OCCUPANCIES = ["owner", "tenant"] as const;
export const HEALTH_COVER_FOR = ["me", "me_spouse", "family"] as const;

export const LIMITS = {
  driverAge: { min: 18, max: 80 },
  travellers: { min: 1, max: 9 },
  travellerAgeMax: 85,
  buildingValue: { min: 10_000, max: 5_000_000 },
  contentsValue: { min: 1_000, max: 500_000 },
  childrenMax: 6,
  healthAge: { min: 18, max: 75 },
} as const;

/** Letters in any script, plus spaces, apostrophes, hyphens and dots. */
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u;

const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, { error: REQUIRED, abort: true })
    .min(min, `Use at least ${min} characters.`)
    .max(max, `Use at most ${max} characters.`);

const wholeNumber = (min: number, max: number, rangeMessage: string) =>
  z
    .string()
    .transform((v) => v.replace(/[\s,]/g, ""))
    .pipe(z.string().min(1, { error: REQUIRED, abort: true }).regex(/^\d+$/, "Enter a whole number."))
    .transform(Number)
    .pipe(z.number().min(min, rangeMessage).max(max, rangeMessage));

/** "" (or a field the form did not send) → undefined. */
const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

/** A whole number the form may leave empty (a field it hid). */
const optionalWholeNumber = (min: number, max: number, rangeMessage: string) =>
  z.preprocess(blankToUndefined, wholeNumber(min, max, rangeMessage).optional());

const choice = <T extends readonly [string, ...string[]]>(values: T, message: string) => z.enum(values, message);

const yesNo = z.enum(["yes", "no"], "Choose yes or no.").transform((v) => v === "yes");

const isoDate = z.string().min(1, { error: REQUIRED, abort: true }).pipe(z.iso.date("Enter a valid date."));

const fullName = text(3, 80)
  .regex(NAME_PATTERN, "Use letters only.")
  .refine((v) => v.split(/\s+/).length >= 2, "Enter your first and last name.");

const email = z
  .string()
  .trim()
  .min(1, { error: REQUIRED, abort: true })
  .pipe(z.email("Enter a valid email address."))
  .transform((v) => v.toLowerCase());

const contactShape = {
  customerName: fullName,
  email,
  countryCode: z.enum(DIALS, "Pick a country code."),
  // Spaces, dashes and one leading 0 are dropped: "0300 123-4567" → "3001234567".
  mobile: z
    .string()
    .transform((v) => v.replace(/[\s()-]/g, "").replace(/^0/, ""))
    .pipe(z.string().min(1, { error: REQUIRED, abort: true }).regex(/^\d+$/, "Use digits only.")),
};

type Contact = { customerName: string; email: string; countryCode: string; mobile: string };
type Issue = (field: string, message: string) => void;

/** Whole years between a date of birth (yyyy-mm-dd) and today. */
function ageOn(dateOfBirth: string, today = new Date()) {
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age;
}

const dateOfBirth = ({ min, max }: { min: number; max: number }, message: string) =>
  isoDate.refine((v) => {
    const age = ageOn(v);
    return age >= min && age <= max;
  }, message);

/** Drops the keys a form left out ("" became undefined), so PolicyDesk's strict schema never sees them. */
function compact<T extends Record<string, unknown>>(details: T): T {
  return Object.fromEntries(Object.entries(details).filter(([, v]) => v !== undefined)) as T;
}

/**
 * A form schema: the contact fields plus a product's fields, its rules across fields, and how the details are built.
 * The output is { customerName, email, phone, details }.
 */
function leadSchema<S extends z.ZodRawShape, D extends Record<string, unknown>>(
  shape: S,
  toDetails: (v: z.output<z.ZodObject<S>>) => D,
  check?: (v: z.output<z.ZodObject<S>>, issue: Issue) => void,
) {
  return z
    .object({ ...contactShape, ...shape })
    .superRefine((value, ctx) => {
      const v = value as unknown as Contact & z.output<z.ZodObject<S>>;
      const issue: Issue = (field, message) => ctx.addIssue({ code: "custom", path: [field], message });
      const country = COUNTRY_CODES.find((c) => c.dial === v.countryCode);
      if (country && (v.mobile.length < country.min || v.mobile.length > country.max)) {
        const digits = country.min === country.max ? `${country.min}` : `${country.min}–${country.max}`;
        issue("mobile", `Enter ${digits} digits after ${country.dial}.`);
      }
      check?.(v, issue);
    })
    .transform((value) => {
      const v = value as unknown as Contact & z.output<z.ZodObject<S>>;
      return {
        customerName: v.customerName.replace(/\s+/g, " "),
        email: v.email,
        phone: `${v.countryCode}${v.mobile}`,
        details: compact(toDetails(v)),
      };
    });
}

// Car

const carShape = {
  make: z.string().refine(isCarMake, "Pick a car make."),
  model: z.string().min(1, REQUIRED),
  year: z
    .string()
    .min(1, REQUIRED)
    .transform(Number)
    .pipe(
      z
        .number()
        .int("Pick a year.")
        .min(FIRST_CAR_YEAR, "Pick a year from the list.")
        .refine((y) => y <= new Date().getFullYear() + 1, "Pick a year from the list."),
    ),
};

const checkModel = (v: { make: string; model: string }, issue: Issue) => {
  if (!modelsOf(v.make).includes(v.model)) issue("model", "Pick a model of this make.");
};

export const carQuickSchema = leadSchema(carShape, (v) => ({ make: v.make, model: v.model, year: v.year }), checkModel);

export const carFullSchema = leadSchema(
  {
    ...carShape,
    gccSpec: yesNo,
    carValue: wholeNumber(1, 1_000_000, "Enter a value between 1 and 1,000,000."),
    dateOfBirth: dateOfBirth(LIMITS.driverAge, "The driver must be 18 to 80 years old."),
    nationality: text(2, 60),
    city: text(2, 60),
    yearsLicensed: wholeNumber(0, 60, "Enter 0 to 60 years."),
  },
  (v) => ({
    make: v.make,
    model: v.model,
    year: v.year,
    gccSpec: v.gccSpec,
    carValue: v.carValue,
    dateOfBirth: v.dateOfBirth,
    nationality: v.nationality,
    city: v.city,
    yearsLicensed: v.yearsLicensed,
  }),
  checkModel,
);

// Travel

const destination = choice(TRAVEL_REGIONS, "Pick a destination.");

export const travelQuickSchema = leadSchema({ destination }, (v) => ({ destination: v.destination }));

export const travelFullSchema = leadSchema(
  {
    destination,
    tripType: choice(TRIP_TYPES, "Choose a single trip or an annual plan."),
    startDate: isoDate,
    // Checked with the trip type below: needed for a single trip, refused on an annual plan.
    endDate: z.preprocess((v) => blankToUndefined(v) ?? "", z.union([z.literal(""), z.iso.date("Enter a valid date.")])),
    travellers: wholeNumber(LIMITS.travellers.min, LIMITS.travellers.max, "Choose 1 to 9 travellers."),
    oldestAge: wholeNumber(0, LIMITS.travellerAgeMax, "Enter an age from 0 to 85."),
  },
  (v) => ({
    destination: v.destination,
    tripType: v.tripType,
    startDate: v.startDate,
    endDate: v.tripType === "single" && v.endDate ? v.endDate : undefined,
    travellers: v.travellers,
    oldestAge: v.oldestAge,
  }),
  (v, issue) => {
    for (const { field, message } of travelDateIssues(v)) issue(field, message);
  },
);

// Home

const city = text(2, 60);

export const homeQuickSchema = leadSchema({ city }, (v) => ({ city: v.city }));

export const homeFullSchema = leadSchema(
  {
    propertyType: choice(PROPERTY_TYPES, "Choose the type of property."),
    occupancy: choice(OCCUPANCIES, "Choose owner or tenant."),
    city,
    buildingValue: optionalWholeNumber(
      LIMITS.buildingValue.min,
      LIMITS.buildingValue.max,
      "Enter a value between 10,000 and 5,000,000.",
    ),
    contentsValue: wholeNumber(
      LIMITS.contentsValue.min,
      LIMITS.contentsValue.max,
      "Enter a value between 1,000 and 500,000.",
    ),
  },
  (v) => ({
    propertyType: v.propertyType,
    occupancy: v.occupancy,
    city: v.city,
    buildingValue: v.occupancy === "owner" ? v.buildingValue : undefined,
    contentsValue: v.contentsValue,
  }),
  (v, issue) => {
    // A tenant insures only what they own inside.
    if (v.occupancy === "owner" && v.buildingValue === undefined) issue("buildingValue", REQUIRED);
    if (v.occupancy === "tenant" && v.buildingValue !== undefined) {
      issue("buildingValue", "Only owners insure the building. Leave it empty.");
    }
  },
);

// Health

const coverFor = choice(HEALTH_COVER_FOR, "Choose who is covered.");

export const healthQuickSchema = leadSchema({ coverFor }, (v) => ({ coverFor: v.coverFor }));

export const healthFullSchema = leadSchema(
  {
    coverFor,
    children: optionalWholeNumber(0, LIMITS.childrenMax, "Choose 0 to 6 children."),
    dateOfBirth: dateOfBirth(LIMITS.healthAge, "You must be 18 to 75 years old."),
    city,
    preExisting: yesNo,
  },
  (v) => ({
    coverFor: v.coverFor,
    children: v.coverFor === "family" ? v.children : undefined,
    dateOfBirth: v.dateOfBirth,
    city: v.city,
    preExisting: v.preExisting,
  }),
  (v, issue) => {
    if (v.coverFor === "family" && v.children === undefined) issue("children", REQUIRED);
    if (v.coverFor !== "family" && v.children !== undefined) {
      issue("children", "Children are covered on a family plan only.");
    }
  },
);

/** The contact fields every form has, in the names the form uses. */
export const CONTACT_FIELDS = ["customerName", "email", "countryCode", "mobile"] as const;

/** The form field a PolicyDesk error path ("details.city", "phone") belongs to, if the form has it. */
export function formFieldOf(path: string | undefined, fields: readonly string[]): string | null {
  if (!path) return null;
  if (path === "phone") return "mobile";
  const name = path.replace(/^details\./, "");
  return fields.includes(name) ? name : null;
}
