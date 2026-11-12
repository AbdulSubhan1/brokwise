import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The journey server actions with PolicyDesk, the journey cookie and Next's request APIs mocked. Turnstile is the real
// module with Cloudflare's siteverify mocked through fetch.

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("@/lib/journey", () => ({
  readJourney: vi.fn(async () => "0b0e3a5e-8f8d-4c3c-9a43-2b8f7c1d2e3f"),
  setJourney: vi.fn(async () => {}),
}));
vi.mock("@/lib/policydesk", () => ({
  RATE_LIMITED: "rate_limited",
  createOpportunity: vi.fn(),
  saveSelection: vi.fn(),
  startPayment: vi.fn(),
}));

const { selectPlan, sendFullForm, sendQuickForm, startPaymentAction } = await import("./actions");
const policydesk = await import("@/lib/policydesk");
const { BOT_CHECK_FAILED, EMPTY_FORM, TOO_MANY_REQUESTS, TURNSTILE_FIELD } = await import("@/lib/form-state");

const createOpportunity = vi.mocked(policydesk.createOpportunity);
const saveSelection = vi.mocked(policydesk.saveSelection);
const startPayment = vi.mocked(policydesk.startPayment);
const fetchMock = vi.fn<typeof fetch>();

const QUICK = {
  customerName: "Ayesha Rahman",
  email: "ayesha@example.test",
  countryCode: "+92",
  mobile: "3001234567",
  make: "Toyota",
  model: "Corolla",
  year: "2021",
};

