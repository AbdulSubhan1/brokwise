// Counts a named event in Pulse from client code. Before the beacon has loaded, the event waits in its queue.
type PulseWindow = Window & { pulse?: { track?: (name: string, label?: string) => void; q?: (string | [string, string])[] } };

export function trackPulse(name: string, label?: string) {
  const w = window as PulseWindow;
  if (w.pulse?.track) w.pulse.track(name, label);
  else (w.pulse ??= { q: [] }).q?.push(label ? [name, label] : name);
}
