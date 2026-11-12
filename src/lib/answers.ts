import "server-only";
import { createHash } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getEnv } from "./env";
import type { FormValues } from "./form-state";

// The full form's answers, kept in the visitor's own browser so the plans page can say what was quoted and "Edit
// details" opens the form filled in again. PolicyDesk's website API doesn't give the details back, and the website has
// no database. The cookie is encrypted (not just signed) because it holds the visitor's name, email and mobile.

export const ANSWERS_COOKIE = "bw_answers";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
// Longer than any answer the forms accept; anything past it is not an answer the form sent.
const MAX_VALUE_LENGTH = 200;

/** A 256-bit key of its own, derived from the journey secret so no new setting is needed. */
function key(): Uint8Array {
  return createHash("sha256").update(`${ANSWERS_COOKIE}:${getEnv().JOURNEY_COOKIE_SECRET}`).digest();
}

/** Keeps a full form's answers for this journey: only the given fields, as text. */
export async function saveAnswers(lob: string, publicId: string, values: FormValues, fields: readonly string[]) {
  const kept: FormValues = {};
  for (const field of fields) {
    const value = values[field];
    if (typeof value === "string" && value && value.length <= MAX_VALUE_LENGTH) kept[field] = value;
  }
  const token = await new EncryptJWT({ lob, values: kept })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setSubject(publicId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .encrypt(key());
  (await cookies()).set(ANSWERS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/**
 * The answers kept for this line's journey `publicId`, or null when there are none: no cookie, expired or tampered
 * with, or kept for another line or another journey (a pay link opens a journey the visitor didn't fill in here).
 */
export async function readAnswers(lob: string, publicId: string): Promise<FormValues | null> {
  const token = (await cookies()).get(ANSWERS_COOKIE)?.value;
  if (!token) return null;
  // Checking the token's expiry reads the clock; this keeps that check out of any prerender (or prefetch).
  await connection();
  try {
    const { payload } = await jwtDecrypt(token, key(), { keyManagementAlgorithms: ["dir"] });
    if (payload.sub !== publicId || payload.lob !== lob) return null;
    const values = payload.values;
    if (!values || typeof values !== "object") return null;
    return Object.fromEntries(Object.entries(values).filter((e): e is [string, string] => typeof e[1] === "string"));
  } catch {
    return null;
  }
}
