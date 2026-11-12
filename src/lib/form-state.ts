/** A form's raw values by field name. */
export type FormValues = Record<string, string>;

/** What a form's server action returns: the typed values (to refill the form) and the errors to show. */
export type FormState = {
  values: FormValues;
  errors: Record<string, string>;
  formError?: string;
};

export const EMPTY_FORM: FormState = { values: {}, errors: {} };

export const SEND_FAILED = "We couldn't send your request. Please try again.";

/** The first message for each field, from Zod issues. */
export function errorsByField(issues: readonly { path: PropertyKey[]; message: string }[]): FormState["errors"] {
  const errors: FormState["errors"] = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

/** The error key a control belongs to: a date's day, month and year inputs all belong to the date's own name. */
export const errorKeyOf = (inputName: string) => inputName.replace(/-(day|month|year)$/, "");

/** The errors still to show once the visitor has changed some fields since the last send. */
export function errorsLeft(errors: FormState["errors"], edited: readonly string[]): FormState["errors"] {
  if (edited.length === 0) return errors;
  return Object.fromEntries(Object.entries(errors).filter(([field]) => !edited.includes(field)));
}

/** Shown wherever PolicyDesk answers 429: this visitor's IP passed one of its hourly limits. */
export const TOO_MANY_REQUESTS = "Too many requests. Please wait a few minutes and try again.";

/** Shown when Turnstile is on and the visitor's check is missing or refused. */
export const BOT_CHECK_FAILED = "Please complete the check to show you're not a bot.";

/** The form field the Turnstile widget's token travels in (Cloudflare's own name for it). */
export const TURNSTILE_FIELD = "cf-turnstile-response";
