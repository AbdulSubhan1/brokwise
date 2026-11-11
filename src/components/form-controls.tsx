import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

const control =
  "mt-1 block w-full rounded-lg border border-line bg-card px-3 py-2.5 text-base text-ink placeholder:text-muted/70 focus:border-pine focus:outline-2 focus:outline-pine/30 aria-invalid:border-danger";

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm font-medium text-danger">
      {message}
    </p>
  );
}

type Common = { name: string; label: string; error?: string; hint?: ReactNode };

function describedBy(name: string, error?: string, hint?: ReactNode) {
  return [hint ? `${name}-hint` : null, error ? `${name}-error` : null].filter(Boolean).join(" ") || undefined;
}

function Hint({ name, hint }: { name: string; hint?: ReactNode }) {
  return hint ? (
    <p id={`${name}-hint`} className="mt-1 text-sm text-muted">
      {hint}
    </p>
  ) : null;
}

export function TextField({ name, label, error, hint, ...input }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="block font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={control}
        {...input}
      />
      <Hint name={name} hint={hint} />
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}

export function SelectField({
  name,
  label,
  error,
  hint,
  placeholder,
  options,
  ...select
}: Common & { placeholder?: string; options: readonly { value: string; label: string }[] } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label htmlFor={name} className="block font-medium">
        {label}
      </label>
      <select
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={control}
        {...select}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Hint name={name} hint={hint} />
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-line bg-card p-4 md:p-6">
      <legend className="px-1 text-lg font-bold">{title}</legend>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-pine px-5 py-3 text-base font-semibold text-white hover:bg-pine-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine disabled:opacity-60 md:w-auto"
    >
      {pending ? "Sending…" : children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  return (
    <p role="alert" className={message ? "rounded-lg bg-danger/10 px-4 py-3 font-medium text-danger" : "sr-only"}>
      {message ?? ""}
    </p>
  );
}
