import { z } from "zod";
import { FIRST_CAR_YEAR, isCarMake, modelsOf } from "./cars";

// Form rules for the car forms. They mirror PolicyDesk's schemas/website.ts so most mistakes are caught here,
// before a request is sent; PolicyDesk checks everything again.
// Inputs are the raw strings of the form; outputs are shaped for PolicyDesk's POST /opportunities.

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

const fullName = text(3, 80)
  .regex(NAME_PATTERN, "Use letters only.")
  .refine((v) => v.split(/\s+/).length >= 2, "Enter your first and last name.");

const email = z
  .string()
  .trim()
  .min(1, { error: REQUIRED, abort: true })
  .pipe(z.email("Enter a valid email address."))
  .transform((v) => v.toLowerCase());

const contactAndCar = z.object({
  customerName: fullName,
  email,
  countryCode: z.enum(DIALS, "Pick a country code."),
  // Spaces, dashes and one leading 0 are dropped: "0300 123-4567" → "3001234567".
  mobile: z
    .string()
    .transform((v) => v.replace(/[\s()-]/g, "").replace(/^0/, ""))
    .pipe(z.string().min(1, { error: REQUIRED, abort: true }).regex(/^\d+$/, "Use digits only.")),
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
});

type ContactAndCar = z.infer<typeof contactAndCar>;

function checkContactAndCar(v: ContactAndCar, ctx: z.RefinementCtx) {
  const country = COUNTRY_CODES.find((c) => c.dial === v.countryCode);
  if (country && (v.mobile.length < country.min || v.mobile.length > country.max)) {
    const digits = country.min === country.max ? `${country.min}` : `${country.min}–${country.max}`;
    ctx.addIssue({ code: "custom", path: ["mobile"], message: `Enter ${digits} digits after ${country.dial}.` });
  }
  if (!modelsOf(v.make).includes(v.model)) {
    ctx.addIssue({ code: "custom", path: ["model"], message: "Pick a model of this make." });
  }
}

function baseOutput(v: ContactAndCar) {
  return {
    customerName: v.customerName.replace(/\s+/g, " "),
    email: v.email,
    phone: `${v.countryCode}${v.mobile}`,
  };
}

export const quickFormSchema = contactAndCar.superRefine(checkContactAndCar).transform((v) => ({
  ...baseOutput(v),
  details: { make: v.make, model: v.model, year: v.year },
}));

/** Whole years between a date of birth (yyyy-mm-dd) and today. */
function ageOn(dateOfBirth: string, today = new Date()) {
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age;
}

export const fullFormSchema = contactAndCar
  .extend({
    gccSpec: z.enum(["yes", "no"], "Choose yes or no.").transform((v) => v === "yes"),
    carValue: wholeNumber(1, 1_000_000, "Enter a value between 1 and 1,000,000."),
    dateOfBirth: z
      .string()
      .min(1, REQUIRED)
      .pipe(z.iso.date("Enter a valid date."))
      .refine((v) => {
        const age = ageOn(v);
        return age >= 18 && age <= 80;
      }, "The driver must be 18 to 80 years old."),
    nationality: text(2, 60),
    city: text(2, 60),
    yearsLicensed: wholeNumber(0, 60, "Enter 0 to 60 years."),
  })
  .superRefine(checkContactAndCar)
  .transform((v) => ({
    ...baseOutput(v),
    details: {
      make: v.make,
      model: v.model,
      year: v.year,
      gccSpec: v.gccSpec,
      carValue: v.carValue,
      dateOfBirth: v.dateOfBirth,
      nationality: v.nationality,
      city: v.city,
      yearsLicensed: v.yearsLicensed,
    },
  }));

export const QUICK_FIELDS = ["customerName", "email", "countryCode", "mobile", "make", "model", "year"] as const;
export const FULL_FIELDS = [
  ...QUICK_FIELDS,
  "gccSpec",
  "carValue",
  "dateOfBirth",
  "nationality",
  "city",
  "yearsLicensed",
] as const;

export type FormField = (typeof FULL_FIELDS)[number];

/** The form field a PolicyDesk error path ("details.city", "phone") belongs to, or null if none. */
export function formFieldOf(path: string | undefined): FormField | null {
  if (!path) return null;
  if (path === "phone") return "mobile";
  const name = path.replace(/^details\./, "");
  return (FULL_FIELDS as readonly string[]).includes(name) ? (name as FormField) : null;
}
