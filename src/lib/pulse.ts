import "server-only";
import { after } from "next/server";

// Pulse is my small monitor (github.com/AbdulSubhan1/monitor). The server sends it errors, key logs and every API call
// it makes, with this site's own token. Off until MONITOR_LOG_TOKEN is set, and it can never break a request: a
// 2-second timeout, every failure ignored, and API calls reported after the response.

export const PULSE_URL = "https://abdulsubhan-pulse.vercel.app";
const TIMEOUT_MS = 2_000;

export type PulseLog = {
  level: "info" | "warn" | "error";
  message: string;
  path?: string;
  context?: Record<string, unknown>;
};

export type PulseApiCall = {
  method: string;
  host: string;
  path: string;
  // null when no response came back (timeout, network)
  status: number | null;
  ms: number;
  error?: string;
};

async function post(endpoint: "logs" | "calls", body: unknown): Promise<void> {
  const token = process.env.MONITOR_LOG_TOKEN?.trim();
  if (!token) return;
  try {
    await fetch(`${PULSE_URL}/api/${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // Monitoring is best effort; the visitor's request matters more
  }
}

export function sendToPulse(logs: PulseLog | PulseLog[]): Promise<void> {
  return post("logs", logs);
}

/** Reports one API call (Pulse groups by route and turns ids into ":id"). Sent after the response when inside a request. */
export function reportApiCall(call: PulseApiCall): void {
  if (!process.env.MONITOR_LOG_TOKEN?.trim()) return;
  try {
    after(() => post("calls", call));
  } catch {
    // Outside a request (a script or test): send it now, still without waiting
    void post("calls", call);
  }
}
