import { LoaderCircle, type LucideIcon } from "lucide-react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { FieldError } from "./ui/field-error";
import { SectionHeading } from "./ui/section-heading";
import { type Option, Select } from "./ui/select";
import { control, primaryButton } from "./ui/styles";

export { FieldError };

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

export function TextField({
  name,
  label,
  error,
  hint,
  suffix,
  ...input
}: Common & { suffix?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="block font-medium">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={name}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(name, error, hint)}
          className={`${control} ${suffix ? "pr-14" : ""}`}
          {...input}
        />
        {suffix && (
          <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">
            {suffix}
          </span>
        )}
      </div>
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
}: Common & { placeholder?: string; options: readonly Option[] } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label htmlFor={name} className="block font-medium">
        {label}
      </label>
      <Select
        id={name}
        name={name}
        className="mt-1"
        placeholder={placeholder}
        options={options}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        {...select}
      />
      <Hint name={name} hint={hint} />
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}

/** One card of a form: an icon heading as the (floated) legend, then the fields in one or two columns. */
export function FormSection({ title, icon, children }: { title: string; icon?: LucideIcon; children: ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-line bg-card p-4 md:p-6">
      <legend className="float-left mb-4 w-full">
        <SectionHeading icon={icon} title={title} />
      </legend>
      <div className="clear-both grid gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/** `pulseEvent` and `pulseLabel` name the click in Pulse (data-pulse-event / data-pulse-label). */
export function SubmitButton({
  pending,
  children,
  pulseEvent,
  pulseLabel,
}: {
  pending: boolean;
  children: ReactNode;
  pulseEvent?: string;
  pulseLabel?: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      data-pulse-event={pulseEvent}
      data-pulse-label={pulseLabel}
      className={`${primaryButton} w-full text-base md:w-auto md:self-start`}
    >
      {pending && <LoaderCircle aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />}
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
