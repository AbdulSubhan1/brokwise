# Step 4: Assisted flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A short-form customer is helped by their coordinator: the coordinator completes the details in PolicyDesk, converts the opportunity, chooses the plan and add-ons with the customer, and creates a private payment link `brokwise.vercel.app/pay/<token>` that the customer pays later through the same payment and thank-you pages as step 3.

**Architecture:** All coordinator work happens on PolicyDesk's **opportunity page** (coordinators already see their own opportunities; no lead-scope change). Pay links are stored as SHA-256 hashes and shown once. Brokwise's `/pay/[token]` route asks PolicyDesk to open the link, sets the journey cookie for that opportunity and sends the customer into the existing `/car/payment` → PaySandbox → `/car/thank-you` flow.

**Tech Stack:** as steps 1–3.

**Spec:** `docs/superpowers/specs/2026-11-11-brokwise-design.md` §5 B (assisted), §6, §9 (pay tokens), §10 step 4.

## Global Constraints

- Approved by Abdul ("Step 4: assisted flow"). Working rules unchanged: PolicyDesk in `~/policydesk-website` on `feat/website-assisted`; Brokwise in worktree `~/brokwise-step2` on `feat/step-4-assisted` (never edit `~/brokwise`); never `--no-verify`; PolicyDesk `AGENTS.md`, en + ar; made-up data. If a hook blocks a tool, stop and report — never work around it.
- **Adding npm packages:** after any `npm install`, regenerate the lockfile with `npx -y npm@10 install --package-lock-only` so CI's `npm ci` passes.
- Coordinator actions on website opportunities require `opportunities:convert` (Coordinator, Department manager, Admin have it) plus the existing opportunity scope guard.
- **Online selection marker:** new column `quotes.online boolean not null default false`. The migration sets `online = true` where `created_by IS NULL`. Everywhere step 2/3 code finds "the open website selection" by `created_by IS NULL`, it uses `online = true` instead (`server/website/plans.ts`, `server/payments/orders.ts`, booking). A coordinator's choice is an `online` quote with `created_by = coordinator`.
- Advisor still comes **after payment** (step 3 code). Converting a **website** opportunity never asks for an advisor.
- Pay links: token = 32 random bytes, base64url (43 chars); store only `sha256(token)` hex; link = `${WEBSITE_URL}/pay/${token}`; valid **72 hours**; one active link per lead (creating a new one revokes the others); dead once the lead's order is paid.
- Tests once at the end. Ports: PolicyDesk `E2E_PORT=3071`, fake PaySandbox 3072, Brokwise 3100.
- Live: additive migration → Abdul runs `db:setup` before the merge.

## Review Focus

1. **Guessed, revoked or expired token:** unknown/revoked → 404 `not_found` (same answer, no hint which); expired → 410 `link_expired`; Brokwise shows a friendly page and sets no cookie. (A3 + B1 E2E.)
2. **Link opened after the order is paid:** → 200 `status: "paid"`, Brokwise sends the customer to the thank-you page. (A3 + B1 E2E.)
3. **Coordinator changes the plan after sending the link:** the link still works and the payment page shows the **new** choice and total. (A3 E2E.)
4. **Converting a short-form website opportunity with missing details** → refused with the first missing field; the form shows it. (A2 E2E.)
5. **A coordinator of another department** opening the opportunity or the actions → 404 / forbidden, as today. (A2 E2E, reuse `01-access` helpers.)

---

## Part A — PolicyDesk (`~/policydesk-website`, branch `feat/website-assisted`)

### Task A1: Data and the online marker

**Files:** `server/db/schema.ts`, migration (`npm run db:generate` + the `UPDATE quotes SET online = true WHERE created_by IS NULL;` line), `server/website/plans.ts`, `server/payments/orders.ts`, `server/actions/policies.ts` (wherever `createdBy IS NULL` means "online"), `scripts/setup-db.ts` (truncate list).

- `quotes.online boolean not null default false`.
- `payment_links`: `id serial pk`, `token_hash text unique not null`, `lead_id → leads (cascade)`, `created_by → users`, `created_at`, `expires_at`, `opened_at null`, `revoked_at null`.
- [ ] Switch the selection queries to `online = true`; step 2/3 tests (07, 08) must still pass unchanged. Commit.

### Task A2: Coordinator details and convert (website opportunities)

**Files:** `schemas/website.ts` (reuse `carDetailsSchema` / full-form rules), `server/actions/website-opportunities.ts` (new), `app/(app)/opportunities/[id]/page.tsx`, `components/opportunities/*` (new client forms built from `components/ui` and React Hook Form like the existing forms), `messages/*`.

**Interfaces:**
- `saveWebsiteDetails(input: CarDetailsInput & { id: number }): Promise<ActionResult>` — guard `opportunities:convert` + scope; only for `source = "website"` and status not `converted`; merges into `opportunities.details`; audit `details` on `opportunity`.
- `convertWebsiteOpportunity(formData: FormData)` — guard as above; requires status `qualified` and **full** car details valid (`carDetailsSchema` with the full-form refinements; on failure throw `errors.detailsMissing` naming the first field); creates the lead with `advisorId: null`, its KYC row, status `converted`; audit `convert` with details "advisor after payment".
- Opportunity page, when `source = "website"`: a **Car details** panel becomes an editable form (fields of the full form) while not converted; the **Convert to lead** panel shows "The advisor is assigned automatically after the customer pays." and no advisor picker. Other opportunities keep today's screens.
- [ ] Commit.

