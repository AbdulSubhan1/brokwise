# Step 3: Self-serve payment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A visitor who saved a plan pays for it on PaySandbox's hosted checkout; PolicyDesk records a paid order, accepts the quote and assigns an advisor; Brokwise shows a thank-you page with the paid order and the advisor.

**Architecture:** PolicyDesk is the only app that talks to PaySandbox (`server/payments/`): it creates the checkout session, receives the signed webhook, and can re-check a session if the webhook is late. Brokwise gets `/car/payment` and `/car/thank-you`, calling three new signed PolicyDesk endpoints. A small fake PaySandbox (Node script) lets both repos run the whole flow in E2E without the live service.

**Tech Stack:** as steps 1–2, plus `standardwebhooks` (npm) in PolicyDesk.

**Spec:** `docs/superpowers/specs/2026-11-11-brokwise-design.md` §5 (journey A), §6 (advisor after payment), §8 (payment, booking rules, online method), §9, §10 step 3.

## Global Constraints

- Approved by Abdul ("Start step 3"). Same working rules: PolicyDesk in `~/policydesk-website` on `feat/website-payments`; Brokwise in worktree `~/brokwise-step2` on `feat/step-3-payments` (never edit `~/brokwise` main; the worktree-guard hook forbids it); never `--no-verify`; PolicyDesk `AGENTS.md`; en + ar; made-up data.
- PaySandbox API (v1, live at `https://paysandbox.vercel.app/api/v1`): `POST /checkout_sessions` with `Authorization: Bearer sk_test_…` and `Idempotency-Key`; body `{ amount, line_items: [{ name, quantity, amount }], success_url, cancel_url, customer_email? }` (amount in **cents**, `currency` omitted → the project's, which is **USD**); response `{ id: "cs_test_…", url, status, payment, expires_at, … }`. `GET /checkout_sessions/{id}` → same object, `status: open|complete|expired`, `payment: "pay_…" | null`. `GET /payments/{id}` → `{ id, status, amount, checkout_session, … }`.
- Webhooks: Standard Webhooks. Headers `webhook-id`, `webhook-timestamp`, `webhook-signature`; secret `whsec_…`; verify with `new Webhook(secret).verify(rawBody, headers)` from `standardwebhooks`. Event `{ id: "evt_…", type, created, data: { object: <payment snapshot> } }`; payment snapshot has `id`, `status`, `amount`, `checkout_session`, `failure_code`, `decline_code`. De-duplicate on `webhook-id`.
- Money: PolicyDesk stores whole dollars; PaySandbox gets `dollars × 100`. No tax line. Line items: plan (`"<Insurer> <Plan>"`, base), each included add-on at 0, each chosen add-on.
- Env (PolicyDesk): `PAYSANDBOX_API_URL` (default `https://paysandbox.vercel.app/api/v1`), `PAYSANDBOX_SECRET_KEY`, `PAYSANDBOX_WEBHOOK_SECRET`, `WEBSITE_URL` (e.g. `https://brokwise.vercel.app`). Missing key → start-payment returns 503 `payments_disabled`; missing webhook secret → webhook returns 503.
- Advisor rule = coordinator rule from step 1 with role name **`Advisor`**: active + available, same department, fewest open leads (assigned, stage not `won`/`lost`), tie → assigned longest ago → lowest id. Reuse `pickAssignee`.
- Routes keep the step-1 shape (`/opportunities/{publicId}/…`). The design's pay-token routes (`/payments/{publicIdOrPayToken}`) come with the assisted flow in step 4 **[my call]**.
- Tests once at the end. E2E ports: PolicyDesk `E2E_PORT=3071`, fake PaySandbox `3072`, Brokwise `3100`.
- Live: Abdul creates the PaySandbox project (USD) + key + webhook endpoint and sets the secrets in Vercel himself; Abdul runs `db:setup` before the merge (additive migration).

## Review Focus

1. **Duplicate or replayed webhook:** the same `webhook-id` twice, or `payment.succeeded` for an order already paid → 200, nothing changes, one advisor assignment only. (A3 E2E.)
2. **Forged or stale webhook:** wrong signature or timestamp older than 5 min → 401, nothing written. (A2 unit.)
3. **Webhook late:** visitor returns before the webhook → thank-you page shows "Confirming your payment…", and PolicyDesk's order read re-checks the session at PaySandbox and marks it paid. (A3 + B2 E2E.)
4. **Pay twice:** pressing Pay again for a paid order → 409 `already_paid`, Brokwise shows the thank-you page; pressing Pay again for a pending order with an open session reuses that session (no second session). (A3 E2E.)
5. **Selection changed after a session was created:** a new total → the old pending order is marked `expired` and a new session is created for the new total; a payment that later arrives on the old session is still recorded on its own order and audited, but does not overwrite the newer selection. (A3 unit/E2E.)

---

## Part A — PolicyDesk (`~/policydesk-website`, branch `feat/website-payments`)

### Task A1: Data

**Files:** `server/db/schema.ts`, migration (`npm run db:generate`), `constants/statuses.ts`, `messages/en.json` + `ar.json`, `scripts/setup-db.ts` (truncate list).

- `orders`: `id serial pk`, `public_id uuid unique default gen_random_uuid()`, `lead_id → leads (cascade)`, `quote_id → quotes`, `status text ('pending'|'paid'|'expired')`, `amount int` (whole dollars), `line_items jsonb` (`{ name: string; quantity: 1; amount: number /* dollars */ }[]`), `checkout_session_id text unique`, `checkout_url text`, `payment_id text null`, `paid_at timestamp null`, `created_at`, `updated_at`.
- `webhook_events`: `id text pk` (the `webhook-id`), `type text`, `received_at timestamp default now()`.
- `PAYMENT_METHODS` gains `"online"`; label "Online (PaySandbox)" / "عبر الإنترنت (PaySandbox)". `ORDER_STATUSES` constant.
- [ ] Commit.

### Task A2: PaySandbox client and webhook verification (TDD)

**Files:** `server/payments/paysandbox.ts`, `server/payments/webhook.ts`, `server/payments/webhook.test.ts`, `server/payments/line-items.ts`, `server/payments/line-items.test.ts`; `package.json` (`standardwebhooks`).

**Interfaces:**
- `createCheckoutSession(input: { amountCents: number; lineItems: { name: string; quantity: number; amount: number }[]; successUrl: string; cancelUrl: string; customerEmail?: string; idempotencyKey: string }): Promise<{ id: string; url: string; expiresAt: number }>` — throws `PaySandboxError(status, code)` on non-2xx.
- `getCheckoutSession(id: string): Promise<{ id: string; status: "open" | "complete" | "expired"; payment: string | null }>`; `getPayment(id: string): Promise<{ id: string; status: string; checkoutSession: string }>`.
- `verifyWebhook(rawBody: string, headers: Headers, secret: string): PaySandboxEvent | null` (null = invalid).
- `toLineItems(quote: { insurer: string; planName: string; addOns: QuoteAddOn[]; premium: number }): { lines: { name; quantity: 1; amount }[]; totalDollars: number }` — plan line amount = premium − chosen add-on prices; included add-ons at 0; `toCents(d) = d * 100`.
- [ ] **Failing tests:** webhook — `accepts a correctly signed event`; `rejects a wrong signature`; `rejects a stale timestamp`; `rejects missing headers` (sign with `new Webhook(secret).sign(id, date, body)`). Line items — `plan line plus included at 0 plus chosen add-ons`; `lines add up to the quote premium`; `cents are dollars × 100`.
- [ ] Run → FAIL; implement; run → PASS; commit.

### Task A3: Orders, endpoints, webhook, advisor

**Files:** `server/payments/orders.ts`, `server/website/assign.ts` (generalise: `assignByRole(departmentId, roleName)`; keep `assignCoordinator`), `app/api/website/v1/opportunities/[publicId]/payment/route.ts` (GET summary, POST start), `app/api/website/v1/opportunities/[publicId]/order/route.ts` (GET), `app/api/paysandbox/webhook/route.ts`, `e2e/fake-paysandbox.mjs`, `e2e/08-website-payments.spec.ts`, `playwright.config.ts` (second webServer: the fake on 3072; PolicyDesk env `PAYSANDBOX_API_URL=http://localhost:3072/api/v1`, `PAYSANDBOX_SECRET_KEY=sk_test_e2e`, `PAYSANDBOX_WEBHOOK_SECRET=whsec_<base64 of 24 fixed bytes>`, `WEBSITE_URL=http://localhost:3100`).

**Interfaces:**
- `GET …/payment` → 200 `{ payment: { status: "ready" | "already_paid"; lines: { label: string; amount: number }[]; total: number; quoteReference: string } }`; 409 `no_lead` / `no_selection`.
- `POST …/payment` (empty body `{}`) → 200 `{ checkoutUrl: string }`; 409 `already_paid` / `no_selection`; 503 `payments_disabled`; 502 `paysandbox_unavailable`.
  - Pending order for the **same quote and amount** whose session is not past `expires_at` → return its `checkout_url`. Otherwise mark other pending orders of the lead `expired`, insert a new order, create the session with `Idempotency-Key: order-<order.publicId>`, `success_url = WEBSITE_URL + "/car/thank-you"`, `cancel_url = WEBSITE_URL + "/car/payment"`, `customer_email` = opportunity email. Audit `checkout` on `order`.
- `GET …/order` → 200 `{ order: { status: "pending" | "paid"; lines; total; paidAt: string | null; paymentId: string | null; quoteReference: string; emailMasked: string; phoneMasked: string } | null; advisor: { role: "advisor"; name; email; phone } | null }`. When the latest order is `pending`, first call `refreshOrder(order)`: `getCheckoutSession` → if `complete` with a payment whose status is `succeeded`, run `markPaid`. Masking: `b***s@yopmail.com`, `+92 *** ***4568`.
- `markPaid(order, paymentId): Promise<boolean>` (idempotent: `UPDATE … WHERE status <> 'paid'`; false if already paid). On first success: quote → `accepted`; lead stays `quoted` (booking sets `won` as today); advisor assigned to the lead (`assignByRole(dept, "Advisor")`, writes `leads.advisor_id`, `users.last_assigned_at`); audits (userId null): `paid` on `order` (`"$1,200 · pay_…"`), `accept` on `quote`, `auto_assign` advisor or `No advisor available`.
- `POST /api/paysandbox/webhook`: read raw text; `verifyWebhook` → 401 if null; insert `webhook_events` (on conflict do nothing) → if it already existed return 200 `{ received: true, duplicate: true }`; `payment.succeeded` → find order by `checkout_session` → `markPaid`; `payment.failed` → audit `payment_failed` on the order with `decline_code`; unknown session or other types → 200 and ignore. Always 200 once verified.
- Booking (`server/actions/policies.ts`): when the lead has a `paid` order for the quote being booked, the new policy is created `active` with `paymentStatus: "paid"`, `paymentMethod: "online"`, `paymentReference: <payment_id>`, `paidAt: order.paid_at`.
- Lead page **Policy and payment** tab: an "Online payment" panel (status, amount, PaySandbox payment id, paid at) when the lead has an order.
- `e2e/fake-paysandbox.mjs` (plain Node `http`, no deps beyond `standardwebhooks`): `POST /api/v1/checkout_sessions` (checks Bearer `sk_test_e2e`, stores the session, honours `Idempotency-Key`, returns `url = http://localhost:3072/c/<id>`); `GET /api/v1/checkout_sessions/:id`; `GET /c/:id` → HTML with a **Pay** button (form POST `/c/:id/pay`) and a **Pay without webhook** button; `/c/:id/pay` → marks complete with `pay_…`, POSTs a signed `payment.succeeded` webhook to `http://localhost:${E2E_PORT}/api/paysandbox/webhook` (unless "without webhook"), then 303 → `success_url?pay=pay_…`.
- [ ] **Failing E2E** `08-website-payments.spec.ts`: `payment summary lists the saved plan and add-ons`; `no selection → 409 no_selection`; `start payment returns the fake checkout URL`; `starting twice reuses the open session`; `paying marks the order paid, accepts the quote and assigns an advisor`; `same webhook twice changes nothing`; `forged webhook → 401`; `late webhook: order read re-checks the session and marks it paid`; `paid → start again gives 409 already_paid`; `new selection after a session expires the old order`; `booking a paid online order makes the policy active with method Online` (admin UI: KYC/doc gates may need the seed shortcut the journey spec uses — reuse `e2e/02-journey.spec.ts` helpers).
- [ ] Implement; commit.

### Task A4: KB and README

- [ ] `docs/09-website-and-online-payments.md`: orders, endpoints, webhook (Standard Webhooks, de-dup), late-webhook re-check, advisor after payment, online method on booking, env vars, the PaySandbox setup steps (project in USD, key, webhook endpoint URL), and update future scope. `README.md` env list. Commit.

## Part B — Brokwise (`~/brokwise-step2`, branch `feat/step-3-payments`)

### Task B1: Client

**Files:** `src/lib/policydesk.ts` (+ types), `src/lib/contact.ts` (role `advisor` → badge "Your advisor").

- `getPaymentSummary(publicId)`, `startPayment(publicId)`, `getOrder(publicId)` with the A3 shapes; Zod-checked like step 2.
- [ ] Unit test: `contactOf` gives "Your advisor" for an advisor.

### Task B2: Pages

**Files:** `src/app/car/selected/page.tsx` (button "Continue to payment" → `/car/payment`), `src/app/car/payment/page.tsx`, `src/app/car/thank-you/page.tsx`, `src/app/car/actions.ts` (`startPaymentAction`), components as needed, `e2e/payment.spec.ts`, `playwright.config.ts` (also start PolicyDesk's `e2e/fake-paysandbox.mjs` on 3072 from `POLICYDESK_DIR`, and give PolicyDesk the env from A3).

- `/car/payment`: no cookie → `/car`; `no_lead` → `/car/received`; `no_selection` → `/car/plans`; `already_paid` → `/car/thank-you`. Shows lines and total, the quote reference, a required checkbox "I agree to the terms and confirm my details are made up for this demo.", and a button "Pay $1,200 with PaySandbox". Note under it: "You'll pay on PaySandbox's test checkout. Use test card 4242 4242 4242 4242." Errors: 503/502 → "Payments are unavailable right now. Please try again later."
- `startPaymentAction`: server action; `redirect(checkoutUrl)` (external).
- `/car/thank-you`: no cookie → `/car`. `order.status === "paid"` → "Payment received", lines, total, `Paid on <date>`, `PaySandbox payment <pay_…>`, "A receipt goes to <masked email>", next steps ("Your advisor <name> will contact you about documents."), header card = advisor (or help desk). `pending` → "Confirming your payment…" and the page refreshes itself every 3 s for up to 30 s (client `router.refresh()`), then "This is taking longer than usual. Your coordinator will confirm by email." `order === null` → `/car/payment`.
- [ ] **E2E** `e2e/payment.spec.ts`: `full journey: plans → pay on the fake checkout → thank-you shows paid order and advisor`; `pay without webhook → thank-you confirms after the re-check`; `terms box must be ticked`; `paid journey opening /car/payment goes to /car/thank-you`; `thank-you without a cookie → /car`.
- [ ] Update `docs/kb/README.md` and `README.md`. Commit.

## Part C — Finish

- [ ] **C1 tests once:** PolicyDesk `npm run check`; `E2E_PORT=3071 npm run test:e2e -- e2e/06-website-api.spec.ts e2e/07-website-plans.spec.ts e2e/08-website-payments.spec.ts`. Brokwise lint/typecheck/test; `POLICYDESK_PORT=3071 npx playwright test`.
- [ ] **C2 ship:** push PolicyDesk branch + PR, CI once → Abdul: PaySandbox project (USD), secret key, webhook endpoint `https://policydesk-opal.vercel.app/api/paysandbox/webhook` (events: all payment events), Vercel env `PAYSANDBOX_SECRET_KEY`, `PAYSANDBOX_WEBHOOK_SECRET`, `WEBSITE_URL=https://brokwise.vercel.app`, and `db:setup` from his terminal → merge PolicyDesk → wait live → merge Brokwise PR.
- [ ] **C3 live test:** full form → plan → pay with test card 4242 on PaySandbox → thank-you shows paid + advisor; PaySandbox dashboard shows the payment; PolicyDesk lead shows the paid order, accepted quote and advisor.
