import "server-only";
import { z } from "zod";

const envSchema = z.object({
  POLICYDESK_API_URL: z.url("must be a URL like http://localhost:3070"),
  WEBSITE_API_SECRET: z.string().min(1, "is required (same value as in PolicyDesk)"),
  JOURNEY_COOKIE_SECRET: z.string().min(32, "must be at least 32 characters"),
});

export type Env = z.infer<typeof envSchema>;

/** Reads the server env on first use (not at import, so `next build` works without it) and fails loudly if any is wrong. */
export function getEnv(): Env {
  const parsed = envSchema.safeParse({
    POLICYDESK_API_URL: process.env.POLICYDESK_API_URL,
    WEBSITE_API_SECRET: process.env.WEBSITE_API_SECRET,
    JOURNEY_COOKIE_SECRET: process.env.JOURNEY_COOKIE_SECRET,
  });
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ");
    throw new Error(`Brokwise env is not set up: ${problems}. See .env.example.`);
  }
  return parsed.data;
}

export type TurnstileKeys = { siteKey: string; secretKey: string };

/** Cloudflare Turnstile's keys, or null unless both are set (then the forms show no check and skip it). Optional. */
export function getTurnstileKeys(): TurnstileKeys | null {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();
  return siteKey && secretKey ? { siteKey, secretKey } : null;
}
