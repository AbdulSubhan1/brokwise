import type { z } from "zod";
import { errorsByField, type FormValues } from "@/lib/form-state";
import type { LeadRequest } from "@/lib/policydesk";
import type { BuildResult, FieldSpec, FormKind, FormSectionSpec } from "./types";

/** A line's buildDetails: parse the form with its quick or full schema, and give back the request or the errors. */
export function detailsBuilder(schemas: Record<FormKind, z.ZodType<LeadRequest>>) {
  return (form: FormKind, values: FormValues): BuildResult => {
    const parsed = schemas[form].safeParse(values);
    return parsed.success ? { ok: true, request: parsed.data } : { ok: false, errors: errorsByField(parsed.error.issues) };
  };
}

/** The names a field puts in the form. */
export function namesOf(field: FieldSpec): string[] {
  switch (field.kind) {
    case "car":
      return ["make", "model", "year"];
    case "name":
      return ["customerName"];
    case "email":
      return ["email"];
    case "mobile":
      return ["countryCode", "mobile"];
    default:
      return [field.name];
  }
}

/** The labels of the fields the form components draw themselves (car, contact), so messages use the same words. */
export const FIXED_LABELS = {
  make: "Car make",
  model: "Car model",
  year: "Model year",
  customerName: "Full name",
  email: "Email",
  mobile: "Mobile number",
  countryCode: "Country code",
} as const;

/**
 * A field the form sends, as the error summary lists it: its label, the element id its link moves to, and its own
 * "required" message.
 */
export type FieldLabel = { name: string; label: string; anchor: string; required: string };

/** "Date of birth" → "Enter your date of birth."; "Car value (USD)" → "Enter your car value." */
function requiredOf(verb: "Enter" | "Choose", label: string): string {
  const noun = label.replace(/\s*\(.*\)$/, "");
  const lower = noun.charAt(0).toLowerCase() + noun.slice(1);
  return `${verb} ${lower.startsWith("your ") ? "" : "your "}${lower}.`;
}

function fixed(name: keyof typeof FIXED_LABELS, verb: "Enter" | "Choose", anchor: string = name): FieldLabel {
  const label = FIXED_LABELS[name];
  return { name, label, anchor, required: requiredOf(verb, label) };
}

/** The labels of the names a field puts in the form, in the order the form shows them. */
export function labelsOf(field: FieldSpec): FieldLabel[] {
  switch (field.kind) {
    case "car":
      return [fixed("make", "Choose"), fixed("model", "Choose"), fixed("year", "Choose")];
    case "name":
      return [fixed("customerName", "Enter")];
    case "email":
      return [fixed("email", "Enter")];
    case "mobile":
      // One label and one message line for both: the country code's mistakes show under the number.
      return [fixed("mobile", "Enter"), fixed("countryCode", "Choose", "mobile")];
    case "date": {
      // The link moves to the Day select, the first of the three.
      const required = requiredOf("Enter", field.label);
      return [{ name: field.name, label: field.label, anchor: `${field.name}-day`, required }];
    }
    default: {
      // A choice's link moves to its first radio button, which RadioCards gives the field's name as id.
      const verb = field.kind === "text" ? "Enter" : "Choose";
      const required = ("required" in field && field.required) || requiredOf(verb, field.label);
      return [{ name: field.name, label: field.label, anchor: field.name, required }];
    }
  }
}

export const sectionFields = (sections: readonly FormSectionSpec[]) =>
  sections.flatMap((s) => s.fields.flatMap(namesOf));

/** The date fields of a set of sections, which the server can rebuild from their Day/Month/Year selects. */
export const dateFields = (sections: readonly FormSectionSpec[]) =>
  sections.flatMap((s) => s.fields.filter((f) => f.kind === "date").map((f) => (f as { name: string }).name));

export const THIS_YEAR = new Date().getFullYear();

export const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;
