"use client";

import { LoaderCircle, Lock, ShieldCheck } from "lucide-react";
import { type FormEvent, startTransition, useActionState } from "react";
import { type PaymentFormState, startPaymentAction } from "@/app/[lob]/actions";
import { formatUsd } from "@/lib/money";
import { FieldError, FormError } from "./form-controls";
import { primaryButton, textLink } from "./ui/styles";

const EMPTY: PaymentFormState = {};

/**
 * Terms box and the Pay button. The server action checks the box again and sends the visitor to PaySandbox's hosted
 * checkout. Run through startTransition, like the journey forms, so a failed Pay keeps the box as the visitor left it;
 * without JavaScript the plain `action` still works.
 */
export function PaymentForm({ lob, total }: { lob: string; total: number }) {
  const [state, action, pending] = useActionState(startPaymentAction, EMPTY);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="lob" value={lob} />
      <div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-card px-4 py-3 has-checked:border-pine has-checked:bg-pine-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-pine">
          <input
            type="checkbox"
            name="terms"
            value="yes"
            required
            aria-invalid={state.termsError ? true : undefined}
            aria-describedby={state.termsError ? "terms-error" : undefined}
            className="mt-0.5 size-5 shrink-0 accent-pine focus-visible:outline-none"
          />
          <span>
            I agree to the{" "}
            <a href="/terms" target="_blank" rel="noreferrer" className={textLink}>
              terms and conditions
            </a>{" "}
            and confirm my details are made up for this demo.
          </span>
        </label>
        <FieldError id="terms-error" message={state.termsError} />
      </div>

      <FormError message={state.formError} />

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={pending}
          aria-describedby="pay-note"
          className={`${primaryButton} w-full text-base md:w-auto md:self-start`}
        >
          {pending ? (
            <LoaderCircle aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />
          ) : (
            <Lock aria-hidden className="size-5" />
          )}
          {pending ? "Opening PaySandbox…" : `Pay ${formatUsd(total)} with PaySandbox`}
        </button>
        <p id="pay-note" className="text-sm text-muted">
          You&apos;ll pay on PaySandbox&apos;s test checkout. Use test card 4242 4242 4242 4242.
        </p>
        <p className="flex items-center gap-1.5 text-sm font-medium text-pine-dark">
          <ShieldCheck aria-hidden className="size-4" />
          Secured by PaySandbox (test mode)
        </p>
      </div>
    </form>
  );
}
