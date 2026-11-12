"use client";

import { LoadError } from "@/components/load-error";

export default function PaymentError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <LoadError
      title="We couldn't load your payment"
      body="Your choice is saved. We just can't show the payment page right now. Please try again."
      retry={retry}
    />
  );
}
