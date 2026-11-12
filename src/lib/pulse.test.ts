import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// `after` runs its task at once here
vi.mock("next/server", () => ({ after: (task: () => unknown) => task() }));

const { PULSE_URL, reportApiCall, sendToPulse } = await import("./pulse");

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("sendToPulse", () => {
  it("does nothing until the token is set", async () => {
    vi.stubEnv("MONITOR_LOG_TOKEN", "");
    await sendToPulse({ level: "info", message: "Lead submitted" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the logs with this site's token", async () => {
    vi.stubEnv("MONITOR_LOG_TOKEN", "brokwise.sig");
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await sendToPulse({ level: "error", message: "boom", path: "/car" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${PULSE_URL}/api/logs`);
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer brokwise.sig");
    expect(JSON.parse(String(init?.body))).toEqual({ level: "error", message: "boom", path: "/car" });
  });

  it("never throws when Pulse is down", async () => {
    vi.stubEnv("MONITOR_LOG_TOKEN", "brokwise.sig");
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(sendToPulse({ level: "info", message: "x" })).resolves.toBeUndefined();
  });
});

describe("reportApiCall", () => {
  const CALL = { method: "GET", host: "policydesk.test", path: "/api/website/v1/opportunities/x", status: 200, ms: 120 };

  it("does nothing until the token is set", () => {
    vi.stubEnv("MONITOR_LOG_TOKEN", "");
    reportApiCall(CALL);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the call to Pulse's API log", () => {
    vi.stubEnv("MONITOR_LOG_TOKEN", "brokwise.sig");
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    reportApiCall(CALL);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${PULSE_URL}/api/calls`);
    expect(JSON.parse(String(init?.body))).toEqual(CALL);
  });
});
