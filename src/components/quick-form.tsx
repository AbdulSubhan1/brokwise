"use client";

import { sendQuickForm } from "@/app/car/actions";
import { CarFields } from "./car-fields";
import { useCarForm } from "./use-car-form";
import { ContactFields } from "./contact-fields";
import { FormError, FormSection, SubmitButton } from "./form-controls";

export function QuickForm() {
  const { state, action, pending, onSubmit } = useCarForm(sendQuickForm);
  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
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
