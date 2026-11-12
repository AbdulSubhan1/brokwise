import type { LucideIcon } from "lucide-react";
import { FieldError } from "./field-error";

export type RadioCardOption = { value: string; label: string; description?: string; icon?: LucideIcon };

/**
 * Big tappable choices for a handful of options (yes/no, trip type, who is covered). Real radio buttons, invisible
 * and stretched over their card, so taps, arrow keys, focus and screen readers behave as usual; the card shows the
 * checked and focused states.
 */
export function RadioCards({
  name,
  label,
  options,
  value,
  defaultValue,
  onChange,
  error,
}: {
  name: string;
  label: string;
  options: readonly RadioCardOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  error?: string;
}) {
  const columns = options.length === 2 ? "grid-cols-2" : "grid-cols-1 md:grid-cols-3";
  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined} className="md:col-span-2">
      <legend className="font-medium">{label}</legend>
      <div className={`mt-1.5 grid gap-2 ${columns}`}>
        {options.map((o) => {
          const Icon = o.icon;
          const descriptionId = o.description ? `${name}-${o.value}-description` : undefined;
          return (
            <label
              key={o.value}
              className="group relative flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-card px-3 py-3 hover:border-pine/60 has-checked:border-pine has-checked:bg-pine-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-pine"
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                {...(value !== undefined
                  ? { checked: value === o.value, onChange: () => onChange?.(o.value) }
                  : { defaultChecked: defaultValue === o.value, onChange: () => onChange?.(o.value) })}
                aria-describedby={descriptionId}
                className="peer absolute inset-0 size-full cursor-pointer appearance-none rounded-xl opacity-0"
              />
              {Icon && (
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-lg bg-paper text-pine group-has-checked:bg-pine group-has-checked:text-white"
                >
                  <Icon className="size-5" />
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{o.label}</span>
                {o.description && (
                  <span id={descriptionId} className="text-sm text-muted">
                    {o.description}
                  </span>
                )}
              </span>
              <span
                aria-hidden
                className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-line bg-card peer-checked:border-pine"
              >
                <span className="size-2.5 rounded-full bg-pine opacity-0 group-has-checked:opacity-100" />
              </span>
            </label>
          );
        })}
      </div>
      <FieldError id={`${name}-error`} message={error} />
    </fieldset>
  );
}
