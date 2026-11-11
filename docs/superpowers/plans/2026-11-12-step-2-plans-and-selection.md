# Step 2: Plans and selection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After the full form, a visitor sees car plans with add-ons, picks one, and the choice is saved on their lead in PolicyDesk as a quote with the right total.

**Architecture:** PolicyDesk gets per-plan add-ons, a pure pricing function, two signed endpoints (plans, selection) in `server/website/`, and shows the add-ons on the lead's quote. Brokwise gets `/car/plans` and `/car/selected`, which call those endpoints through the signed client from step 1.

**Tech Stack:** as step 1 (PolicyDesk: Next 15, Drizzle, Zod 4, Vitest, Playwright; Brokwise: Next 16, Tailwind 4, Zod 4, Vitest, Playwright).

**Spec:** `docs/superpowers/specs/2026-11-11-brokwise-design.md` (§5 journey A, §7 endpoints for step 2, §10 step 2).

## Global Constraints

- Approved by Abdul ("Start step 2"; earlier "kuch puchna ki zarurat ni ha"). Same rules as step 1: PolicyDesk work in `~/policydesk-website` on new branch `feat/website-plans` off `origin/main`; never touch `~/policydesk`; never `--no-verify`; follow PolicyDesk `AGENTS.md`; en + ar messages; made-up data only.
- Money: USD whole dollars in PolicyDesk (as today). No tax line. Brokwise shows `$1,234`.
- Only journeys with a **lead** (full form) see plans. Short-form journeys stay with the coordinator.
- Add-on kinds: `included` (always on, price 0), `optional` (off by default), `preselected` (on by default, customer may untick). Total = plan `basePremium` + price of every chosen `optional`/`preselected` add-on.
- **Prices are worked out only in PolicyDesk.** The website sends `planId` and `addOnIds` only.
- One open website selection per lead: picking again **updates** that quote (same reference), it does not add a new one.
- Run touched tests once at the end (Task C1). E2E port: `E2E_PORT=3071` / `POLICYDESK_PORT=3071` (3070 is busy on this machine).
- Live data: PolicyDesk previews and production share one database, so **no migration or data change runs during a build**. Add-ons for the live plans come from an idempotent step in `scripts/setup-db.ts` that Abdul runs from his own terminal (same command as step 1).

## Review Focus

1. **Tampered add-on ids:** an add-on id from another plan, an `included` id, a duplicate id, or an unknown id → 400 `invalid_request` with `field: "addOnIds"`; nothing saved. (A2 unit + A3 E2E.)
2. **Wrong plan:** inactive plan, a non-car plan, unknown id → 400 `field: "planId"`. (A3 E2E.)
3. **Short-form journey opens `/car/plans`:** PolicyDesk answers 409 `no_lead`; the website sends the visitor to `/car/received`. (A3 + B2 E2E.)
4. **Unticking a pre-ticked add-on** lowers the total by its price on both the card and the saved quote. (A2 unit + B2 E2E.)
5. **Re-running the live data step twice** adds no duplicate add-ons. (A1 unit/E2E on a seeded DB.)

---

## Part A — PolicyDesk (`~/policydesk-website`, branch `feat/website-plans`)

### Task A1: Add-ons data

**Files:** Modify `server/db/schema.ts`, `scripts/setup-db.ts`, `constants/products.ts` (or a new `constants/add-ons.ts`); Create migration (`npm run db:generate`), `server/website/catalogue.ts`.

**Interfaces:**
- Table `plan_add_ons`: `id serial pk`, `plan_id int not null → plans.id on delete cascade`, `key text not null`, `name jsonb Localized not null`, `kind text ('included'|'optional'|'preselected') not null`, `price int not null default 0`, `active bool not null default true`, unique `(plan_id, key)`.
- `quotes.add_ons jsonb not null default '[]'` typed `QuoteAddOn[] = { key: string; name: Localized; kind: AddOnKind; price: number }[]` (a snapshot, like `plan_name`).
- `ADD_ON_KINDS = ["included","optional","preselected"] as const`, type `AddOnKind`.
- `CAR_ADD_ONS`: 6 made-up definitions `{ key, name: {en, ar}, price }`: `roadside_assistance` 25, `replacement_car` 60, `driver_accident` 30, `passenger_accident` 45, `windscreen` 35, `regional_cover` 80.
- `ensureCarAddOns(): Promise<number>` in `server/website/catalogue.ts`: for every **active car plan with no add-ons**, inserts a deterministic set (rule below); returns rows inserted. Idempotent.
  - Third-party plans: `driver_accident` optional, `passenger_accident` optional, `roadside_assistance` optional.
  - Comprehensive and agency plans: `roadside_assistance` **included**; `driver_accident` **preselected**; `replacement_car`, `windscreen`, `passenger_accident` optional; `regional_cover` optional only when `(plan.id % 2 === 0)`; agency plans have `replacement_car` **included** instead of optional.
  - Prices as listed; included price is 0.
