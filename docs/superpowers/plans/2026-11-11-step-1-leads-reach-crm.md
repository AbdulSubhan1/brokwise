# Step 1: Leads reach the CRM — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Both Brokwise car forms create an opportunity (and, for the full form, a lead) in PolicyDesk through a signed API, with a coordinator assigned automatically and shown on the website.

**Architecture:** PolicyDesk gets `/api/website/v1/opportunities` (HMAC-signed, no session) backed by `server/website/` (logic that never imports UI). Brokwise is a new Next.js app with no database: server actions validate the form, call PolicyDesk with a signed request, and keep the opportunity's public id in a signed http-only cookie.

**Tech Stack:** PolicyDesk: Next.js 15, Drizzle, PGlite/Neon, Zod 4, next-intl, Playwright, + Vitest (new). Brokwise: Next.js 16 App Router, TypeScript strict, Tailwind CSS 4, Zod 4, jose, Vitest, Playwright, npm.

**Spec:** `docs/superpowers/specs/2026-11-11-brokwise-design.md` (Brokwise repo; same text as the shared-notes design doc).

## Global Constraints

- Approved by Abdul 2026-11-11 ("ap bnao … push bhi kardo repo bna kar", "kuch puchna ki zarurat ni ha"). Repo `AbdulSubhan1/brokwise` (public), local `~/brokwise`.
- PolicyDesk work happens in a **git worktree** `~/policydesk-website` on branch `feat/website-api` off `main`. Never switch, stash or reset the `~/policydesk` checkout (it is on `docs/crm-kit-design` for other work). Push the branch and open a PR; **do not merge** (main drives the live demo).
- No Vercel deploys in this plan; live wiring waits for Abdul.
- Never `--no-verify`. Follow PolicyDesk `AGENTS.md` (UI only from `components/ui`, messages in `en.json` **and** `ar.json`, server code layout) except the API-route exception added in Task A1.
- Made-up people and data only; no InsuranceMarket.ae names, copy or styling; no office design system.
- Tests: write them per task, but **run each repo's touched specs once at the end** (Task C1), plus `npm run check` in PolicyDesk.
- Product key is `car`; department `motor_marine`. Currency untouched (USD).
- Signature scheme (both repos, identical):
  - Headers `x-brokwise-timestamp` (unix seconds) and `x-brokwise-signature` (lowercase hex).
  - Signature = HMAC-SHA256(`WEBSITE_API_SECRET`, `` `${timestamp}.${METHOD}.${pathAndQuery}.${rawBody}` ``), empty string for no body.
  - Valid if |now − timestamp| ≤ 300 s and constant-time equal. PolicyDesk returns `503 {error:{code:"api_disabled"}}` when `WEBSITE_API_SECRET` is unset.
- Error body everywhere: `{ "error": { "code": string, "message"?: string, "field"?: string } }`. Codes: `unauthorized` (401), `invalid_request` (400), `not_found` (404), `api_disabled` (503).

## Review Focus

1. **Replay / clock skew:** a captured request re-sent after 5 min, or a request 6 min in the future → 401. (Test in A2.)
2. **Body tampering:** same headers, one character of the body changed → 401. (Test in A2.)
3. **Nobody available:** every motor coordinator unavailable or inactive → 201 with `contact: null`, opportunity unassigned, website shows the helpline card. (Tests in A3 and B3.)
4. **Unknown / extra fields or wrong product** (`product:"bike"` before bike exists on the site is allowed by PolicyDesk but the website only sends `car`; extra keys like `coordinatorId` or `status`) → 400 `invalid_request`, never written. (Test in A4.)
5. **Journey cookie missing or forged** on `/car/received` → redirect to `/car`, no PolicyDesk call with a guessed id. (Test in B3.)

---

## Part A — PolicyDesk (`~/policydesk-website`, branch `feat/website-api`)

### Task A1: Rule exception, schema and seed

**Files:**
- Modify: `AGENTS.md` (Mutations bullet), `middleware.ts`, `server/db/schema.ts`, `server/audit.ts`, `scripts/setup-db.ts`
- Create: migration via `npm run db:generate` (plus hand-added `UPDATE` lines, see below), `schemas/website.ts`

**Interfaces:**
- Produces: columns `opportunities.public_id uuid not null unique default gen_random_uuid()`, `opportunities.details jsonb not null default '{}'`, `users.phone text not null default ''`, `users.available boolean not null default true`, `users.last_assigned_at timestamp null`; `logAudit({ userId: number | null, … })`; `carDetailsSchema`, `websiteOpportunitySchema`, type `WebsiteOpportunityInput` in `schemas/website.ts`.

