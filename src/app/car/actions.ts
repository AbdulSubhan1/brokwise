"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clientIpFrom } from "@/lib/client-ip";
import {
  BOT_CHECK_FAILED,
  errorsByField,
  type FormState,
  SEND_FAILED,
  TOO_MANY_REQUESTS,
  TURNSTILE_FIELD,
} from "@/lib/form-state";
import { readJourney, setJourney } from "@/lib/journey";
import { createOpportunity, RATE_LIMITED, saveSelection, startPayment } from "@/lib/policydesk";
import { turnstileEnabled, verifyTurnstile } from "@/lib/turnstile";
import { formFieldOf, FULL_FIELDS, fullFormSchema, QUICK_FIELDS, quickFormSchema, REQUIRED } from "@/lib/schemas";

// PolicyDesk's field messages are its own message keys; these are the ones worth showing as they are.
const POLICYDESK_MESSAGES: Record<string, string> = {
  "validation.required": REQUIRED,
  "validation.email": "Enter a valid email address.",
  "validation.phone": "Enter a valid mobile number.",
  "validation.phoneLength": "This mobile number has the wrong length.",
  "validation.fullName": "Enter your first and last name.",
};

export async function sendQuickForm(_prev: FormState, formData: FormData): Promise<FormState> {
  return send("short", formData);
}

export async function sendFullForm(_prev: FormState, formData: FormData): Promise<FormState> {
  return send("full", formData);
}

async function send(form: "short" | "full", formData: FormData): Promise<FormState> {
  const fields = form === "short" ? QUICK_FIELDS : FULL_FIELDS;
  const values: FormState["values"] = {};
  for (const field of fields) {
    const value = formData.get(field);
    values[field] = typeof value === "string" ? value : "";
  }

  const parsed = (form === "short" ? quickFormSchema : fullFormSchema).safeParse(values);
  if (!parsed.success) return { values, errors: errorsByField(parsed.error.issues) };

  // Field mistakes come back first so they don't spend the visitor's check; the check comes before PolicyDesk.
  if (turnstileEnabled()) {
    const token = formData.get(TURNSTILE_FIELD);
    const passed = await verifyTurnstile(typeof token === "string" ? token : null, clientIpFrom(await headers()));
    if (!passed) return { values, errors: {}, formError: BOT_CHECK_FAILED };
  }

  const result = await createOpportunity({ form, product: "car", ...parsed.data });
  if (!result.ok) {
    if (result.error.code === RATE_LIMITED) return { values, errors: {}, formError: TOO_MANY_REQUESTS };
    const field = result.error.code === "invalid_request" ? formFieldOf(result.error.field) : null;
    if (field) {
      const message = POLICYDESK_MESSAGES[result.error.message ?? ""] ?? "Please check this field.";
      return { values, errors: { [field]: message } };
    }
    return { values, errors: {}, formError: SEND_FAILED };
  }

  await setJourney(result.view.opportunity.publicId);
  // The full form creates a lead, so the visitor goes straight on to the plans; the short form waits for a call.
  redirect(form === "full" ? "/car/plans" : "/car/received");
}

const selectionSchema = z.object({
  planId: z.coerce.number().int().positive(),
  addOnIds: z.array(z.coerce.number().int().positive()).max(20),
});

/** Saves the plan card's choice. Only the plan id and ticked add-on ids go to PolicyDesk, which prices it. */
export async function selectPlan(formData: FormData): Promise<void> {
  const publicId = await readJourney();
  if (!publicId) redirect("/car");

  const parsed = selectionSchema.safeParse({ planId: formData.get("planId"), addOnIds: formData.getAll("addOnIds") });
  if (!parsed.success) redirect("/car/plans?error=unavailable");

  const result = await saveSelection(publicId, parsed.data);
  if (result.ok) redirect("/car/selected");
  if (result.status === 409 && result.error.code === "no_lead") redirect("/car/received");
  if (result.status === 404) redirect("/car");
  if (result.error.code === RATE_LIMITED) redirect("/car/plans?error=rate_limited");
  // 400: the plan or an add-on changed since the page was drawn; anything else is PolicyDesk being unreachable.
  redirect(result.status === 400 ? "/car/plans?error=unavailable" : "/car/plans?error=failed");
}

/** What the payment form shows after a failed Pay: a terms error under the box, or a message for the whole form. */
export type PaymentFormState = { termsError?: string; formError?: string };

const TERMS_REQUIRED = "Tick the box to agree to the terms before you pay.";
const PAYMENTS_UNAVAILABLE = "Payments are unavailable right now. Please try again later.";

/**
 * Pay: asks PolicyDesk for a PaySandbox checkout and sends the visitor there. PolicyDesk works out the amount from the
 * saved choice, so nothing but the terms box comes from the form.
 */
export async function startPaymentAction(_prev: PaymentFormState, formData: FormData): Promise<PaymentFormState> {
  const publicId = await readJourney();
  if (!publicId) redirect("/car");
  if (formData.get("terms") !== "yes") return { termsError: TERMS_REQUIRED };

  const result = await startPayment(publicId);
  if (result.ok) redirect(result.data.checkoutUrl);
  if (result.code === "already_paid") redirect("/car/thank-you");
  if (result.code === "no_selection") redirect("/car/plans");
  if (result.code === "no_lead") redirect("/car/received");
  if (result.status === 404) redirect("/car");
  if (result.code === RATE_LIMITED) return { formError: TOO_MANY_REQUESTS };
  // 503 payments_disabled, 502 paysandbox_unavailable, or PolicyDesk itself unreachable.
  return { formError: PAYMENTS_UNAVAILABLE };
}
