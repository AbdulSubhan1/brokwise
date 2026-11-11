"use client";

import { LoadError } from "@/components/load-error";

export default function ReceivedError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <LoadError
      title="We couldn't load your request"
      body="Your request was sent. We just can't show it right now. Please try again."
      retry={retry}
    />
  );
}
