"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { errorsByField, type FormState, SEND_FAILED } from "@/lib/form-state";
import { readJourney, setJourney } from "@/lib/journey";
import { createOpportunity, saveSelection } from "@/lib/policydesk";
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

  const result = await createOpportunity({ form, product: "car", ...parsed.data });
  if (!result.ok) {
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
  // 400: the plan or an add-on changed since the page was drawn; anything else is PolicyDesk being unreachable.
  redirect(result.status === 400 ? "/car/plans?error=unavailable" : "/car/plans?error=failed");
}
