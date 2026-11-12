"use client";

import { type FormEvent, useEffect, useState } from "react";
import { sendFullForm, sendQuickForm } from "@/app/[lob]/actions";
import { errorKeyOf, errorsLeft, type FormState } from "@/lib/form-state";
import { type FieldSpec, type FormKind, formSections, getLob, labelsOf } from "@/lobs";
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
 * `turnstileSiteKey` is set only when Turnstile is on; then the form shows the check above its errors. After a send
 * with field mistakes, each field shows its message under itself and the first one is scrolled to and focused (a
 * screen reader reads its message from aria-describedby). A field's message goes away as soon as the visitor changes
 * that field; the next send checks everything again.
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
  const { state: sent, action, pending, onSubmit } = useFormAction(ACTIONS[form]);
  // Fields changed since the last send, tied to that send's state so a new answer starts with none
  const [edited, setEdited] = useState<{ after: FormState; names: string[] }>({ after: sent, names: [] });
  const editedNames = edited.after === sent ? edited.names : [];
  const state: FormState = { ...sent, errors: errorsLeft(sent.errors, editedNames) };
  function onFieldChange(e: FormEvent<HTMLFormElement>) {
    const name = (e.target as HTMLInputElement).name;
    if (!name || !sent.errors[errorKeyOf(name)] || editedNames.includes(errorKeyOf(name))) return;
    setEdited({ after: sent, names: [...editedNames, errorKeyOf(name)] });
  }
  const [choices, setChoices] = useState<Record<string, string>>({});
  const choiceOf = (name: string) => choices[name] ?? state.values[name] ?? "";
  const setChoice = (name: string, value: string) => setChoices((c) => ({ ...c, [name]: value }));
  const shown = (field: FieldSpec) => !field.showWhen || field.showWhen.is.includes(choiceOf(field.showWhen.field));
  const sections = formSections(lob, form);

  // Each failed send returns a new state: take the visitor to the first field with a mistake, in the form's order.
  const firstWithError = sections
    .flatMap((s) => s.fields.filter(shown).flatMap(labelsOf))
    .find((label) => sent.errors[label.name])?.anchor;
  useEffect(() => {
    if (!firstWithError) return;
    const field = document.getElementById(firstWithError);
    field?.scrollIntoView({ block: "center" });
    field?.focus({ preventScroll: true });
    // Only a new send moves focus, not a re-render while the visitor fixes fields
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sent]);

  return (
    <form action={action} onSubmit={onSubmit} onChange={onFieldChange} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="lob" value={lob.slug} />
      {sections.map((section) => (
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
