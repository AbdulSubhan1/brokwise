# Step 6: More lines of business + a finished UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Brokwise sells **Travel, Home and Health** next to Car, through one config-driven journey engine, and the whole site looks finished: icons, a real header and footer, a progress bar, styled controls, and clearer plan cards.

**Architecture:** PolicyDesk generalises the website API from `car` to a list of website products, each with its own details schema and add-on catalogue (same tables). Brokwise moves from hard-coded `/car/*` pages to `/[lob]/*` pages driven by one config file per line of business; `/car/*` URLs keep working because `car` is just one slug.

**Tech Stack:** as before, plus `lucide-react` (icons) in Brokwise.

**Spec:** `docs/superpowers/specs/2026-11-11-brokwise-design.md` §4 ("a multi-line broker, car first": a new line adds a schema and pages, not tables; the generic engine is built when the second line arrives — now).

## Global Constraints

- Approved by Abdul ("car ka ilawa bhi or LOB add karo … UX UI bhi better karo, icons use karo, UI ko thora finished karo"). Lines chosen **[my call]**: `travel`, `home`, `health` (already PolicyDesk products with departments, coordinators and seeded plans). Business stays later.
- Branches stack on step 5: PolicyDesk `feat/website-more-lobs` (from `feat/website-rate-limits`) in `~/policydesk-website`; Brokwise `feat/step-6-lobs-ui` (from `feat/step-5-hardening`) in worktree `~/brokwise-step2`. Never edit `~/brokwise` or `~/policydesk`; never `--no-verify`; if a hook blocks a tool, stop and report. After any npm install: `npx -y npm@10 install --package-lock-only`.
- Everything made up. Keep the existing palette and fonts; no InsuranceMarket.ae look or office design system.
- Accessibility: every icon is decorative (`aria-hidden`) unless it is the only content of a control (then it has a label); keyboard and focus styles everywhere; mobile first, no `max-*` variants.
- Tests once at the end. Ports as before (PolicyDesk 3071, fake PaySandbox 3072, Brokwise 3100).
- Live: additive migration + data step (`db:setup`, Abdul) before the PolicyDesk merge; merge order step 5 → step 6.
- Each new engineering decision is added to both **engineering-highlights** pages (Abdul's rule).

## The three new lines (shared by both repos)

| Product | Quick form (call me back) | Full form (get prices) |
| --- | --- | --- |
| `travel` | name, email, mobile, destination region | destination region (`gcc`, `asia`, `europe_schengen`, `worldwide_ex_us`, `worldwide`), trip type (`single`, `annual`), start date, end date (single trips; ≤ 180 days; start ≥ today), travellers (1–9), oldest traveller's age (0–85) |
| `home` | name, email, mobile, city | property type (`apartment`, `villa`, `townhouse`), you are the (`owner`, `tenant`), city, building value USD (owners only, 10,000–5,000,000), contents value USD (1,000–500,000) |
| `health` | name, email, mobile, people to cover | who is covered (`me`, `me_spouse`, `family`), number of children (0–6, family only), your date of birth (age 18–75), city, any pre-existing condition (yes/no) |

Common to every full form: full name, date of birth where the line asks for it, email, mobile (as today).

Add-ons (made-up, prices USD, kinds per the step 2 rule — included / optional / preselected):
- **travel:** `trip_cancellation` 25 (optional; included on `annual_multi_trip`), `baggage_delay` 10 (preselected), `adventure_sports` 30 (optional), `covid_cover` 15 (optional).
- **home:** `accidental_damage` 40 (optional), `valuables_away` 35 (optional), `alternative_accommodation` 25 (included on `building_contents`, else optional), `domestic_helper` 20 (preselected).
- **health:** `dental` 90 (optional), `optical` 60 (optional), `maternity` 150 (optional), `wellness_checkup` 0 → **included** on every health plan.

## Review Focus

1. **A product the website doesn't sell** (`bike`, `life`, …) or a missing/foreign field for the chosen product → 400 with the field; nothing written. (A1 E2E.)
2. **Leads route to the right department:** travel and home → `home_travel` coordinators, health → `health`, car → `motor_marine`; advisors after payment likewise. (A1 E2E.)
3. **Travel dates:** end before start, start in the past, more than 180 days, or end date on an annual trip → field error, on both sides. (A1 unit + B2 unit.)
4. **Unknown LOB slug** (`/boat/details`) → 404 page with links to the four lines; old `/car/*` URLs still work. (B3 E2E.)
5. **Plans for one product never show another product's plans or add-ons**; prices still come only from PolicyDesk. (A1 E2E.)

---

## Part A — PolicyDesk (`~/policydesk-website`, branch `feat/website-more-lobs`)

### Task A1: Website products

**Files:** `constants/website.ts` (new: `WEBSITE_PRODUCTS = ["car", "travel", "home", "health"] as const`), `schemas/website.ts` (`detailsSchemaFor(product)` with the table above; `websiteOpportunitySchema` takes `product: z.enum(WEBSITE_PRODUCTS)` and validates `details` with that product's schema, quick vs full required fields per the table), `constants/add-ons.ts` (catalogues for the three products), `server/website/catalogue.ts` (`ensureAddOns()` for every website product, idempotent; keep `ensureCarAddOns` as a wrapper or rename everywhere), `scripts/setup-db.ts` (call it; print `Add-ons added: N`; give made-up `+92300111xxxx` phones to the seeded health and home_travel coordinators/advisors), migration with `UPDATE users SET phone = … WHERE email IN (…)` for `kamran@`, `zain@`, `mehwish@`, `tariq@`; opportunity page: the details panel/form renders the right fields per product (labels in en + ar); `isWebsiteCarOpportunity` becomes `isWebsiteOpportunity` for the four products (keep the bike/life seed opportunities on today's screens — they are not website products); coordinator details form and convert check per product; plans endpoint filters by the opportunity's product (already), and `coverLabel` for the new covers.
- [ ] Unit tests: `travel end before start is refused`; `travel annual ignores end date`; `home tenant needs no building value`; `health children only for family`; `unknown product refused`.
- [ ] **E2E** `e2e/11-website-products.spec.ts`: one test per product creating a full-form lead and checking the department's coordinator; `plans for travel are travel plans with travel add-ons`; `bike is refused`; `health payment assigns a health advisor` (through the fake PaySandbox, like spec 08).
- [ ] KB: `docs/09` (products table, add-ons), `docs/10-engineering-highlights.md` (config-driven products). Commit per logical piece.

## Part B — Brokwise (`~/brokwise-step2`, branch `feat/step-6-lobs-ui`)

Load the `frontend-design:frontend-design` skill before Task B1 for design direction; keep the existing palette.

### Task B1: Design system pieces

**Files:** `src/components/ui/*` (new small set): `Icon` usage via `lucide-react`; `Select` (styled native select with a chevron icon, keeps native accessibility); `DateField` (three selects Day / Month / Year with one hidden ISO value; `min`/`max` years per field); `RadioCards` (big tappable options with an icon, for yes/no and choices like trip type); `Stepper` (Fill details → Choose plan → Pay → Done, current step highlighted, `aria-current="step"`, text labels visible on desktop, compact on mobile); `Badge`; `Card`; `SectionHeading` (fixes the legend sitting on the border).
- [ ] Unit tests: `DateField builds 1995-11-15`; `DateField refuses 31 February`; `Stepper marks the current step`.

### Task B2: Config-driven lines of business

**Files:** `src/lobs/{car,travel,home,health}.ts` + `src/lobs/index.ts` (`LobConfig = { slug; product; title; tagline; icon; quickFields; fullSections; buildDetails(form) ; summary(details) }`), routes `src/app/[lob]/{page,quick,details,received,plans,selected,payment,thank-you}` (move the `/car/*` pages here; `generateStaticParams` for the four slugs; unknown slug → `notFound()`), `src/lib/schemas.ts` (per-product Zod mirrors of the A1 table), `src/lib/policydesk.ts` (`product` from the config), `src/app/pay/[token]/route.ts` (redirect to `/<lob>/payment` using the opportunity's product), journey cookie unchanged (one journey at a time).
- [ ] Unit tests: travel date rules (Review Focus 3) and `buildDetails` per product.

### Task B3: Finished UI

**Files:** `src/components/site-header.tsx` (logo, "Insurance" menu with the four lines + icons, help phone, contact card on the right; mobile: a menu button opening a sheet), `site-footer.tsx` (four lines, company links as text, help desk, "Payments by PaySandbox · test mode", demo disclaimer), `src/app/page.tsx` (hero with an icon composition, the four lines as icon cards — no "Coming soon", a "How it works" row with 3 icon steps, a trust strip with icons), `src/app/[lob]/page.tsx` (line landing: what's covered with check icons, two choices "Get prices now" / "Call me back"), every journey page gets the `Stepper`; forms use the new controls and section headings with icons; plan cards: insurer badge (coloured initials), cover badge, benefits with check icons, add-ons in a collapsible "Add-ons (n)" with the count of ticked ones, tags **Cheapest** (lowest price) and **Best value** (cheapest comprehensive-type cover for the line) **[my call]**, a sticky total bar on mobile; payment page: lock icon, "Secured by PaySandbox (test mode)" note; thank-you: big success icon, order card, "What happens next" as a 3-step vertical timeline; `not-found.tsx` with the four lines.
- [ ] **E2E** `e2e/lobs.spec.ts`: `travel full journey → plans → pay (fake) → thank-you with a home_travel advisor`; `home call me back → received shows a home_travel coordinator`; `health plans show the included wellness check-up`; `unknown line → 404 with links`; `old /car/details still works`; plus update existing specs for the new controls (DateField, RadioCards) — keep their test names.
- [ ] Docs: `docs/kb/README.md` (lines, engine), `docs/kb/engineering-highlights.md` (config-driven lines, design system, accessibility), `README.md`. Commit per task.

## Part C — Finish

- [ ] **C1 tests once:** PolicyDesk `npm run check`; `E2E_PORT=3071 npm run test:e2e -- e2e/06-website-api.spec.ts e2e/07-website-plans.spec.ts e2e/08-website-payments.spec.ts e2e/09-website-assisted.spec.ts e2e/10-website-rate-limits.spec.ts e2e/11-website-products.spec.ts`; Brokwise lint/typecheck/test/build + `POLICYDESK_PORT=3071 POLICYDESK_DIR=../policydesk-website npx playwright test`. Screenshots of home, a form, plans and thank-you on mobile and desktop for Abdul.
- [ ] **C2 ship (after step 5 is merged):** PRs; CI once; Abdul runs `db:setup` (adds add-ons and phones); merge PolicyDesk → live → merge Brokwise.
- [ ] **C3 live check:** one journey per new line on brokwise.vercel.app with made-up data (Abdul pays with the 4242 card for one of them).
