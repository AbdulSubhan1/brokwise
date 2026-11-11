// A pay link's token is 32 random bytes in base64url without padding (43 characters). Anything else can't be a
// real link, so it is refused before PolicyDesk is asked.
const PAY_TOKEN = /^[A-Za-z0-9_-]{43}$/;

export function isPayToken(token: string): boolean {
  return PAY_TOKEN.test(token);
}
