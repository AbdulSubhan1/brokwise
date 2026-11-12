"use client";

import { LoadError } from "@/components/load-error";

export default function ThankYouError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <LoadError
      title="We couldn't load your order"
      body="If you paid, your payment is safe. We just can't show your order right now. Please try again."
      retry={retry}
    />
  );
}
