import { describe, expect, it } from "vitest";
import { isPayToken } from "./pay-link";

// PolicyDesk's pay tokens: 32 random bytes as base64url, no padding = 43 characters.
const TOKEN = "q3Zt-Vb_8xY2nLm4Kp0RwE7sHdJfGcA1uTiOeN5yB9Q";

describe("isPayToken", () => {
  it("accepts a 43-character base64url token", () => {
    expect(TOKEN).toHaveLength(43);
    expect(isPayToken(TOKEN)).toBe(true);
    expect(isPayToken(Buffer.alloc(32, 255).toString("base64url"))).toBe(true);
  });

  it("refuses the wrong length", () => {
    expect(isPayToken(TOKEN.slice(1))).toBe(false);
    expect(isPayToken(`${TOKEN}A`)).toBe(false);
    expect(isPayToken("")).toBe(false);
  });

  it("refuses characters outside base64url", () => {
    expect(isPayToken(`${TOKEN.slice(1)}=`)).toBe(false);
    expect(isPayToken(`${TOKEN.slice(1)}+`)).toBe(false);
    expect(isPayToken(`${TOKEN.slice(1)}/`)).toBe(false);
    expect(isPayToken(`${TOKEN.slice(1)}.`)).toBe(false);
    expect(isPayToken(`${TOKEN.slice(1)} `)).toBe(false);
  });

  it("refuses a token with a line break around it", () => {
    expect(isPayToken(`${TOKEN}\n`)).toBe(false);
    expect(isPayToken(`\n${TOKEN.slice(1)}`)).toBe(false);
  });
});
