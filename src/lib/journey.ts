import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { getEnv } from "./env";

// The website keeps no database: the visitor's journey is the opportunity's public id in a signed, http-only cookie,
// so only the browser that started a journey can open its pages.

export const JOURNEY_COOKIE = "bw_journey";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function key() {
  return new TextEncoder().encode(getEnv().JOURNEY_COOKIE_SECRET);
}

export async function setJourney(publicId: string): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(publicId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key());
  (await cookies()).set(JOURNEY_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** The journey's opportunity public id, or null when the cookie is missing, expired, forged or malformed. */
export async function readJourney(): Promise<string | null> {
  const token = (await cookies()).get(JOURNEY_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" && UUID.test(payload.sub) ? payload.sub : null;
  } catch {
    return null;
  }
}
