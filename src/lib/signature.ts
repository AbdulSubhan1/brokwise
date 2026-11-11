import { createHmac, timingSafeEqual } from "node:crypto";

// Request signing shared with PolicyDesk's server/website/signature.ts. Both sides must agree byte for byte:
// signature = lowercase hex HMAC-SHA256(secret, `${timestamp}.${METHOD}.${pathAndQuery}.${rawBody}`).

/** How far a request's timestamp may be from the receiver's clock, either way. */
export const MAX_SKEW_SECONDS = 300;

export const TIMESTAMP_HEADER = "x-brokwise-timestamp";
export const SIGNATURE_HEADER = "x-brokwise-signature";

export function signRequest(secret: string, ts: number, method: string, pathAndQuery: string, body: string): string {
  return createHmac("sha256", secret).update(`${ts}.${method.toUpperCase()}.${pathAndQuery}.${body}`).digest("hex");
}

export function verifyRequest(
  req: { method: string; pathAndQuery: string; body: string; timestamp: string | null; signature: string | null },
  secret: string,
  nowSec: number,
): boolean {
  if (!req.timestamp || !req.signature || !/^\d+$/.test(req.timestamp)) return false;
  const ts = Number(req.timestamp);
  if (Math.abs(nowSec - ts) > MAX_SKEW_SECONDS) return false;

  const expected = Buffer.from(signRequest(secret, ts, req.method, req.pathAndQuery, req.body), "utf8");
  const given = Buffer.from(req.signature, "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
