import "server-only";
import { headers as requestHeaders } from "next/headers";
import { z } from "zod";
import { CLIENT_IP_HEADER, clientIpFrom, UNKNOWN_IP } from "./client-ip";
import { getEnv } from "./env";
import { SIGNATURE_HEADER, signRequest, TIMESTAMP_HEADER } from "./signature";

// Signed server-to-server client for PolicyDesk's website API (/api/website/v1). The browser never sees the secret.

const TIMEOUT_MS = 8_000;
const BASE_PATH = "/api/website/v1";

/** The products the website sells, as PolicyDesk's WEBSITE_PRODUCTS (constants/website.ts). */
export const WEBSITE_PRODUCTS = ["car", "travel", "home", "health"] as const;
export type WebsiteProduct = (typeof WEBSITE_PRODUCTS)[number];

/**
 * A product's details as the forms build them (src/lib/schemas.ts); PolicyDesk checks them per product. A key the
 * form left out is undefined, and JSON leaves it out of the request.
 */
export type Details = Record<string, string | number | boolean | undefined>;

/** What a form gives PolicyDesk: the contact and the product's details. */
export type LeadRequest = { customerName: string; email: string; phone: string; details: Details };

export type OpportunityRequest = LeadRequest & { form: "short" | "full"; product: WebsiteProduct };

export const ADD_ON_KINDS = ["included", "optional", "preselected"] as const;
export type AddOnKind = (typeof ADD_ON_KINDS)[number];

const addOnKind = z.enum(ADD_ON_KINDS);

const planSchema = z.object({
  id: z.number().int(),
  insurer: z.string(),
  name: z.string(),
  cover: z.string(),
  coverLabel: z.string(),
  excess: z.number(),
  basePremium: z.number(),
  benefits: z.array(z.string()),
  addOns: z.array(
    z.object({ id: z.number().int(), key: z.string(), name: z.string(), kind: addOnKind, price: z.number() }),
  ),
});

/** Mirrors PolicyDesk's WebsitePlan: one plan card, prices in whole US dollars. */
export type WebsitePlan = z.infer<typeof planSchema>;

const selectionSchema = z.object({
  quoteReference: z.string(),
  planId: z.number().int(),
  insurer: z.string(),
  planName: z.string(),
  cover: z.string(),
  coverLabel: z.string(),
  lines: z.array(z.object({ label: z.string(), kind: z.union([z.literal("plan"), addOnKind]), amount: z.number() })),
  total: z.number(),
  addOnIds: z.array(z.number().int()),
});

/** Mirrors PolicyDesk's WebsiteSelection: the saved choice, priced by PolicyDesk. */
export type WebsiteSelection = z.infer<typeof selectionSchema>;

const personSchema = z.object({ name: z.string(), email: z.string(), phone: z.string() });

/** A person PolicyDesk assigned: the coordinator before payment, the advisor after it. */
export type Contact = z.infer<typeof personSchema> & { role: "coordinator" | "advisor" };

const viewSchema = z.object({
  opportunity: z.object({
    publicId: z.string(),
    status: z.enum(["new", "contacted", "qualified", "disqualified", "converted"]),
    product: z.string(),
  }),
  lead: z.object({ reference: z.string() }).nullable(),
  contact: personSchema.extend({ role: z.literal("coordinator") }).nullable(),
  // Older PolicyDesk builds leave it out; treat that as "nothing chosen yet".
  selection: selectionSchema.nullable().default(null),
});

/** Mirrors PolicyDesk's WebsiteOpportunityView. */
export type OpportunityView = z.infer<typeof viewSchema>;

export type ApiError = { code: string; field?: string; message?: string };

export type CreateResult = { ok: true; view: OpportunityView } | { ok: false; status: number; error: ApiError };

const errorSchema = z.object({
  error: z.object({ code: z.string(), field: z.string().optional(), message: z.string().optional() }),
});

const UNAVAILABLE: CreateResult = { ok: false, status: 502, error: { code: "unavailable" } };

/** PolicyDesk's answer when this visitor's IP passed a limit (429 with Retry-After); the request was not processed. */
export const RATE_LIMITED = "rate_limited";
const TOO_MANY = 429;

/** The visitor's IP from the incoming request, for PolicyDesk's per-IP limits. "unknown" outside a request. */
async function visitorIp(): Promise<string> {
  try {
    return clientIpFrom(await requestHeaders());
  } catch {
    return UNKNOWN_IP;
  }
}

