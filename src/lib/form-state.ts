import type { FormField } from "./schemas";

/** What a car form's server action returns: the typed values (to refill the form) and the errors to show. */
export type FormState = {
  values: Partial<Record<FormField, string>>;
  errors: Partial<Record<FormField, string>>;
  formError?: string;
};

export const EMPTY_FORM: FormState = { values: {}, errors: {} };

export const SEND_FAILED = "We couldn't send your request. Please try again.";

/** The first message for each field, from Zod issues. */
export function errorsByField(issues: readonly { path: PropertyKey[]; message: string }[]): FormState["errors"] {
  const errors: FormState["errors"] = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "") as FormField;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}
