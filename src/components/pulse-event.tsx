"use client";

import { useEffect } from "react";
import { trackPulse } from "@/lib/pulse-client";

/** Counts a named event in Pulse once, when the page shows. */
export function PulseEvent({ name, label }: { name: string; label?: string }) {
  useEffect(() => trackPulse(name, label), [name, label]);
  return null;
}
