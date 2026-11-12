import { describe, expect, it } from "vitest";
import { clientIpFrom } from "./client-ip";

describe("clientIpFrom", () => {
  it("takes the first x-forwarded-for address", () => {
    const headers = new Headers({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1, 10.0.0.2", "x-real-ip": "198.51.100.1" });
    expect(clientIpFrom(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip then unknown", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": " 2001:db8::1 " }))).toBe("2001:db8::1");
    expect(clientIpFrom(new Headers({ "x-forwarded-for": " , ", "x-real-ip": "198.51.100.1" }))).toBe("198.51.100.1");
    expect(clientIpFrom(new Headers())).toBe("unknown");
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "", "x-real-ip": "  " }))).toBe("unknown");
  });
});
