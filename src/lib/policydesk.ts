import "server-only";
import { z } from "zod";
import { getEnv } from "./env";
import { SIGNATURE_HEADER, signRequest, TIMESTAMP_HEADER } from "./signature";

// Signed server-to-server client for PolicyDesk's website API (/api/website/v1). The browser never sees the secret.

const TIMEOUT_MS = 8_000;
const BASE_PATH = "/api/website/v1";

export type CarDetails = {
  make: string;
  model: string;
  year: number;
  gccSpec?: boolean;
  carValue?: number;
  dateOfBirth?: string;
  nationality?: string;
  city?: string;
  yearsLicensed?: number;
};

export type OpportunityRequest = {
  form: "short" | "full";
  product: "car";
  customerName: string;
  email: string;
  phone: string;
  details: CarDetails;
};

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

/** Mirrors PolicyDesk's WebsitePlan: one car plan card, prices in whole US dollars. */
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

const viewSchema = z.object({
  opportunity: z.object({
    publicId: z.string(),
    status: z.enum(["new", "contacted", "qualified", "disqualified", "converted"]),
    product: z.string(),
  }),
  lead: z.object({ reference: z.string() }).nullable(),
  contact: z
    .object({ role: z.literal("coordinator"), name: z.string(), email: z.string(), phone: z.string() })
    .nullable(),
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

async function call(method: "GET" | "POST" | "PUT", path: string, body?: unknown): Promise<Response> {
  const env = getEnv();
  const url = new URL(`${BASE_PATH}${path}`, env.POLICYDESK_API_URL);
  const raw = body === undefined ? "" : JSON.stringify(body);
  const ts = Math.floor(Date.now() / 1000);
  const headers: Record<string, string> = {
    [TIMESTAMP_HEADER]: String(ts),
    [SIGNATURE_HEADER]: signRequest(env.WEBSITE_API_SECRET, ts, method, url.pathname + url.search, raw),
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

/** The car plans for a journey, cheapest first. 409 `no_lead` when the journey has no lead (short form). */
export async function getPlans(publicId: string): Promise<PlansResult> {
  let res: Response;
  let json: unknown;
  try {
    res = await call("GET", `/opportunities/${encodeURIComponent(publicId)}/plans`);
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
