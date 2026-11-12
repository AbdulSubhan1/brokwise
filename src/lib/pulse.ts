import "server-only";

// Pulse is my small monitor (github.com/AbdulSubhan1/monitor). The server sends it errors and key logs with this
// site's own token. Off until MONITOR_LOG_TOKEN is set, and it can never break a request: a 2-second timeout and every
// failure ignored.

export const PULSE_URL = "https://abdulsubhan-pulse.vercel.app";
const TIMEOUT_MS = 2_000;

export type PulseLog = {
  level: "info" | "warn" | "error";
  message: string;
  path?: string;
  context?: Record<string, unknown>;
};

export async function sendToPulse(logs: PulseLog | PulseLog[]): Promise<void> {
  const token = process.env.MONITOR_LOG_TOKEN?.trim();
  if (!token) return;
  try {
    await fetch(`${PULSE_URL}/api/logs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(logs),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // Monitoring is best effort; the visitor's request matters more
  }
}
