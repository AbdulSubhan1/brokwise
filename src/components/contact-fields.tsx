import { COUNTRY_CODES } from "@/lib/schemas";
import type { FormState } from "@/lib/form-state";
import { FieldError, TextField } from "./form-controls";

/** Full name, email and mobile (country code + national number). */
export function ContactFields({ state, nameLabel = "Full name" }: { state: FormState; nameLabel?: string }) {
  const { values, errors } = state;
  return (
    <>
      <TextField
        name="customerName"
        label={nameLabel}
        autoComplete="name"
        defaultValue={values.customerName}
        error={errors.customerName}
      />
      <TextField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={values.email}
        error={errors.email}
      />
      <MobileField state={state} />
    </>
  );
}

export function MobileField({ state }: { state: FormState }) {
  const { values, errors } = state;
  const error = errors.mobile ?? errors.countryCode;
  return (
    <div>
      <label htmlFor="mobile" className="block font-medium">
        Mobile number
      </label>
      <div className="mt-1 flex gap-2">
        <select
          name="countryCode"
          aria-label="Country code"
          defaultValue={values.countryCode ?? "+92"}
          className="rounded-lg border border-line bg-card px-2 py-2.5 text-base focus:border-pine focus:outline-2 focus:outline-pine/30"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.dial} value={c.dial}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          id="mobile"
          name="mobile"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="3001234567"
          defaultValue={values.mobile}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "mobile-error" : undefined}
          className="block w-full min-w-0 rounded-lg border border-line bg-card px-3 py-2.5 text-base placeholder:text-muted/70 focus:border-pine focus:outline-2 focus:outline-pine/30 aria-invalid:border-danger"
        />
      </div>
      <FieldError id="mobile-error" message={error} />
    </div>
  );
}
