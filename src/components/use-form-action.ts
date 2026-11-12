"use client";

import { type FormEvent, startTransition, useActionState } from "react";
import { EMPTY_FORM, type FormState } from "@/lib/form-state";

/**
 * Runs a journey form's server action without React's automatic form reset, so a failed send keeps every value the
 * visitor chose (a reset would put the selects back to their first option). Without JavaScript the plain
 * `action` still works.
 */
export function useFormAction(serverAction: (prev: FormState, formData: FormData) => Promise<FormState>) {
  const [state, action, pending] = useActionState(serverAction, EMPTY_FORM);
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => action(formData));
  }
  return { state, action, pending, onSubmit };
}