- [ ] **Step 1:** `AGENTS.md` Mutations bullet: keep "API routes are not allowed" and list the exceptions: streaming a stored file, `app/api/website/v1/**` (signed by the website, see `server/website/`), and `app/api/paysandbox/**` (signed by PaySandbox, a later step). Route handlers there only verify the signature, parse with Zod, call `server/website/*` and map results to JSON; they never touch `db` directly.
- [ ] **Step 2:** `middleware.ts` matcher also excludes `api/website` and `api/paysandbox`.
- [ ] **Step 3:** Schema columns above; `logAudit` accepts `userId: number | null` (null = the website/system). The audit page and lead timeline show `t("audit.website")` ("Website" / "الموقع") when the user is null.
- [ ] **Step 4:** `schemas/website.ts`, built from `schemas/fields.ts`:
  - `carDetailsSchema = z.strictObject({ make: requiredText(1,40), model: requiredText(1,40), year: z.coerce.number().int().min(1990).max(currentYear+1), gccSpec: z.boolean().optional(), carValue: amount.max(1_000_000).optional(), dateOfBirth: date.optional(), nationality: requiredText(2,60).optional(), city: requiredText(2,60).optional(), yearsLicensed: z.coerce.number().int().min(0).max(60).optional() })`
  - `websiteOpportunitySchema = z.strictObject({ form: z.enum(["short","full"]), product: z.literal("car"), customerName: fullName, email, phone, details: carDetailsSchema })` with a `superRefine`: when `form === "full"`, `gccSpec`, `carValue`, `dateOfBirth`, `nationality`, `city`, `yearsLicensed` are required (`validation.required`, path `details.<field>`); date of birth means age 18–80.
- [ ] **Step 5:** `npm run db:generate`, then append to the generated SQL: `UPDATE users SET phone = '+923001110001' WHERE email = 'coordinator@policydesk.dev';` and `+923001110002` for `advisor@`, `+923001110003` for `bilal@` (so the live demo shows phones). Seed (`setup-db.ts`): add `{ name: "Sana Coordinator", email: "sana@policydesk.dev", role: "Coordinator", department: "motor_marine" }`, and give every motor_marine seed user a made-up `+92300111000N` phone.

### Task A2: Signature check

**Files:** Create `server/website/signature.ts`, `server/website/signature.test.ts`, `vitest.config.ts`; Modify `package.json` (`"test": "vitest run"`, devDependency `vitest`; add `npm test` to `check`).

**Interfaces:** Produces `signRequest(secret: string, ts: number, method: string, pathAndQuery: string, body: string): string` and `verifyRequest(req: { method: string; pathAndQuery: string; body: string; timestamp: string | null; signature: string | null }, secret: string, nowSec: number): boolean`.