- `scripts/setup-db.ts`: after `migrate()`, call `ensureCarAddOns()` **always** (also when the database already has data) and print `Car add-ons added: N`.

- [ ] Steps: schema + migration; constants; `ensureCarAddOns`; wire into setup; commit.

### Task A2: Pricing (pure, TDD)

**Files:** Create `server/website/pricing.ts`, `server/website/pricing.test.ts`.

**Interfaces:** `priceSelection(plan: { id: number; basePremium: number }, addOns: { id: number; planId: number; key: string; name: Localized; kind: AddOnKind; price: number; active: boolean }[], chosenIds: number[]): { ok: true; lines: SelectionLine[]; addOns: QuoteAddOn[]; total: number } | { ok: false; field: "addOnIds"; message: string }` where `SelectionLine = { label: string; kind: "plan" | AddOnKind; amount: number }` (label in English: plan line is filled by the caller, so the function returns add-on lines only plus `total`).

- [ ] **Failing tests:** `included add-ons are always on at 0`; `preselected counts only when chosen`; `optional counts when chosen`; `total = base + chosen prices`; `rejects an included id`; `rejects an id of another plan`; `rejects an inactive add-on`; `rejects duplicates`; `rejects unknown ids`.
- [ ] Run → FAIL; implement; run → PASS; commit.

### Task A3: Plans and selection API

**Files:** Create `server/website/plans.ts`, `app/api/website/v1/opportunities/[publicId]/plans/route.ts`, `app/api/website/v1/opportunities/[publicId]/selection/route.ts`, `e2e/07-website-plans.spec.ts`; Modify `server/website/opportunities.ts` (view gets `selection`), `schemas/website.ts` (`websiteSelectionSchema = z.strictObject({ planId: id, addOnIds: z.array(id).max(20) })`).

**Interfaces:**
- `GET …/{publicId}/plans` → 200 `{ plans: WebsitePlan[] }` sorted by `basePremium` ascending, active car plans only, where `WebsitePlan = { id: number; insurer: string; name: string; cover: string; coverLabel: string; excess: number; basePremium: number; benefits: string[]; addOns: { id: number; key: string; name: string; kind: AddOnKind; price: number }[] }` (English labels from `messages/en.json`). 404 unknown; **409 `{error:{code:"no_lead"}}`** when the opportunity has no lead.
- `PUT …/{publicId}/selection` body `websiteSelectionSchema` → 200 `{ selection: WebsiteSelection }`; 400 with `field: "planId"` or `"addOnIds"`; 404; 409 `no_lead`.
  `WebsiteSelection = { quoteReference: string; planId: number; insurer: string; planName: string; cover: string; coverLabel: string; lines: { label: string; kind: "plan" | AddOnKind; amount: number }[]; total: number; addOnIds: number[] }` (`addOnIds` = the chosen optional/preselected ids, so the website can re-tick them).
- Saving: find the lead's quote with `createdBy IS NULL` and status `sent`; update it (plan snapshot, `premium = total`, `addOns`) or insert one with the next `-Q<n>` reference the same way `server/actions/quotes.ts` numbers quotes. Move the lead from `needs_analysis` to `quoted` like the quotes action does. Audit (userId null): `select` on `quote`, `leadId`, details `"<insurer>, <plan> · $<total>"`.
- `WebsiteOpportunityView` gains `selection: WebsiteSelection | null`.

- [ ] **Failing E2E** `07-website-plans.spec.ts`: `full-form lead gets car plans with add-ons, cheapest first`; `short-form opportunity → 409 no_lead`; `selection with an optional add-on saves a quote with the right total`; `selecting again updates the same quote reference`; `unticked preselected add-on lowers the total`; `included add-on id → 400 addOnIds`; `add-on of another plan → 400 addOnIds`; `non-car plan → 400 planId`; `GET opportunity returns the selection`; `lead page shows the quote with its add-ons` (admin, open lead).
- [ ] Implement; commit.

### Task A4: Lead page and KB

