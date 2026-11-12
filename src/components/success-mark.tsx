import { Check } from "lucide-react";

/** The big tick at the top of the received, saved-choice and thank-you pages. */
export function SuccessMark() {
  return (
    <span aria-hidden className="grid size-16 place-items-center rounded-full bg-pine-soft">
      <span className="grid size-11 place-items-center rounded-full bg-pine text-white">
        <Check className="size-6" strokeWidth={3} />
      </span>
    </span>
  );
}
