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
