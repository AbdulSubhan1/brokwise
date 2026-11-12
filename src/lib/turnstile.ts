import "server-only";
import { UNKNOWN_IP } from "./client-ip";
import { getTurnstileKeys } from "./env";

// Cloudflare Turnstile, the "not a bot" check on the car forms. Off until both keys are set.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5_000;

export function turnstileEnabled(): boolean {
  return getTurnstileKeys() !== null;
}

/** The site key for the widget, or null when Turnstile is off (either key missing). */
export function turnstileSiteKey(): string | null {
  return getTurnstileKeys()?.siteKey ?? null;
}

/** Asks Cloudflare whether the widget's token is good. No token, a refusal or Cloudflare unreachable: false. */
export async function verifyTurnstile(token: string | null, ip: string): Promise<boolean> {
  const keys = getTurnstileKeys();
  if (!keys || !token) return false;
  const body = new URLSearchParams({ secret: keys.secretKey, response: token });
  if (ip !== UNKNOWN_IP) body.set("remoteip", ip);
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return false;
    const json: unknown = await res.json();
    return typeof json === "object" && json !== null && (json as { success?: unknown }).success === true;
  } catch {
    return false;
  }
}
