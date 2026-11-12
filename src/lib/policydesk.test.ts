import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
}));

const { createOpportunity, openPayLink, saveSelection, startPayment } = await import("./policydesk");

const ID = "0b0e3a5e-8f8d-4c3c-9a43-2b8f7c1d2e3f";
const TOKEN = "q3Zt-Vb_8xY2nLm4Kp0RwE7sHdJfGcA1uTiOeN5yB9Q";
const LEAD = {
  form: "short" as const,
  product: "car" as const,
  customerName: "Ayesha Rahman",
  email: "ayesha@example.test",
  phone: "+923001234567",
  details: { make: "Toyota", model: "Corolla", year: 2021 },
};

const fetchMock = vi.fn<typeof fetch>();

function tooMany(json = true) {
  return json
    ? Response.json({ error: { code: "rate_limited" } }, { status: 429, headers: { "retry-after": "1200" } })
    : new Response("Too Many Requests", { status: 429 });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("POLICYDESK_API_URL", "http://localhost:3070");
  vi.stubEnv("WEBSITE_API_SECRET", "test-secret");
  vi.stubEnv("JOURNEY_COOKIE_SECRET", "x".repeat(32));
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("visitor IP", () => {
  it("sends the visitor's IP as x-brokwise-client-ip", async () => {
    fetchMock.mockResolvedValue(tooMany());
    await createOpportunity(LEAD);
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get("x-brokwise-client-ip")).toBe("203.0.113.7");
  });
});

describe("429 from PolicyDesk", () => {
  it("maps a rate-limited lead to rate_limited", async () => {
    fetchMock.mockResolvedValue(tooMany());
    await expect(createOpportunity(LEAD)).resolves.toEqual({ ok: false, status: 429, error: { code: "rate_limited" } });
  });

  it("maps a 429 without a JSON body too", async () => {
    fetchMock.mockResolvedValue(tooMany(false));
    await expect(createOpportunity(LEAD)).resolves.toEqual({ ok: false, status: 429, error: { code: "rate_limited" } });
  });

  it("maps a rate-limited selection, payment and pay-link open", async () => {
    fetchMock.mockImplementation(async () => tooMany());
    await expect(saveSelection(ID, { planId: 1, addOnIds: [] })).resolves.toEqual({
      ok: false,
      status: 429,
      error: { code: "rate_limited" },
    });
    await expect(startPayment(ID)).resolves.toEqual({ ok: false, status: 429, code: "rate_limited" });
    await expect(openPayLink(TOKEN)).resolves.toEqual({ ok: false, status: 429, code: "rate_limited" });
  });
});
