"use server";

import { redirect } from "next/navigation";
import { errorsByField, type FormState, SEND_FAILED } from "@/lib/form-state";
import { setJourney } from "@/lib/journey";
import { createOpportunity } from "@/lib/policydesk";
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
  redirect("/car/received");
}
