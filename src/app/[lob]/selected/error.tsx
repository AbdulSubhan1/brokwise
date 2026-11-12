"use client";

import { LoadError } from "@/components/load-error";

export default function SelectedError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <LoadError
      title="We couldn't load your choice"
      body="We can't show your choice right now. Please try again."
      retry={retry}
    />
  );
}
