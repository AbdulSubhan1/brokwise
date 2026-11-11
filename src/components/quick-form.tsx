"use client";

import { useActionState } from "react";
import { sendQuickForm } from "@/app/car/actions";
import { EMPTY_FORM } from "@/lib/form-state";
import { CarFields } from "./car-fields";
import { ContactFields } from "./contact-fields";
import { FormError, FormSection, SubmitButton } from "./form-controls";

export function QuickForm() {
  const [state, action, pending] = useActionState(sendQuickForm, EMPTY_FORM);
  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <FormSection title="About you">
        <ContactFields state={state} />
      </FormSection>
      <FormSection title="Your car">
        <CarFields state={state} />
      </FormSection>
      <FormError message={state.formError} />
      <SubmitButton pending={pending}>Call me back</SubmitButton>
    </form>
  );
}
