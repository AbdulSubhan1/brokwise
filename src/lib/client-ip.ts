// The visitor's IP as Brokwise sees it, sent to PolicyDesk (which counts requests per IP) and to Cloudflare Turnstile.
// On Vercel, x-forwarded-for is set by the platform; its first address is the visitor.

/** The header PolicyDesk reads the visitor's IP from. Not signed: only holders of the API secret can call PolicyDesk. */
export const CLIENT_IP_HEADER = "x-brokwise-client-ip";

export const UNKNOWN_IP = "unknown";

/** The first x-forwarded-for address, else x-real-ip, else "unknown". PolicyDesk checks the IP's shape itself. */
export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const real = headers.get("x-real-ip")?.trim();
  return real || UNKNOWN_IP;
}
