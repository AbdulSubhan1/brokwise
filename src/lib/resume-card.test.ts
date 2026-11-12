import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { resumeCardFor, EXAMPLE_CARD } = await import("./resume-card");
type Input = Parameters<typeof resumeCardFor>[0];
type View = NonNullable<Input["view"]>;
type Plan = Extract<NonNullable<Input["plans"]>, { ok: true }>["plans"][number];
type Order = NonNullable<Extract<NonNullable<Input["order"]>, { ok: true }>["data"]["order"]>;

function view(over: Partial<View> & { product?: string; status?: View["opportunity"]["status"] } = {}): View {
  const { product = "car", status = "new", ...rest } = over;
  return {
    opportunity: { publicId: "0b0e3a5e-8f8d-4c3c-9a43-2b8f7c1d2e3f", status, product },
    lead: { reference: "CAR-7K2M9QX" },
    contact: { role: "coordinator", name: "Sana Malik", email: "sana@policydesk.test", phone: "+92 300 1111111" },
    selection: null,
    ...rest,
  };
}

function plan(id: number, cover: string, basePremium: number): Plan {
  return {
    id,
    insurer: `Insurer ${id}`,
    name: `Plan ${id}`,
    cover,
    coverLabel: cover,
    excess: 100 + id,
    basePremium,
    benefits: [],
    addOns: [],
  };
}

const SELECTION: NonNullable<View["selection"]> = {
  quoteReference: "Q-2026-0042",
  planId: 7,
  insurer: "Northwind Assurance",
  planName: "Northwind Plus",
  cover: "comprehensive",
  coverLabel: "Comprehensive",
  lines: [{ label: "Northwind Plus", kind: "plan", amount: 1110 }],
  total: 1145,
  addOnIds: [],
};

function order(status: Order["status"]): Order {
  return {
    status,
    lines: [
      { label: "Northwind Plus", amount: 1110 },
      { label: "Driver accident", amount: 35 },
    ],
    total: 1145,
    paidAt: status === "paid" ? "2026-11-12T08:00:00Z" : null,
    paymentId: status === "paid" ? "pay_123" : null,
    quoteReference: "Q-2026-0042",
    emailMasked: "b***@example.test",
    phoneMasked: "+92 *** ***4567",
  };
}

const noOrder = { ok: true as const, data: { order: null, advisor: null } };
const withOrder = (status: Order["status"]) => ({ ok: true as const, data: { order: order(status), advisor: null } });
const unavailable = { ok: false as const, status: 502, code: "unavailable" };
const plansOk = (plans: Plan[]) => ({ ok: true as const, plans });

describe("resumeCardFor", () => {
  it("shows the example when there is no journey (no, expired or forged cookie, unknown id, PolicyDesk down)", () => {
    expect(resumeCardFor({ view: null, plans: null, order: null })).toEqual(EXAMPLE_CARD);
  });

  it("shows the example for a product the website doesn't sell", () => {
    expect(resumeCardFor({ view: view({ product: "yacht" }), plans: null, order: noOrder })).toEqual(EXAMPLE_CARD);
  });

  it("shows the example for a request the coordinator disqualified", () => {
    const v = view({ lead: null, status: "disqualified" });
    expect(resumeCardFor({ view: v, plans: null, order: null })).toEqual(EXAMPLE_CARD);
  });

  it("says we'll call for a quick-form journey (no lead), with the coordinator's name", () => {
    const card = resumeCardFor({ view: view({ lead: null }), plans: null, order: null });
    expect(card).toMatchObject({ kind: "call_back", coordinator: "Sana Malik" });
    expect(card.kind === "call_back" && card.lob.slug).toBe("car");
  });

  it("says the help desk calls when no coordinator was free", () => {
    const card = resumeCardFor({ view: view({ lead: null, contact: null, product: "home" }), plans: null, order: null });
    expect(card).toMatchObject({ kind: "call_back", coordinator: null });
    expect(card.kind === "call_back" && card.lob.slug).toBe("home");
  });

  it("lists the 3 cheapest plans of a full-form journey with no plan chosen", () => {
    const plans = [
      plan(1, "comprehensive", 1215),
      plan(2, "third_party", 910),
      plan(3, "comprehensive", 1110),
      plan(4, "comprehensive_agency", 1500),
      plan(5, "third_party", 990),
    ];
    const card = resumeCardFor({ view: view(), plans: plansOk(plans), order: noOrder });
    expect(card).toMatchObject({ kind: "plans", reference: "CAR-7K2M9QX", count: 5, from: 910 });
    if (card.kind !== "plans") throw new Error("expected the plans card");
    expect(card.plans.map((p) => [p.id, p.price, p.tag])).toEqual([
      [2, 910, "cheapest"],
      [5, 990, undefined],
      [3, 1110, "best_value"],
    ]);
    expect(card.plans[0]).toMatchObject({ insurer: "Insurer 2", name: "Plan 2", excess: 102, per: "a year" });
  });

  it("names what was quoted when this browser kept the answers", () => {
    const answers = { make: "Toyota", model: "Corolla", year: "2021", gccSpec: "yes", carValue: "18000", city: "Lahore" };
    const plans = plansOk([plan(2, "third_party", 910)]);
    const subject = "Toyota Corolla 2021 · GCC spec · worth $18,000";
    expect(resumeCardFor({ view: view(), plans, order: noOrder, answers, today: "2026-11-12" })).toMatchObject({
      kind: "plans",
      subject,
    });
    const chosen = resumeCardFor({ view: view({ selection: SELECTION }), plans: null, order: noOrder, answers });
    expect(chosen).toMatchObject({ kind: "chosen", subject });
    expect(resumeCardFor({ view: view(), plans, order: noOrder, answers: null })).not.toHaveProperty("subject");
  });

  it("says a travel single-trip price is for the trip", () => {
    const card = resumeCardFor({
      view: view({ product: "travel" }),
      plans: plansOk([plan(1, "single_trip", 60)]),
      order: noOrder,
    });
    expect(card.kind === "plans" && card.plans[0].per).toBe("for this trip");
  });

  it("falls back to the example when the plans can't be read or there are none", () => {
    expect(resumeCardFor({ view: view(), plans: unavailable, order: noOrder })).toEqual(EXAMPLE_CARD);
    expect(resumeCardFor({ view: view(), plans: plansOk([]), order: noOrder })).toEqual(EXAMPLE_CARD);
  });

  it("asks to review and pay once a plan is chosen (no order, or a payment not confirmed yet)", () => {
    for (const o of [noOrder, withOrder("pending")]) {
      const card = resumeCardFor({ view: view({ selection: SELECTION }), plans: null, order: o });
      expect(card).toMatchObject({
        kind: "chosen",
        reference: "Q-2026-0042",
        insurer: "Northwind Assurance",
        planName: "Northwind Plus",
        coverLabel: "Comprehensive",
        total: 1145,
        totalLabel: "Total a year",
      });
    }
  });

  it("shows the payment once the order is paid, even when the quote is no longer open", () => {
    for (const selection of [SELECTION, null]) {
      const card = resumeCardFor({ view: view({ selection }), plans: null, order: withOrder("paid") });
      expect(card).toMatchObject({ kind: "paid", reference: "Q-2026-0042", plan: "Northwind Plus", total: 1145 });
    }
  });

  it("falls back to the example when the order can't be read", () => {
    expect(resumeCardFor({ view: view({ selection: SELECTION }), plans: null, order: unavailable })).toEqual(
      EXAMPLE_CARD,
    );
  });
});