/** The form's fields plus the hidden `lob` field every journey form carries. */
function form(values: Record<string, string | string[]>, lob = "car"): FormData {
  const data = new FormData();
  data.append("lob", lob);
  for (const [k, v] of Object.entries(values)) for (const one of [v].flat()) data.append(k, one);
  return data;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("rate-limited calls", () => {
  it("a rate-limited lead shows the wait message and keeps the form values", async () => {
    createOpportunity.mockResolvedValue({ ok: false, status: 429, error: { code: "rate_limited" } });
    const state = await sendQuickForm(EMPTY_FORM, form(QUICK));
    expect(state.formError).toBe("Too many requests. Please wait a few minutes and try again.");
    expect(state.formError).toBe(TOO_MANY_REQUESTS);
    expect(state.values).toEqual(QUICK);
    expect(state.errors).toEqual({});
  });

  it("a rate-limited plan choice goes back to the plans with the wait message", async () => {
    saveSelection.mockResolvedValue({ ok: false, status: 429, error: { code: "rate_limited" } });
    await expect(selectPlan(form({ planId: "3", addOnIds: ["7"] }))).rejects.toThrow(
      "redirect:/car/plans?error=rate_limited",
    );
  });

  it("a rate-limited Pay shows the wait message", async () => {
    startPayment.mockResolvedValue({ ok: false, status: 429, code: "rate_limited" });
    await expect(startPaymentAction({}, form({ terms: "yes" }))).resolves.toEqual({ formError: TOO_MANY_REQUESTS });
  });
});

describe("Turnstile", () => {
  it("is skipped when the keys are not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    createOpportunity.mockResolvedValue({ ok: false, status: 502, error: { code: "unavailable" } });
    await sendQuickForm(EMPTY_FORM, form(QUICK));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(createOpportunity).toHaveBeenCalledOnce();
  });

  it("a failing check refuses the form before PolicyDesk is called", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "2x0000000000000000000000000000000AA");
    fetchMock.mockResolvedValue(Response.json({ success: false, "error-codes": ["invalid-input-response"] }));
    const state = await sendQuickForm(EMPTY_FORM, form({ ...QUICK, [TURNSTILE_FIELD]: "XXXX.DUMMY.TOKEN.XXXX" }));
    expect(state.formError).toBe("Please complete the check to show you're not a bot.");
    expect(state.formError).toBe(BOT_CHECK_FAILED);
    expect(state.values).toEqual(QUICK);
    expect(createOpportunity).not.toHaveBeenCalled();
    const body = new URLSearchParams(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.get("response")).toBe("XXXX.DUMMY.TOKEN.XXXX");
    expect(body.get("remoteip")).toBe("203.0.113.7");
  });

  it("a missing token refuses the form without asking Cloudflare", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    const state = await sendQuickForm(EMPTY_FORM, form(QUICK));
    expect(state.formError).toBe(BOT_CHECK_FAILED);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(createOpportunity).not.toHaveBeenCalled();
  });

  it("a passing check lets the lead through to PolicyDesk", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    fetchMock.mockResolvedValue(Response.json({ success: true }));
    createOpportunity.mockResolvedValue({
      ok: true,
      view: {
        opportunity: { publicId: "0b0e3a5e-8f8d-4c3c-9a43-2b8f7c1d2e3f", status: "new", product: "car" },
        lead: null,
        contact: null,
        selection: null,
      },
    });
    await expect(sendQuickForm(EMPTY_FORM, form({ ...QUICK, [TURNSTILE_FIELD]: "XXXX.DUMMY.TOKEN.XXXX" }))).rejects.toThrow(
      "redirect:/car/received",
    );
    expect(createOpportunity).toHaveBeenCalledOnce();
  });

  it("field mistakes are shown without spending the check", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    const state = await sendQuickForm(EMPTY_FORM, form({ ...QUICK, email: "nope", [TURNSTILE_FIELD]: "t" }));
    expect(state.errors.email).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("lines of business", () => {
  const view = (product: string) => ({
    ok: true as const,
    view: {
      opportunity: { publicId: "0b0e3a5e-8f8d-4c3c-9a43-2b8f7c1d2e3f", status: "new" as const, product },
      lead: null,
      contact: null,
      selection: null,
    },
  });
  const CONTACT = { customerName: "Ayesha Rahman", email: "ayesha@example.test", countryCode: "+92", mobile: "3001234567" };

  it("a travel call-back goes to PolicyDesk as a travel opportunity and on to /travel/received", async () => {
    createOpportunity.mockResolvedValue(view("travel"));
    await expect(sendQuickForm(EMPTY_FORM, form({ ...CONTACT, destination: "asia" }, "travel"))).rejects.toThrow(
      "redirect:/travel/received",
    );
    expect(createOpportunity).toHaveBeenCalledWith({
      form: "short",
      product: "travel",
      customerName: "Ayesha Rahman",
      email: "ayesha@example.test",
      phone: "+923001234567",
      details: { destination: "asia" },
    });
  });

  it("builds a date from its Day, Month and Year selects when the hidden value is empty (no JavaScript)", async () => {
    createOpportunity.mockResolvedValue(view("health"));
    const year = new Date().getFullYear() - 30;
    await expect(
      sendFullForm(
        EMPTY_FORM,
        form(
          {
            ...CONTACT,
            coverFor: "me",
            "dateOfBirth-day": "5",
            "dateOfBirth-month": "3",
            "dateOfBirth-year": String(year),
            city: "Karachi",
            preExisting: "no",
          },
          "health",
        ),
      ),
    ).rejects.toThrow("redirect:/health/plans");
    expect(createOpportunity.mock.calls[0][0].details).toMatchObject({ dateOfBirth: `${year}-03-05` });
  });

  it("a PolicyDesk field error lands on the travel field with its message", async () => {
    createOpportunity.mockResolvedValue({
      ok: false,
      status: 400,
      error: { code: "invalid_request", field: "details.endDate", message: "validation.tripTooLong" },
    });
    const nextYear = new Date().getFullYear() + 1;
    const state = await sendFullForm(
      EMPTY_FORM,
      form(
        {
          ...CONTACT,
          destination: "gcc",
          tripType: "single",
          startDate: `${nextYear}-02-01`,
          endDate: `${nextYear}-02-10`,
          travellers: "2",
          oldestAge: "40",
        },
        "travel",
      ),
    );
    expect(state.errors).toEqual({ endDate: "A single trip can be up to 180 days." });
  });

  it("a form without a line we sell is refused before PolicyDesk is called", async () => {
    const state = await sendQuickForm(EMPTY_FORM, form(QUICK, "boat"));
    expect(state.formError).toBe("We couldn't send your request. Please try again.");
    expect(createOpportunity).not.toHaveBeenCalled();
  });

  it("plan and payment redirects stay in the visitor's line", async () => {
    saveSelection.mockResolvedValue({ ok: false, status: 409, error: { code: "no_lead" } });
    await expect(selectPlan(form({ planId: "3", addOnIds: [] }, "home"))).rejects.toThrow("redirect:/home/received");
    startPayment.mockResolvedValue({ ok: false, status: 409, code: "already_paid" });
    await expect(startPaymentAction({}, form({ terms: "yes" }, "health"))).rejects.toThrow(
      "redirect:/health/thank-you",
    );
  });
});