- [ ] **Step 1: Failing tests** in `signature.test.ts`: `accepts a fresh, correct signature`; `rejects a missing header`; `rejects a wrong signature`; `rejects a body changed after signing`; `rejects a timestamp 301 s old`; `rejects a timestamp 301 s in the future`; `accepts exactly 300 s old`; `rejects a non-numeric timestamp`.
- [ ] **Step 2:** `npx vitest run server/website/signature.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement with `node:crypto` `createHmac` + `timingSafeEqual` (compare equal-length buffers; length mismatch → false).
- [ ] **Step 4:** Same command → PASS. Commit.

### Task A3: Automatic coordinator assignment

**Files:** Create `server/website/assign.ts`, `server/website/assign.test.ts`; Modify `server/queries/users.ts`.

**Interfaces:**
- Produces `pickAssignee(candidates: { id: number; openCount: number; lastAssignedAt: Date | null }[]): number | null` (pure) and `assignCoordinator(departmentId: number): Promise<{ id: number; name: string; email: string; phone: string } | null>` which loads candidates, picks, sets `last_assigned_at = now()`, returns the person.
- Candidates: users whose **role name is `Coordinator`**, `active` and `available`, in the department. `openCount` = their opportunities with status `new`/`contacted`/`qualified` **plus** their opportunities with source `website` that are `converted` and whose lead stage is not `won`/`lost`.

- [ ] **Step 1: Failing tests** for `pickAssignee`: `picks the fewest open`; `tie → never-assigned first, then the one assigned longest ago`; `tie on both → lowest id`; `empty list → null`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS. Commit.

### Task A4: Create/read API

**Files:** Create `server/website/opportunities.ts`, `app/api/website/v1/opportunities/route.ts`, `app/api/website/v1/opportunities/[publicId]/route.ts`, `server/website/http.ts`, `e2e/06-website-api.spec.ts`, `e2e/website-client.ts` (signs requests for tests).

**Interfaces:**
- Produces `createWebsiteOpportunity(input: WebsiteOpportunityInput): Promise<WebsiteOpportunityView>` and `getWebsiteOpportunity(publicId: string): Promise<WebsiteOpportunityView | null>` where
  `WebsiteOpportunityView = { opportunity: { publicId: string; status: OpportunityStatus; product: Product }; lead: { reference: string } | null; contact: { role: "coordinator"; name: string; email: string; phone: string } | null }`.
- `http.ts`: `readSigned(req: Request): Promise<{ ok: true; body: string } | { ok: false; response: Response }>` and `jsonError(status, code, extra?)`.
- `POST` → 201 view; `GET` → 200 view or 404 (also 404 for a malformed UUID).

- [ ] **Step 1: Failing E2E** `e2e/06-website-api.spec.ts` (uses Playwright `request`):
  - `short form creates an opportunity with a coordinator` → 201, `lead === null`, `contact.role === "coordinator"`, `contact.phone` starts with `+92`.
  - `full form creates the opportunity and a CAR- lead` → `lead.reference` matches `/^CAR-[A-Z2-9]{7}$/`, opportunity status `converted`.
  - `GET returns the same view`; `GET unknown id → 404`; `GET "not-a-uuid" → 404`.
  - `unsigned → 401`; `extra key coordinatorId → 400 invalid_request`; `full form without city → 400 with field "details.city"`.
  - `nobody available → contact null`: sign in as admin, mark both motor coordinators unavailable (Task A5 UI), POST, expect `contact: null`, then mark them available again.
  - `opportunity page shows car details and "Website" in the timeline` (sign in as admin, open it).
- [ ] **Step 2:** Implement `createWebsiteOpportunity` in one DB transaction-free sequence, mirroring `createOpportunity` + `convertToLead` in `server/actions/opportunities.ts`: department from `departmentOf(product)`; `source: "website"`; `coordinatorId` from `assignCoordinator`; for `full`, insert the lead (`advisorId: null`, `reference: leadReference(product)`), its empty `kyc_records` row, and set status `converted`. Audit (userId null): `create` opportunity with details `Website · short|full form`; `auto_assign` with `Coordinator <name> (fewest open)` or `No coordinator available`; for full, `convert` with `leadId`.
- [ ] **Step 3:** Route handlers per Global Constraints; parse errors map the first Zod issue to `{ code: "invalid_request", field: issue.path.join("."), message: issue.message }`.
- [ ] **Step 4:** Commit (spec runs in C1).

### Task A5: PolicyDesk screens and KB

**Files:** Modify `app/(app)/opportunities/[id]/page.tsx`, `app/(app)/admin/users/page.tsx`, `server/actions/users.ts`, `server/queries/users.ts`, `messages/en.json`, `messages/ar.json`; Create `docs/09-website-and-online-payments.md`.

- [ ] **Step 1:** Opportunity page: a "Car details" panel (`DetailList`) when `details` has keys, labels from `opportunities.details.*`; "Coordinator" shows "Unassigned" as today.
- [ ] **Step 2:** Users page: an "Available" column with a one-click toggle (`toggleUserAvailable(formData)`, `users:manage`, audit `available`/`unavailable`), and the phone under the email.
- [ ] **Step 3:** KB page `docs/09-website-and-online-payments.md`: what the website API is, the signature, endpoints, automatic assignment rule, the demo-data notice, and the future-scope table (copy of the design's future scope, incl. the middle API server and its triggers). A mermaid sequence diagram of website → PolicyDesk.
- [ ] **Step 4:** Commit.

## Part B — Brokwise (`~/brokwise`)

### Task B1: Repo, signed client, cookie

**Files:** scaffold with `npx create-next-app@latest brokwise --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack` (accept defaults otherwise); Create `src/lib/signature.ts` (+ `.test.ts`), `src/lib/policydesk.ts`, `src/lib/journey.ts`, `src/lib/env.ts`, `.env.example`, `vitest.config.ts`; copy the design to `docs/superpowers/specs/2026-11-11-brokwise-design.md`, this plan to `docs/superpowers/plans/`, and `future-scope.md` to `docs/kb/future-scope.md`; `docs/kb/README.md` (overview, journeys, the three systems).

**Interfaces:**
- `signRequest` — same signature and test cases as A2 (copied, both tests must agree on a fixed vector: secret `test-secret`, ts `1700000000`, `POST`, `/api/website/v1/opportunities`, body `{"a":1}`; assert the exact hex in both repos).
- `createOpportunity(input: OpportunityRequest): Promise<{ ok: true; view: OpportunityView } | { ok: false; status: number; error: { code: string; field?: string; message?: string } }>` and `getOpportunity(publicId: string): Promise<OpportunityView | null>`; `OpportunityView` mirrors A4's `WebsiteOpportunityView`. Timeout 8 s; network failure → `{ ok:false, status: 502, error:{ code:"unavailable" } }`.
- `journey.ts`: `setJourney(publicId: string): Promise<void>`, `readJourney(): Promise<string | null>` — cookie `bw_journey`, jose HS256 JWT with `sub = publicId`, 7-day expiry, `httpOnly`, `secure` in production, `sameSite: "lax"`.
- `env.ts` reads `POLICYDESK_API_URL`, `WEBSITE_API_SECRET`, `JOURNEY_COOKIE_SECRET` (min 32 chars) and throws a clear error if missing.

- [ ] Steps: failing signature test → implement → pass; then client, journey, env; commit; `gh repo create AbdulSubhan1/brokwise --public --source . --push` is done in Task C2, not here.

### Task B2: Pages and forms

**Files:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/car/page.tsx`, `src/app/car/quick/page.tsx`, `src/app/car/details/page.tsx`, `src/app/car/received/page.tsx`, `src/app/car/actions.ts`, `src/lib/schemas.ts`, `src/lib/cars.ts`, `src/components/*`.

