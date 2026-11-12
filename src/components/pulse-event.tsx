"use client";

import { useEffect } from "react";

type PulseWindow = Window & { pulse?: { track?: (name: string) => void; q?: string[] } };

/** Counts a named event in Pulse once, when the page shows. Before the beacon has loaded, the name waits in its queue. */
export function PulseEvent({ name }: { name: string }) {
  useEffect(() => {
    const w = window as PulseWindow;
    if (w.pulse?.track) w.pulse.track(name);
    else (w.pulse ??= { q: [] }).q?.push(name);
  }, [name]);
  return null;
}
