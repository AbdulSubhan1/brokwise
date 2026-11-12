"use client";

import { LoadError } from "@/components/load-error";

export default function PlansError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <LoadError
      title="We couldn't load the plans"
      body="Your details are saved. We just can't show the plans right now. Please try again."
      retry={retry}
    />
  );
}