- `/`: Brokwise header + hero "Insurance, the wise way" **[my call on copy]**, line cards Car (active → `/car`), Health, Home, Travel, Business ("Coming soon"), made-up trust strip.
- `/car`: two choices: "Get prices now" → `/car/details`, "Call me back" → `/car/quick`.
- Forms: Server Actions with `useActionState`; `src/lib/schemas.ts` holds `quickFormSchema` and `fullFormSchema` mirroring A1's rules (full name 2+ words, email, mobile = country code select `+92`/`+971`/`+966`/`+44`/`+1` + national number → E.164, car make/model from `cars.ts` (≈8 made-up-free real makes with 3–4 models each is fine; makes are not brands of the reference site), year 1990…next year; full form adds GCC spec yes/no, car value (USD whole number), date of birth, nationality (text), city (text), years licensed). Field errors shown under fields; PolicyDesk `invalid_request.field` mapped back to the field; other failures → "We couldn't send your request. Please try again."
- On success: `setJourney(view.opportunity.publicId)` and redirect to `/car/received`.
- `/car/received`: `readJourney()`; missing/invalid → redirect `/car`. Calls `getOpportunity`; shows "Request received", lead reference when present, next steps (short form: "Your coordinator will call you"; full form: "Plans are coming in the next release — your coordinator will call you meanwhile"), and the **contact card** in the header: badge "YOUR COORDINATOR" + initial avatar; hover/focus card with name, role, email (mailto), phone (tel). `contact: null` → helpline card "Brokwise help desk · help@brokwise.test · +92 300 0000000".
- Every form page shows the notice: "Demo site: use made-up details. Payments are in PaySandbox test mode."
- Styling: simple, own look, mobile first (base styles for mobile, `md:`/`lg:` overrides, no `max-*` variants).

- [ ] Steps: build pages, commit.

### Task B3: Website tests

**Files:** `src/lib/schemas.test.ts`, `playwright.config.ts`, `e2e/leads.spec.ts`.

- Vitest: `quick form accepts a valid lead`; `rejects a one-word name`; `builds +923001234567 from +92 and 3001234567`; `full form needs city`.
- Playwright config: two `webServer`s — PolicyDesk from `process.env.POLICYDESK_DIR ?? "../policydesk-website"` (`npm run dev -- -p 3070`, env `PGLITE_DIR=./.pglite-e2e`, `WEBSITE_API_SECRET=e2e-secret`) and Brokwise on 3100 (`POLICYDESK_API_URL=http://localhost:3070`, same secret, a 32-char cookie secret).
- `e2e/leads.spec.ts`: `call me back → received page shows a coordinator`; `get prices now → received page shows CAR- reference and a coordinator`; `received without a cookie redirects to /car`; `forged cookie redirects to /car`.

## Part C — Finish

### Task C1: Run touched tests once

- [ ] PolicyDesk: `npm run check` and `npm test` → pass; `npm run test:e2e -- e2e/06-website-api.spec.ts` → pass.
- [ ] Brokwise: `npm run lint && npx tsc --noEmit && npm test` → pass; `npx playwright test` → pass.

### Task C2: Push

- [ ] Brokwise: `gh repo create AbdulSubhan1/brokwise --public --source . --remote origin --push`.
- [ ] PolicyDesk: `git -C ~/policydesk-website push -u origin feat/website-api`; `gh pr create --base main` with a body that states it is **not to be merged until Abdul says so** (live demo + Neon migration).
- [ ] Update the memory file and leave a morning summary.