async function call(method: "GET" | "POST" | "PUT", path: string, body?: unknown): Promise<Response> {
  const env = getEnv();
  const url = new URL(`${BASE_PATH}${path}`, env.POLICYDESK_API_URL);
  const raw = body === undefined ? "" : JSON.stringify(body);
  const ts = Math.floor(Date.now() / 1000);
  const headers: Record<string, string> = {
    [TIMESTAMP_HEADER]: String(ts),
    [SIGNATURE_HEADER]: signRequest(env.WEBSITE_API_SECRET, ts, method, url.pathname + url.search, raw),
    [CLIENT_IP_HEADER]: await visitorIp(),
    accept: "application/json",
  };
  if (body !== undefined) headers["content-type"] = "application/json";
  return fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : raw,
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

export async function createOpportunity(input: OpportunityRequest): Promise<CreateResult> {
  let res: Response;
  let json: unknown;
  try {
    res = await call("POST", "/opportunities", input);
    if (res.status === TOO_MANY) return { ok: false, status: TOO_MANY, error: { code: RATE_LIMITED } };
    json = await res.json();
  } catch {
    return UNAVAILABLE;
  }
  if (res.ok) {
    const view = viewSchema.safeParse(json);
    return view.success ? { ok: true, view: view.data } : UNAVAILABLE;
  }
  const err = errorSchema.safeParse(json);
  return { ok: false, status: res.status, error: err.success ? err.data.error : { code: "unknown" } };
}

/** The opportunity's current view, or null when PolicyDesk does not know the id. Throws when PolicyDesk can't be reached. */
export async function getOpportunity(publicId: string): Promise<OpportunityView | null> {
  const res = await call("GET", `/opportunities/${encodeURIComponent(publicId)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`PolicyDesk answered ${res.status} for an opportunity read`);
  return viewSchema.parse(await res.json());
}

export type PlansResult = { ok: true; plans: WebsitePlan[] } | { ok: false; status: number; code: string };

const plansSchema = z.object({ plans: z.array(planSchema) });

/** The plans of the journey's product, cheapest first. 409 `no_lead` when the journey has no lead (short form). */
export async function getPlans(publicId: string): Promise<PlansResult> {
  let res: Response;
  let json: unknown;
  try {
    res = await call("GET", `/opportunities/${encodeURIComponent(publicId)}/plans`);
    if (res.status === TOO_MANY) return { ok: false, status: TOO_MANY, code: RATE_LIMITED };
    json = await res.json();
  } catch {
    return { ok: false, status: 502, code: "unavailable" };
  }
  if (res.ok) {
    const parsed = plansSchema.safeParse(json);
    return parsed.success ? { ok: true, plans: parsed.data.plans } : { ok: false, status: 502, code: "unavailable" };
  }
  const err = errorSchema.safeParse(json);
  return { ok: false, status: res.status, code: err.success ? err.data.error.code : "unknown" };
}

export type SelectionRequest = { planId: number; addOnIds: number[] };

export type SelectionResult = { ok: true; selection: WebsiteSelection } | { ok: false; status: number; error: ApiError };

const selectionResponseSchema = z.object({ selection: selectionSchema });

/** Saves the visitor's plan and ticked add-ons. Only ids go out: PolicyDesk prices the choice itself. */
export async function saveSelection(publicId: string, input: SelectionRequest): Promise<SelectionResult> {
  let res: Response;
  let json: unknown;
  try {
    res = await call("PUT", `/opportunities/${encodeURIComponent(publicId)}/selection`, {
      planId: input.planId,
      addOnIds: input.addOnIds,
    });
    if (res.status === TOO_MANY) return { ok: false, status: TOO_MANY, error: { code: RATE_LIMITED } };
    json = await res.json();
  } catch {
    return { ok: false, status: 502, error: { code: "unavailable" } };
  }
  if (res.ok) {
    const parsed = selectionResponseSchema.safeParse(json);
    return parsed.success
      ? { ok: true, selection: parsed.data.selection }
      : { ok: false, status: 502, error: { code: "unavailable" } };
  }
  const err = errorSchema.safeParse(json);
  return { ok: false, status: res.status, error: err.success ? err.data.error : { code: "unknown" } };
}

/** What a step-3 call gives back: the parsed body, or the HTTP status and PolicyDesk's error code (502 `unavailable` when unreachable). */
export type Result<T> = { ok: true; data: T } | { ok: false; status: number; code: string };

async function request<T>(method: "GET" | "POST", path: string, schema: z.ZodType<T>, body?: unknown): Promise<Result<T>> {
  let res: Response;
  let json: unknown;
  try {
    res = await call(method, path, body);
    if (res.status === TOO_MANY) return { ok: false, status: TOO_MANY, code: RATE_LIMITED };
    json = await res.json();
  } catch {
    return { ok: false, status: 502, code: "unavailable" };
  }
  if (res.ok) {
    const parsed = schema.safeParse(json);
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, status: 502, code: "unavailable" };
  }
  const err = errorSchema.safeParse(json);
  return { ok: false, status: res.status, code: err.success ? err.data.error.code : "unknown" };
}

const lineSchema = z.object({ label: z.string(), amount: z.number() });

const paymentSummarySchema = z.object({
  status: z.enum(["ready", "already_paid"]),
  lines: z.array(lineSchema),
  total: z.number(),
  quoteReference: z.string(),
});

/** Mirrors PolicyDesk's payment summary: what the visitor is about to pay, in whole US dollars. */
export type PaymentSummary = z.infer<typeof paymentSummarySchema>;

/** The saved choice as payment lines and total. 409 `no_lead` (short form) or `no_selection` (no plan picked yet). */
export async function getPaymentSummary(publicId: string): Promise<Result<PaymentSummary>> {
  const result = await request(
    "GET",
    `/opportunities/${encodeURIComponent(publicId)}/payment`,
    z.object({ payment: paymentSummarySchema }),
  );
  return result.ok ? { ok: true, data: result.data.payment } : result;
}

/**
 * Asks PolicyDesk for a PaySandbox checkout for the saved choice and returns its URL. PolicyDesk reuses an open
 * session for the same total. 409 `already_paid` / `no_selection`, 503 `payments_disabled`, 502 `paysandbox_unavailable`.
 */
export async function startPayment(publicId: string): Promise<Result<{ checkoutUrl: string }>> {
  return request(
    "POST",
    `/opportunities/${encodeURIComponent(publicId)}/payment`,
    z.object({ checkoutUrl: z.url({ protocol: /^https?$/ }) }),
    {},
  );
}

const orderSchema = z.object({
  status: z.enum(["pending", "paid"]),
  lines: z.array(lineSchema),
  total: z.number(),
  paidAt: z.string().nullable(),
  paymentId: z.string().nullable(),
  quoteReference: z.string(),
  emailMasked: z.string(),
  phoneMasked: z.string(),
});

const orderViewSchema = z.object({
  order: orderSchema.nullable(),
  advisor: personSchema.extend({ role: z.literal("advisor") }).nullable(),
});

/** Mirrors PolicyDesk's order view: the journey's latest order (null before Pay) and the advisor assigned after payment. */
export type OrderView = z.infer<typeof orderViewSchema>;

/** The latest order. While it is pending, PolicyDesk re-checks the PaySandbox session first, in case the webhook is late. */
export async function getOrder(publicId: string): Promise<Result<OrderView>> {
  return request("GET", `/opportunities/${encodeURIComponent(publicId)}/order`, orderViewSchema);
}

export type PayLinkResult =
  | { ok: true; publicId: string; status: "active" | "paid" }
  | { ok: false; status: 404 | 410 | 429 | 502; code: string };

const payLinkSchema = z.object({
  opportunity: z.object({ publicId: z.guid() }),
  status: z.enum(["active", "paid"]),
});

/**
 * Opens a coordinator's pay link: which journey it belongs to and whether its order is paid. 404 `not_found` for an
 * unknown or revoked token (PolicyDesk doesn't say which), 410 `link_expired`, 429 `rate_limited`; anything else,
 * PolicyDesk being unreachable included, comes back as 502.
 */
export async function openPayLink(token: string): Promise<PayLinkResult> {
  const result = await request("POST", `/pay-links/${encodeURIComponent(token)}/open`, payLinkSchema, {});
  if (result.ok) return { ok: true, publicId: result.data.opportunity.publicId, status: result.data.status };
  if (result.status === 404 || result.status === 410 || result.status === TOO_MANY) {
    return { ok: false, status: result.status, code: result.code };
  }
  return { ok: false, status: 502, code: result.code };
}
