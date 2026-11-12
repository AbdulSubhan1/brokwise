# Step 5: Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The public side resists bots and abuse: a Cloudflare Turnstile check on both forms, per-visitor-IP rate limits on every website API call, and safe HTTP headers on Brokwise.

**Architecture:** Brokwise verifies Turnstile in its server actions (its own secret) and forwards the visitor's IP to PolicyDesk in a header. PolicyDesk counts requests per IP and endpoint group in a small Postgres table and answers 429 with `Retry-After` when a limit is passed. Both features stay off until configured, so the live site keeps working until Abdul adds the keys.

**Tech Stack:** as before; Turnstile via its script `https://challenges.cloudflare.com/turnstile/v0/api.js` and `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`.

**Spec:** `docs/superpowers/specs/2026-11-11-brokwise-design.md` §9, §10 step 5.

## Global Constraints

- Approved by Abdul ("Step 5: hardening"). Working rules unchanged: PolicyDesk in `~/policydesk-website` on `feat/website-rate-limits`; Brokwise in worktree `~/brokwise-step2` on `feat/step-5-hardening`; never edit `~/brokwise`; never `--no-verify`; PolicyDesk `AGENTS.md`; en + ar. If a hook blocks a tool, stop and report.
- After any npm install, `npx -y npm@10 install --package-lock-only`.
- **[my call] Rate limits live in PolicyDesk's Postgres**, not Upstash Redis (design §9 said Upstash): PolicyDesk already sees every call, Brokwise has no store, and it needs no new account or secret. Revisit if traffic ever needs it.
- Visitor IP: Brokwise reads the first address in `x-forwarded-for` (else `x-real-ip`, else `"unknown"`) and sends it as `x-brokwise-client-ip`. Only holders of the API secret can call PolicyDesk at all, so this header is not signed **[my call]**. PolicyDesk validates it as an IPv4/IPv6 string (else uses `"unknown"`).
- Limits per IP per rolling fixed window of 1 hour, env-tunable (defaults):
  | Group | Endpoints | Env | Default |
  | --- | --- | --- | --- |
  | `lead` | `POST /opportunities` | `RATE_LIMIT_LEADS_PER_HOUR` | 5 |
  | `select` | `PUT …/selection` | `RATE_LIMIT_SELECTIONS_PER_HOUR` | 30 |
  | `pay` | `POST …/payment` | `RATE_LIMIT_PAYMENTS_PER_HOUR` | 20 |
  | `link` | `POST /pay-links/{token}/open` | `RATE_LIMIT_LINK_OPENS_PER_HOUR` | 20 |
  | `read` | every signed `GET` | `RATE_LIMIT_READS_PER_HOUR` | 600 |
  `RATE_LIMITS=off` disables them. The PaySandbox webhook is never limited.
- Over the limit → `429 { error: { code: "rate_limited" } }` with `Retry-After: <seconds to the window end>`; the request is not processed.
- Turnstile: Brokwise env `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`. Both unset → no widget, no check. Set → widget on `/car/quick` and `/car/details`; the server action verifies the token (with the visitor IP as `remoteip`) **before** calling PolicyDesk; failure → form error "Please complete the check to show you're not a bot." E2E uses Cloudflare's test keys: site key `1x00000000000000000000AA` (always passes), secret `1x0000000000000000000000000000000AA` (always passes) and `2x0000000000000000000000000000000AA` (always fails).
- Tests once at the end. Ports as before.
- Live: additive migration → Abdul runs `db:setup` before the merge; Turnstile keys are optional and Abdul adds them in Vercel when he has a Cloudflare account.

## Review Focus

1. **Sixth lead from one IP within the hour** → 429 with `Retry-After`; Brokwise shows "Too many requests. Please wait a few minutes and try again." and keeps the form values. (A1 E2E + B2 unit/E2E.)
2. **Different IPs are counted separately**; a missing or garbage IP header falls back to one shared `"unknown"` bucket. (A1 unit + E2E.)
3. **Window rollover:** a count from the previous hour does not block the next hour. (A1 unit.)
4. **Turnstile failing secret** → the form refuses before PolicyDesk is called (no opportunity created). (B1 unit with a mocked fetch.)
5. **Turnstile unset** → forms work exactly as before (no script loaded). (B2 E2E default config.)

---

## Part A — PolicyDesk (`~/policydesk-website`, branch `feat/website-rate-limits`)

### Task A1: Rate limiter

**Files:** `server/db/schema.ts` + migration (`rate_limits`: `key text`, `window_start timestamp`, `count int not null default 0`, primary key `(key, window_start)`), `server/website/rate-limit.ts`, `server/website/rate-limit.test.ts`, `server/website/http.ts`, every route under `app/api/website/v1/**`, `e2e/website-client.ts` (sends a random `x-brokwise-client-ip` per call unless the test passes one), `e2e/10-website-rate-limits.spec.ts`, `docs/09-website-and-online-payments.md`, `README.md`.