### Task A3: Plan choice, pay links, open endpoint

**Files:** `server/website/pay-links.ts`, `server/website/pay-links.test.ts`, `server/actions/website-payments.ts`, `app/api/website/v1/pay-links/[token]/open/route.ts`, opportunity page panel `components/opportunities/online-payment-panel.tsx`, `e2e/09-website-assisted.spec.ts`, `docs/09-website-and-online-payments.md`.

**Interfaces:**
- `newPayToken(): { token: string; hash: string }`, `hashPayToken(token: string): string`, `payLinkState(link, order, now): "active" | "expired" | "revoked" | "paid"` (pure, unit-tested: `active within 72 h`; `expired after 72 h`; `revoked wins over active`; `paid when the lead's order is paid`; `hash is sha256 hex and never the token`).
- `chooseOnlinePlan(formData)` — guard; lead of the opportunity must exist; reuses `priceSelection` + the step-2 save path but with `created_by = user.id`, `online = true`; one open online selection per lead (update in place). Audit `select` with the user.
- `createPayLink(formData): Promise<{ ok: true; url: string } | { ok: false; error }>` — guard; requires an open online selection and no paid order; revokes the lead's other links; inserts the hash, `expires_at = now + 72 h`; returns the full URL once. Audit `pay_link` (`"expires <date>"`). `revokePayLink(formData)` — audit `pay_link_revoked`.
- Opportunity page panel **Online payment** (after convert, website opportunities): plan picker (Autocomplete of active car plans, cheapest first) + add-on checkboxes for the chosen plan (included shown, preselected ticked) + live total + "Save choice"; then "Create payment link" → shows the URL once with a Copy button and "Shown once. Create a new link if it's lost."; a small table of links (created, expires, status Active / Expired / Revoked / Paid, Revoke); the order status from step 3.
- `POST /api/website/v1/pay-links/{token}/open` (signed, empty body) → 200 `{ opportunity: { publicId }, status: "active" | "paid" }`; 404 `not_found` (unknown or revoked); 410 `link_expired`. Sets `opened_at` the first time and audits `pay_link_opened`.
- [ ] **E2E** `09-website-assisted.spec.ts`: `coordinator completes details and converts a short-form opportunity without an advisor`; `convert refused while details are missing`; `coordinator chooses a plan with an add-on and creates a pay link shown once`; `open pay link → 200 active with the opportunity id`; `new link revokes the old one (old → 404)`; `unknown token → 404`; (expiry is covered by the `payLinkState` unit tests and the route maps `expired` → 410; no E2E ageing of rows); `changing the plan after the link → payment summary shows the new total`; `paid order → open gives status paid`; `coordinator of another department can't see it`.
- [ ] KB: assisted flow, pay links, statuses, security (hash only, shown once, 72 h). Commit.

## Part B — Brokwise (`~/brokwise-step2`, branch `feat/step-4-assisted`)

### Task B1: `/pay/[token]`

**Files:** `src/lib/policydesk.ts` (`openPayLink(token): Promise<{ ok: true; publicId: string; status: "active" | "paid" } | { ok: false; status: 404 | 410 | 502; code: string }>`), `src/app/pay/[token]/route.ts` (GET), `src/app/pay/expired/page.tsx`, `src/app/pay/invalid/page.tsx`, `e2e/assisted.spec.ts`.

- `GET /pay/<token>`: validate the token shape (`^[A-Za-z0-9_-]{43}$`, else → `/pay/invalid`); `openPayLink`; active → `setJourney(publicId)` + redirect `/car/payment`; paid → `setJourney` + redirect `/car/thank-you`; 410 → `/pay/expired`; 404 → `/pay/invalid`; other → `/pay/invalid?retry=1` ("We couldn't open your link. Please try again.").
- `/pay/expired`: "This payment link has expired. Ask your coordinator for a new one." + help desk. `/pay/invalid`: "This payment link isn't valid. Check the link your coordinator sent, or ask for a new one."
- `/car/received` for short-form journeys: add one line "When your coordinator has your details, they'll send you a payment link." (copy only).
- [ ] Unit test: token-shape check. **E2E** `assisted.spec.ts`: `call me back → coordinator sends a link (PolicyDesk UI on its port) → customer pays through /pay/<token> → thank-you with advisor`; `garbage token → invalid page`; `paid link → thank-you`. (The first test signs in to PolicyDesk at `http://localhost:${POLICYDESK_PORT}` as a coordinator/admin with the demo role buttons, as PolicyDesk's own E2E helpers do.)
- [ ] Docs: `docs/kb/README.md` (journey B now complete), `README.md`. Commit.

## Part C — Finish

- [ ] **C1 tests once:** PolicyDesk `npm run check`; `E2E_PORT=3071 npm run test:e2e -- e2e/06-website-api.spec.ts e2e/07-website-plans.spec.ts e2e/08-website-payments.spec.ts e2e/09-website-assisted.spec.ts`; Brokwise lint/typecheck/test + `POLICYDESK_PORT=3071 POLICYDESK_DIR=../policydesk-website npx playwright test`.
- [ ] **C2 ship:** PRs; CI once; Abdul runs `db:setup` before the merge; merge PolicyDesk → wait live → merge Brokwise.
- [ ] **C3 live test:** Call me back on Brokwise → in live PolicyDesk as the assigned coordinator: complete details, qualify, convert, choose plan, create link → Abdul opens the link and pays with 4242 → thank-you + advisor; PolicyDesk shows the link Paid.
