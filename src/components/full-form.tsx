"use client";

import { sendFullForm } from "@/app/car/actions";
import { CarFields } from "./car-fields";
import { useCarForm } from "./use-car-form";
import { MobileField } from "./contact-fields";
import { FieldError, FormError, FormSection, SubmitButton, TextField } from "./form-controls";

export function FullForm() {
  const { state, action, pending, onSubmit } = useCarForm(sendFullForm);
  const { values, errors } = state;
  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <FormSection title="Your car">
        <CarFields state={state} />
        <fieldset aria-describedby={errors.gccSpec ? "gccSpec-error" : undefined}>
          <legend className="font-medium">Is the car GCC spec?</legend>
          <div className="mt-2 flex gap-3">
            {(["yes", "no"] as const).map((v) => (
              <label
                key={v}
                className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-line bg-card px-3 py-2.5 has-checked:border-pine has-checked:bg-pine-soft"
              >
                <input
                  type="radio"
                  name="gccSpec"
                  value={v}
                  defaultChecked={values.gccSpec === v}
                  className="accent-pine"
                />
                {v === "yes" ? "Yes" : "No"}
              </label>
            ))}
          </div>
          <FieldError id="gccSpec-error" message={errors.gccSpec} />
        </fieldset>
        <TextField
          name="carValue"
          label="Car value (USD)"
          inputMode="numeric"
          placeholder="18000"
          hint="What the car is worth today, in whole dollars."
          defaultValue={values.carValue}
          error={errors.carValue}
        />
      </FormSection>

      <FormSection title="The driver">
        <TextField
          name="customerName"
          label="Full name"
          autoComplete="name"
          defaultValue={values.customerName}
          error={errors.customerName}
        />
        <TextField
          name="dateOfBirth"
          label="Date of birth"
          type="date"
          autoComplete="bday"
          defaultValue={values.dateOfBirth}
          error={errors.dateOfBirth}
        />
        <TextField
          name="nationality"
          label="Nationality"
          defaultValue={values.nationality}
          error={errors.nationality}
        />
        <TextField
          name="city"
          label="City"
          autoComplete="address-level2"
          defaultValue={values.city}
          error={errors.city}
        />
        <TextField
          name="yearsLicensed"
          label="Years with a driving licence"
          inputMode="numeric"
          defaultValue={values.yearsLicensed}
          error={errors.yearsLicensed}
        />
      </FormSection>

      <FormSection title="How we reach you">
        <TextField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          defaultValue={values.email}
          error={errors.email}
        />
        <MobileField state={state} />
      </FormSection>

      <FormError message={state.formError} />
      <SubmitButton pending={pending}>Get prices</SubmitButton>
    </form>
  );
}
