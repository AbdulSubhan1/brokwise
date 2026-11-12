"use client";

import { useState } from "react";
import { sendFullForm, sendQuickForm } from "@/app/[lob]/actions";
import type { FormState } from "@/lib/form-state";
import { type FieldSpec, type FormKind, formSections, getLob } from "@/lobs";
import { CarFields } from "./car-fields";
import { MobileField } from "./contact-fields";
import { FormError, FormSection, SelectField, SubmitButton, TextField } from "./form-controls";
import { Turnstile } from "./turnstile";
import { DateField } from "./ui/date-field";
import { RadioCards } from "./ui/radio-cards";
import { useFormAction } from "./use-form-action";

const ACTIONS = { short: sendQuickForm, full: sendFullForm } as const;
const SUBMIT = { short: "Call me back", full: "Get prices" } as const;

/**
 * The quick ("Call me back") or full ("Get prices now") form of a line of business, drawn from its config. Fields with
 * `showWhen` appear only while the choice they depend on has one of the given values; a hidden field is not sent.
 * `turnstileSiteKey` is set only when Turnstile is on; then the form shows the check above its errors.
 */
export function LobForm({
  slug,
  form,
  turnstileSiteKey,
}: {
  slug: string;
  form: FormKind;
  turnstileSiteKey: string | null;
}) {
  const lob = getLob(slug)!;
  const { state, action, pending, onSubmit } = useFormAction(ACTIONS[form]);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const choiceOf = (name: string) => choices[name] ?? state.values[name] ?? "";
  const setChoice = (name: string, value: string) => setChoices((c) => ({ ...c, [name]: value }));
  const shown = (field: FieldSpec) => !field.showWhen || field.showWhen.is.includes(choiceOf(field.showWhen.field));

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="lob" value={lob.slug} />
      {formSections(lob, form).map((section) => (
        <FormSection key={section.title} title={section.title} icon={section.icon}>
          {section.fields.filter(shown).map((field) => (
            <Field
              key={"name" in field ? field.name : field.kind}
              field={field}
              state={state}
              choice={"name" in field ? choiceOf(field.name) : ""}
              onChoice={"name" in field ? (v) => setChoice(field.name, v) : undefined}
            />
          ))}
        </FormSection>
      ))}
      {turnstileSiteKey && <Turnstile siteKey={turnstileSiteKey} />}
      <FormError message={state.formError} />
      <SubmitButton pending={pending}>{SUBMIT[form]}</SubmitButton>
    </form>
  );
}

function Field({
  field,
  state,
  choice,
  onChoice,
}: {
  field: FieldSpec;
  state: FormState;
  choice: string;
  onChoice?: (value: string) => void;
}) {
  const { values, errors } = state;
  switch (field.kind) {
    case "car":
      return <CarFields state={state} />;
    case "name":
      return (
        <TextField
          name="customerName"
          label="Full name"
          autoComplete="name"
          defaultValue={values.customerName}
          error={errors.customerName}
        />
      );
    case "email":
      return (
        <TextField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          defaultValue={values.email}
          error={errors.email}
        />
      );
    case "mobile":
      return <MobileField state={state} />;
    case "text":
      return (
        <TextField
          name={field.name}
          label={field.label}
          hint={field.hint}
          placeholder={field.placeholder}
          inputMode={field.inputMode}
          autoComplete={field.autoComplete}
          suffix={field.suffix}
          defaultValue={values[field.name]}
          error={errors[field.name]}
        />
      );
    case "select":
      return (
        <SelectField
          name={field.name}
          label={field.label}
          hint={field.hint}
          placeholder={field.placeholder}
          options={field.options}
          defaultValue={values[field.name] ?? ""}
          onChange={(e) => onChoice?.(e.target.value)}
          error={errors[field.name]}
        />
      );
    case "choice":
      return (
        <RadioCards
          name={field.name}
          label={field.label}
          options={field.options}
          value={choice}
          onChange={onChoice}
          error={errors[field.name]}
        />
      );
    case "date":
      return (
        <DateField
          name={field.name}
          label={field.label}
          hint={field.hint}
          minYear={field.minYear}
          maxYear={field.maxYear}
          order={field.order}
          defaultValue={values[field.name]}
          error={errors[field.name]}
        />
      );
  }
}