**Interfaces:**
- `type LimitGroup = "lead" | "select" | "pay" | "link" | "read"`.
- `limitFor(group: LimitGroup, env = process.env): number | null` (null = off).
- `windowStart(now: Date): Date` (start of the UTC hour); `retryAfterSeconds(now: Date): number`.
- `clientIp(req: Request): string` (validated header or `"unknown"`).
- `consume(group: LimitGroup, ip: string, now = new Date()): Promise<{ ok: true } | { ok: false; retryAfter: number }>` — one `INSERT … ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1 RETURNING count`; key = `${group}:${ip}`; also deletes rows with `window_start` older than 24 h roughly 1 time in 50 calls.
- `http.ts`: `limited(req: Request, group: LimitGroup): Promise<Response | null>` used by each route right after `readSigned` succeeds (so unsigned spam is refused with 401 before touching the table).
- [ ] **Failing unit tests:** `limitFor reads env and defaults`; `RATE_LIMITS=off disables all`; `windowStart is the UTC hour`; `retryAfter counts to the next hour`; `clientIp takes a valid header and falls back to unknown`. (DB part covered by E2E.)
- [ ] **E2E** `10-website-rate-limits.spec.ts` (fixed IPs): `sixth lead from one IP → 429 with Retry-After`; `another IP is not blocked`; `pay-link opens are limited`; `webhook is never limited` (send 30 unsigned → always 401, never 429).
- [ ] Implement; KB + README env list; commit.

## Part B — Brokwise (`~/brokwise-step2`, branch `feat/step-5-hardening`)

### Task B1: IP forwarding and Turnstile verify

**Files:** `src/lib/policydesk.ts` (add `x-brokwise-client-ip` from `headers()`; map 429 to `{ ok: false, status: 429, code: "rate_limited" }`), `src/lib/client-ip.ts` (+ test), `src/lib/turnstile.ts` (+ test), `src/lib/env.ts`.

- `clientIpFrom(headers: Headers): string`.
- `turnstileEnabled(): boolean`; `verifyTurnstile(token: string | null, ip: string): Promise<boolean>` (POST form-encoded `secret`, `response`, `remoteip`; `success === true`; network error → false).
- [ ] Tests first: `takes the first x-forwarded-for address`; `falls back to x-real-ip then unknown`; `verify passes with the always-pass secret response {success:true}` and `fails on {success:false}` and `fails on network error` (mock `fetch`).

### Task B2: Forms, messages, headers

**Files:** `src/components/turnstile.tsx` (client: loads the script once, renders the widget with the site key, puts the token in a hidden `cf-turnstile-response` input), the quick and full form components, `src/app/car/actions.ts`, `next.config.ts` (headers), `e2e/hardening.spec.ts`, `playwright.config.ts`, `docs/kb/README.md`, `README.md`, `.env.example`.

- Actions: when Turnstile is enabled, verify first; refuse with the form error above. Every PolicyDesk 429 anywhere (forms, select plan, pay, pay-link) shows "Too many requests. Please wait a few minutes and try again." (pay-link 429 → `/pay/invalid?retry=1`).
- Security headers for all routes: `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=63072000; includeSubDomains` (production only), `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- Playwright: the PolicyDesk server gets `RATE_LIMITS=off` (Brokwise's browser tests all come from one IP); a second Brokwise server is **not** added — instead `e2e/hardening.spec.ts` covers what the default config can: `security headers are set`; `forms work without Turnstile keys (no Cloudflare script loaded)`; `rate-limited lead shows the wait message` (use `page.route` to make the Brokwise→PolicyDesk call impossible to intercept? No: server-side calls can't be intercepted; so start the PolicyDesk web server with `RATE_LIMIT_LEADS_PER_HOUR=1000` and a dedicated test that sets nothing — the 429 message is covered by a unit test of the action's result mapping instead). Turnstile widget rendering with the test site key is checked in a unit/DOM-free way (component renders the container with `data-sitekey`).
- [ ] Commit.

## Part C — Finish

- [ ] **C1 tests once:** PolicyDesk `npm run check`; `E2E_PORT=3071 npm run test:e2e -- e2e/06-website-api.spec.ts e2e/07-website-plans.spec.ts e2e/08-website-payments.spec.ts e2e/09-website-assisted.spec.ts e2e/10-website-rate-limits.spec.ts`. Brokwise lint/typecheck/test/build; `POLICYDESK_PORT=3071 POLICYDESK_DIR=../policydesk-website npx playwright test`.
- [ ] **C2 ship:** PRs; CI once; Abdul runs `db:setup`; merge PolicyDesk → live → merge Brokwise.
- [ ] **C3 live check:** headers present on brokwise.vercel.app; a signed-in check that the API answers 429 after the limit is shown by one curl series against a test IP is **not** possible without the secret, so the live check is: forms still work; Abdul optionally adds Turnstile keys later and the widget appears.
