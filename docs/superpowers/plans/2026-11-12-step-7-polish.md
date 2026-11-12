# Step 7: Polish pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the five small issues found in the step 3–6 live checks, so every page says the right thing.

**Spec:** `docs/superpowers/specs/2026-11-11-brokwise-design.md`; live-check notes in the step 3 and step 6 sections of the handover.

## Global Constraints

- Approved by Abdul ("Polish pass"). PolicyDesk in `~/policydesk-website` on `fix/website-polish` (off `origin/main` 019f767); Brokwise in worktree `~/brokwise-step2` on `fix/step-7-polish` (off `origin/main` 3ca2610). Never edit `~/brokwise` or `~/policydesk`; never `--no-verify`; if a hook blocks a tool, stop and report. After any npm install, `npx -y npm@10 install --package-lock-only`.
- No behaviour change beyond the items below; existing test names stay.
- Live data changes run only through `db:setup`, which Abdul runs before the merge. They must be idempotent and must not touch plans that already have correct benefits.
- Add each item to the engineering-highlights pages where it is worth showing.
- Tests: unit tests per item; the touched E2E specs run once at the end by the coordinator.

## Items

### P1 — Price period wording (Brokwise)
"Prices are yearly" / "Total a year" is wrong for travel single trips and Schengen trips.
- `LobConfig.pricePeriod(cover: string): "year" | "trip"` — travel: `annual_multi_trip` → `year`, every other travel cover → `trip`; car, home and health: always `year`.
- Plan card total: "Total a year" / "Total for the trip". Plans page note: car/home/health "Prices are yearly, in US dollars."; travel "Prices are per trip, or per year for annual plans, in US dollars." Selected, payment and thank-you totals use the chosen plan's cover.
- Unit tests: `travel single trip is per trip`; `travel annual is per year`; `car is per year`.

### P2 — Real 404 status for unknown lines (Brokwise)
`/boat/details` shows the 404 page but answers HTTP 200 (cacheComponents streams before `notFound()`).
- `src/proxy.ts` (Next 16 proxy): when the first path segment is not a known top-level route (`car`, `travel`, `home`, `health`, `pay`, plus every other folder under `src/app` and Next internals `_next`, `favicon.ico`, files with an extension), rewrite to `/not-found-page` (a plain page that renders the same 404 content) with `status: 404`. Known routes are untouched.
- Update `e2e/lobs.spec.ts` "unknown line → 404 with links" to also assert `response.status() === 404` (keep the test name). Unit test the slug check (`isKnownTopLevel`).

### P3 — Product-specific plan benefits (PolicyDesk)
Seeded plans pick from one shared `BENEFITS` list, so travel plans say "Roadside assistance".
- `constants/benefits.ts`: made-up benefit lists per website product (car, travel, home, health; 6–8 each, e.g. travel: "Emergency medical cover", "Trip delay cover", "Lost baggage cover", "24/7 travel assistance", "Personal liability abroad", "Schengen visa approved"; home: "Fire and flood cover", "Theft cover", "Temporary accommodation", "Emergency repairs", "Public liability", "Locks and keys"; health: "Hospital stays", "Specialist visits", "Prescribed medicines", "Emergency care", "Day-case surgery", "Direct billing at partner hospitals"; car keeps today's list without the travel-only items).
- Seed uses them. `ensurePlanBenefits()` (run by `db:setup` every time, idempotent): for plans of website products whose benefits include an item **not** in that product's list, replace the benefits with a deterministic pick from the product's list (same count); print `Plan benefits fixed: N`.
- Unit test the pick and the "needs fixing" check (no DB).

### P4 — The lead's "Paid" step (PolicyDesk)
The lead progress bar says "Paid: Not yet" after an online payment, until booking.
- When the lead has a paid online order and no paid policy yet, step 5 shows "Paid online" (with the amount) instead of "Not yet". After booking it shows what it shows today.
- E2E: extend spec 08's paying test (or add one) to check the step text; keep names.

### P5 — One time zone for dates (PolicyDesk)
PolicyDesk formats dates on the server in UTC; Brokwise uses Asia/Karachi, so "Paid on" differed by a day.
- `constants/config.ts` `TIME_ZONE = "Asia/Karachi"`; every `Intl.DateTimeFormat` in `lib/format.ts` passes `timeZone: TIME_ZONE`.
- Unit test: a UTC timestamp at 20:00 on 11 Nov formats as 12 Nov.
- Check that existing E2E specs which assert dates still pass (adjust only expectations that were UTC-based, keep names).

## Finish
- [ ] Coordinator: PolicyDesk `npm run check` + `E2E_PORT=3071 npm run test:e2e -- e2e/06-website-api.spec.ts e2e/07-website-plans.spec.ts e2e/08-website-payments.spec.ts e2e/09-website-assisted.spec.ts e2e/10-website-rate-limits.spec.ts e2e/11-website-products.spec.ts`; Brokwise checks + full Playwright.
- [ ] Ship: PRs, CI once, Abdul runs `db:setup` (benefits), merge PolicyDesk → live → merge Brokwise; live check of the five items.
