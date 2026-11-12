import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { turnstileEnabled, turnstileSiteKey, verifyTurnstile } = await import("./turnstile");

// Cloudflare's published test keys.
const SITE_KEY = "1x00000000000000000000AA";
const PASSING_SECRET = "1x0000000000000000000000000000000AA";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", SITE_KEY);
  vi.stubEnv("TURNSTILE_SECRET_KEY", PASSING_SECRET);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("turnstileEnabled", () => {
  it("is on only when both keys are set", () => {
    expect(turnstileEnabled()).toBe(true);
    expect(turnstileSiteKey()).toBe(SITE_KEY);

    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(turnstileEnabled()).toBe(false);
    expect(turnstileSiteKey()).toBeNull();

    vi.stubEnv("TURNSTILE_SECRET_KEY", PASSING_SECRET);
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    expect(turnstileEnabled()).toBe(false);
    expect(turnstileSiteKey()).toBeNull();
  });
});

describe("verifyTurnstile", () => {
  it("passes with the always-pass secret response {success:true}", async () => {
    fetchMock.mockResolvedValue(Response.json({ success: true }));
    await expect(verifyTurnstile("token-abc", "203.0.113.7")).resolves.toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(init?.method).toBe("POST");
    const body = new URLSearchParams(String(init?.body));
    expect(body.get("secret")).toBe(PASSING_SECRET);
    expect(body.get("response")).toBe("token-abc");
    expect(body.get("remoteip")).toBe("203.0.113.7");
  });

  it("fails on {success:false}", async () => {
    fetchMock.mockResolvedValue(Response.json({ success: false, "error-codes": ["invalid-input-response"] }));
    await expect(verifyTurnstile("token-abc", "203.0.113.7")).resolves.toBe(false);
  });

  it("fails on network error", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(verifyTurnstile("token-abc", "203.0.113.7")).resolves.toBe(false);
  });

  it("fails without a token and does not call Cloudflare", async () => {
    await expect(verifyTurnstile(null, "203.0.113.7")).resolves.toBe(false);
    await expect(verifyTurnstile("", "203.0.113.7")).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("leaves remoteip out when the visitor IP is unknown", async () => {
    fetchMock.mockResolvedValue(Response.json({ success: true }));
    await verifyTurnstile("token-abc", "unknown");
    const body = new URLSearchParams(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.has("remoteip")).toBe(false);
  });
});