**Files:** quote list component on the lead page (find where quotes render), `messages/en.json`, `messages/ar.json`, `docs/09-website-and-online-payments.md`.

- [ ] Under each quote with add-ons: one line per add-on, `Included` for included, price otherwise. Quotes made by the website show "Website" as creator.
- [ ] KB: add the plans and selection endpoints, add-on kinds, pricing rule, "one open website selection per lead", and the live-data step (`db:setup` adds missing car add-ons).
- [ ] Commit.

## Part B — Brokwise (`~/brokwise`, branch `main`)

### Task B1: Client and pricing helper

**Files:** Modify `src/lib/policydesk.ts`; Create `src/lib/money.ts`, `src/lib/plan-total.ts` (+ tests).

**Interfaces:**
- `getPlans(publicId): Promise<{ ok: true; plans: WebsitePlan[] } | { ok: false; status: number; code: string }>`, `saveSelection(publicId, { planId, addOnIds }): Promise<{ ok: true; selection: WebsiteSelection } | { ok: false; status: number; error }>`; `OpportunityView.selection`. Types mirror A3.
- `formatUsd(n: number): string` → `$1,234`.
- `planTotal(plan: WebsitePlan, chosenIds: number[]): number` — display only (the server total is the truth).
- [ ] Tests first: `formats 1234 as $1,234`; `planTotal counts preselected only when chosen`; `planTotal ignores included and unknown ids`.

### Task B2: Pages

**Files:** `src/app/car/plans/page.tsx`, `src/app/car/selected/page.tsx`, `src/app/car/actions.ts` (full form now redirects to `/car/plans`; new `selectPlan` action), `src/components/plan-card.tsx` (client: checkboxes + live total), `e2e/plans.spec.ts`.

- `/car/plans`: no/invalid cookie → `/car`; `no_lead` → `/car/received`. Header contact card as before. Title "Choose your plan", note "Prices are yearly, in US dollars." Cover filter as links `All · Third party · Comprehensive · Agency repair` (`?cover=`). One card per plan: insurer, plan name, cover label, excess, benefits list, add-ons (included: ✓ "Included"; optional/preselected: checkbox with `+$price`, preselected checked), live total, button "Select this plan". When the view already has a selection, that plan's card is marked "Your choice" and its add-ons are re-ticked.
- `selectPlan(formData)`: reads `planId` + `addOnIds[]`, calls `saveSelection`, redirects to `/car/selected`; a 400 shows "That choice is no longer available. Please pick again." on the plans page.
- `/car/selected`: the saved lines (plan, each add-on with "Included" or price), total, quote reference, "Payment opens in the next release. Your coordinator can help meanwhile.", "Change plan" → `/car/plans`.
- Mobile first, no `max-*` variants, keyboard-usable checkboxes, demo notice on `/car/plans`.
- [ ] **E2E** `e2e/plans.spec.ts`: `full form → plans page lists plans cheapest first`; `pick a plan with an optional add-on → selected page shows the same total as the card`; `untick a pre-ticked add-on → total drops by its price`; `change plan keeps one quote reference`; `short-form journey opening /car/plans goes to /car/received`.
- [ ] Update `docs/kb/README.md` (journey A now reaches plans) and `README.md` if routes are listed. Commit.

## Part C — Finish

### Task C1: Tests once
- [ ] PolicyDesk: `npm run check`; `E2E_PORT=3071 npm run test:e2e -- e2e/06-website-api.spec.ts e2e/07-website-plans.spec.ts`.
- [ ] Brokwise: `npm run lint && npm run typecheck && npm test`; `POLICYDESK_PORT=3071 npx playwright test` (delete `~/policydesk-website/.pglite-e2e` first if PGlite aborts).

### Task C2: Ship
Order matters, because the new PolicyDesk code reads the new columns and the new website calls the new endpoints:
- [ ] 1. Push the PolicyDesk branch, open a PR, check CI once.
- [ ] 2. Abdul runs the migration + add-ons step from his terminal **before the merge** (`db:setup` from `~/policydesk-website` on the new branch; additive, so the live code keeps working); it prints `Car add-ons added: N`.
- [ ] 3. Merge the PR; wait until the live API answers the plans route (401 unsigned instead of 404).
- [ ] 4. Push Brokwise `main` (Vercel deploys it).
- [ ] Live test: full form on brokwise.vercel.app with made-up details → pick a plan + add-on → `/car/selected` total matches the quote on the lead in PolicyDesk.
