"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isoFromParts } from "@/components/ui/date-parts";
import { clientIpFrom } from "@/lib/client-ip";
import {
  BOT_CHECK_FAILED,
  type FormState,
  type FormValues,
  SEND_FAILED,
  TOO_MANY_REQUESTS,
  TURNSTILE_FIELD,
} from "@/lib/form-state";
import { readJourney, setJourney } from "@/lib/journey";
import { createOpportunity, RATE_LIMITED, saveSelection, startPayment } from "@/lib/policydesk";
import { formFieldOf, REQUIRED } from "@/lib/schemas";
import { turnstileEnabled, verifyTurnstile } from "@/lib/turnstile";
import { formDateFields, formFields, type FormKind, getLob, type LobConfig, withFieldMessages } from "@/lobs";

// The journey's server actions, shared by every line of business. Each form carries its line in a hidden `lob`
// field; the line's config says which fields to read and how to build PolicyDesk's details.

// PolicyDesk's field messages are its own message keys; these are the ones worth showing as they are.
const POLICYDESK_MESSAGES: Record<string, string> = {
  "validation.required": REQUIRED,
  "validation.email": "Enter a valid email address.",
  "validation.phone": "Enter a valid mobile number.",
  "validation.phoneLength": "This mobile number has the wrong length.",
  "validation.fullName": "Enter your first and last name.",
  "validation.startInPast": "The trip can't start in the past.",
  "validation.endBeforeStart": "The trip must end on or after its start date.",
  "validation.tripTooLong": "A single trip can be up to 180 days.",
  "validation.annualNoEndDate": "An annual plan has no end date. Leave it empty.",
  "validation.ownersOnly": "Only owners insure the building. Leave it empty.",
  "validation.familyOnly": "Children are covered on a family plan only.",
  "validation.age": "The driver must be 18 to 80 years old.",
  "validation.ageHealth": "You must be 18 to 75 years old.",
};

export async function sendQuickForm(_prev: FormState, formData: FormData): Promise<FormState> {
  return send("short", formData);
}

export async function sendFullForm(_prev: FormState, formData: FormData): Promise<FormState> {
  return send("full", formData);
}

function lobOf(formData: FormData): LobConfig | null {
  const slug = formData.get("lob");
  return typeof slug === "string" ? getLob(slug) : null;
}

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** The form's values by field. A date comes from its hidden ISO field, or from its Day/Month/Year selects without JavaScript. */
function valuesOf(lob: LobConfig, form: FormKind, formData: FormData): FormValues {
  const values: FormValues = {};
  for (const field of formFields(lob, form)) values[field] = read(formData, field);
  for (const field of formDateFields(lob, form)) {
    values[field] ||= isoFromParts(read(formData, `${field}-day`), read(formData, `${field}-month`), read(formData, `${field}-year`));
  }
  return values;
}

async function send(form: FormKind, formData: FormData): Promise<FormState> {
  const lob = lobOf(formData);
  if (!lob) return { values: {}, errors: {}, formError: SEND_FAILED };
  const values = valuesOf(lob, form, formData);

  const built = lob.buildDetails(form, values);
  if (!built.ok) return { values, errors: withFieldMessages(lob, form, built.errors) };

  // Field mistakes come back first so they don't spend the visitor's check; the check comes before PolicyDesk.
  if (turnstileEnabled()) {
    const token = formData.get(TURNSTILE_FIELD);
    const passed = await verifyTurnstile(typeof token === "string" ? token : null, clientIpFrom(await headers()));
    if (!passed) return { values, errors: {}, formError: BOT_CHECK_FAILED };
  }

  const result = await createOpportunity({ form, product: lob.product, ...built.request });
  if (!result.ok) {
    if (result.error.code === RATE_LIMITED) return { values, errors: {}, formError: TOO_MANY_REQUESTS };
    const field = result.error.code === "invalid_request" ? formFieldOf(result.error.field, Object.keys(values)) : null;
    if (field) {
      const message = POLICYDESK_MESSAGES[result.error.message ?? ""] ?? "Please check this field.";
      return { values, errors: withFieldMessages(lob, form, { [field]: message }) };
    }
    return { values, errors: {}, formError: SEND_FAILED };
  }

  await setJourney(result.view.opportunity.publicId);
  // The full form creates a lead, so the visitor goes straight on to the plans; the short form waits for a call.
  redirect(form === "full" ? `/${lob.slug}/plans` : `/${lob.slug}/received`);
}

/** Where a plan or payment form's line lives: "/travel"; the home page if the form names no line we sell. */
function basePath(formData: FormData): string {
  const lob = lobOf(formData);
  return lob ? `/${lob.slug}` : "/";
}

const selectionSchema = z.object({
  planId: z.coerce.number().int().positive(),
  addOnIds: z.array(z.coerce.number().int().positive()).max(20),
});

/** Saves the plan card's choice. Only the plan id and ticked add-on ids go to PolicyDesk, which prices it. */
export async function selectPlan(formData: FormData): Promise<void> {
  const base = basePath(formData);
  const publicId = await readJourney();
  if (!publicId) redirect(base);

  const parsed = selectionSchema.safeParse({ planId: formData.get("planId"), addOnIds: formData.getAll("addOnIds") });
  if (!parsed.success) redirect(`${base}/plans?error=unavailable`);

  const result = await saveSelection(publicId, parsed.data);
  // One review page before paying: the saved choice and the Pay button are on the payment page.
  if (result.ok) redirect(`${base}/payment`);
  if (result.status === 409 && result.error.code === "no_lead") redirect(`${base}/received`);
  if (result.status === 404) redirect(base);
  if (result.error.code === RATE_LIMITED) redirect(`${base}/plans?error=rate_limited`);
  // 400: the plan or an add-on changed since the page was drawn; anything else is PolicyDesk being unreachable.
  redirect(result.status === 400 ? `${base}/plans?error=unavailable` : `${base}/plans?error=failed`);
}

/** What the payment form shows after a failed Pay: a terms error under the box, or a message for the whole form. */
export type PaymentFormState = { termsError?: string; formError?: string };

const TERMS_REQUIRED = "Tick the box to confirm before you pay.";
const PAYMENTS_UNAVAILABLE = "Payments are unavailable right now. Please try again later.";

/**
 * Pay: asks PolicyDesk for a PaySandbox checkout and sends the visitor there. PolicyDesk works out the amount from the
 * saved choice, so nothing but the terms box (and the line, for the way back) comes from the form.
 */
export async function startPaymentAction(_prev: PaymentFormState, formData: FormData): Promise<PaymentFormState> {
  const base = basePath(formData);
  const publicId = await readJourney();
  if (!publicId) redirect(base);
  if (formData.get("terms") !== "yes") return { termsError: TERMS_REQUIRED };

  const result = await startPayment(publicId);
  if (result.ok) redirect(result.data.checkoutUrl);
  if (result.code === "already_paid") redirect(`${base}/thank-you`);
  if (result.code === "no_selection") redirect(`${base}/plans`);
  if (result.code === "no_lead") redirect(`${base}/received`);
  if (result.status === 404) redirect(base);
  if (result.code === RATE_LIMITED) return { formError: TOO_MANY_REQUESTS };
  // 503 payments_disabled, 502 paysandbox_unavailable, or PolicyDesk itself unreachable.
  return { formError: PAYMENTS_UNAVAILABLE };
}
