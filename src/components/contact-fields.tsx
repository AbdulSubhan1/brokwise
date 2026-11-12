import { COUNTRY_CODES } from "@/lib/schemas";
import type { FormState } from "@/lib/form-state";
import { FieldError } from "./form-controls";
import { Select } from "./ui/select";
import { control } from "./ui/styles";

const DIALS = COUNTRY_CODES.map((c) => ({ value: c.dial, label: c.label }));

/** Mobile number: country code + national number, one label for both. */
export function MobileField({ state }: { state: FormState }) {
  const { values, errors } = state;
  const error = errors.mobile ?? errors.countryCode;
  return (
    <div>
      <label htmlFor="mobile" className="block font-medium">
        Mobile number
      </label>
      <div className="mt-1 flex gap-2">
        <Select
          name="countryCode"
          aria-label="Country code"
          defaultValue={values.countryCode ?? "+92"}
          options={DIALS}
          className="w-36 shrink-0"
        />
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
          className={`${control} min-w-0`}
        />
      </div>
      <FieldError id="mobile-error" message={error} />
    </div>
  );
}
