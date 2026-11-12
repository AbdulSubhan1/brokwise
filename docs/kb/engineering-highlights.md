# Engineering highlights

What this project does beyond "it works", and why. Three systems: **Brokwise** (public
website), **PolicyDesk** (the broker's CRM) and **PaySandbox** (the payment gateway). Each item
below says the decision, why it matters in a real broker, and where it lives and is tested.

## Architecture decisions

| Decision | Why | Where |
| --- | --- | --- |
| **The website has no database.** It calls PolicyDesk's API for everything. | The marketing site will grow large (SEO, many products) and should never hold customer data, money logic or database credentials. One source of truth, nothing to keep in sync. | `src/lib/policydesk.ts` |
| **An API, not a shared database.** | Business rules (statuses, audit trail, scopes, pricing) stay in one place. A CRM schema change can't silently break the website. | PolicyDesk `app/api/website/v1/**` |
| **No middle API server (yet), with written triggers.** | A CAPI-style service was considered and deferred: one website and one product don't justify a third app. The website and payment logic sits in its own folders (`server/website/`, `server/payments/`) that never import UI, so it can be lifted out by moving folders. Triggers: a second app needs the API, a real pricing engine arrives, or payments grow (split payments). | `future-scope.md`, design §4 |
| **A broker, not a car site.** | Every API call carries `product`; product fields are a per-product schema in one `details` column; URLs are `/car/…`. A new line of business adds a schema and pages, not tables. Nothing is car-only by accident, and no generic engine is built before the second product. | design §4 |
| **Config-driven lines of business (step 6).** | When travel, home and health arrived, the car pages became one set of `/[lob]` pages driven by a config per line (forms as data, covers, `buildDetails`). A fifth line is a config file plus a PolicyDesk schema; no page, action or test helper is copied. A journey that strays to another line's URL is sent back to its own line. | `src/lobs/`, `src/app/[lob]/`, `lobs.test.ts`, `lobs.spec.ts` |
| **Instant navigations under Cache Components (step 6).** | The four lines are prerendered, but each page reads its line from the URL inside `<Suspense>`, so Next can serve a shared App Shell on any client navigation; the journey cookie's expiry check waits for the request (`connection()`), so no clock value leaks into a prerender. The dev server's instant-navigation validation reports no errors. | `src/app/[lob]/`, `src/lib/journey.ts` |
| **Rules mirrored, not trusted (step 6).** | Each product's rules (travel dates, owners-only building value, family-only children, age ranges) run in the browser's form and again in PolicyDesk; hidden fields are never sent, and PolicyDesk's rule codes come back as sentences under the right field. | `src/lib/schemas.ts`, `travel-dates.test.ts` |
| **A home page that remembers the visitor, without slowing anyone down (home redesign).** | The home page's quote card shows the visitor's own journey (their cheapest plans, the plan they chose, their payment or their call-back) and an example otherwise. Which card to show is one pure function (`resumeCardFor`), tested for every journey state and every failure; the component only reads the cookie and calls PolicyDesk with the calls the journey pages already use, in parallel and only the ones the state needs. The cookie read makes the card request-time, so it sits in `<Suspense>` behind a skeleton of the same size: the rest of `/` stays a prerendered static shell, and nothing moves when the card arrives. Any failure (bad cookie, PolicyDesk down, an unexpected answer) quietly shows the example, so a back-office outage never breaks the home page. The example uses real catalogue plans for PolicyDesk's typical driver, labelled as an example. | `src/lib/resume-card.ts`, `src/components/resume-card.tsx`, `resume-card.test.ts`, `e2e/home.spec.ts` |
| **A written exception to the CRM's "no API routes" rule.** | PolicyDesk's standard bans API routes and its AI reviewer enforces it. The exception names exactly two route groups, so the rule stays meaningful. | PolicyDesk `AGENTS.md` |

## Security

| What | Detail | Tested by |
| --- | --- | --- |
| **Signed server-to-server calls** | HMAC-SHA256 over `timestamp.METHOD.path.body`, 5-minute window both ways, constant-time compare, raw body. Both repos assert the **same fixed test vector**, so the two copies of the signer can't drift apart. | `signature.test.ts` in both repos; spec 06 |
| **Strict input** | Zod `strictObject` on both sides: unknown keys are rejected and named (`field: "coordinatorId"`), size caps (16 KB API, 64 KB webhook). | spec 06 |
| **Prices only on the server** | The browser sends `planId` and add-on ids, never amounts. Tampered ids (another plan's add-on, an included one, duplicates) are refused. | `pricing.test.ts`; spec 07 |
| **No guessable ids** | UUIDs in every URL; the journey lives in a signed, http-only cookie; a forged cookie sends you back to the start. | `leads.spec.ts` |
| **Payment links** | 256-bit random tokens, **stored only as SHA-256**, shown once, 72 h, a new link revokes the old one. Unknown and revoked tokens get the **same 404**, so the API doesn't reveal which links exist. | `pay-links.test.ts`; spec 09 |
| **Rate limits** | Per visitor IP and endpoint group, fixed hourly window, one Postgres upsert per call. Unsigned calls are refused **before** they are counted, so spam can't fill the table. The webhook is never limited. `Retry-After` on 429. | `rate-limit.test.ts` (real SQL on in-memory Postgres); spec 10 |
| **Bot check** | Cloudflare Turnstile, verified on the server **before** anything reaches the CRM; a fresh token after each try (tokens are single-use); off until both keys are set, so it can ship before the account exists. | `actions.test.ts`, `turnstile.test.ts` |
| **Real 404 status (step 7)** | Under Cache Components a `/[lob]` page streams before it can call `notFound()`, so `/boat/details` showed the 404 page with HTTP 200. A Next 16 proxy checks the first path segment (`isKnownTopLevel`) and rewrites paths that aren't ours to Next's own prerendered 404 page with `status: 404`; known routes, Next internals and files pass untouched, and the security headers still apply. A page of our own would not do: a prerendered page keeps the 200 it was built with. | `top-level-routes.test.ts` (also checks every line and `src/app` folder is known); `lobs.spec.ts` |
| **Headers** | `frame-ancestors 'none'` + `X-Frame-Options: DENY` (no clickjacking), `nosniff`, strict referrer, HSTS, Permissions-Policy. | `hardening.spec.ts` |
| **Privacy** | The thank-you page shows masked email and phone only. Demo pages say "use made-up details". | `payment.spec.ts` |
| **Answers kept, encrypted, in the visitor's browser (plans redesign)** | PolicyDesk's API doesn't return a lead's details and the website has no database, so the plans page's summary and "Edit details" read the full form's answers from a `bw_answers` cookie. It holds a name, email and mobile, so it is a JWE (A256GCM, key derived from the journey secret with SHA-256), not a readable signed token; it is http-only, expires with the journey and only counts for the journey id and line it was written for. No new setting, no new package (`jose` already signs the journey). | `actions.test.ts`, `e2e/plans.spec.ts` |
| **Secrets never in chat or code** | Database URLs and keys are entered by the owner in his own terminal (`read -s`) or in Vercel; the code only reads env names. | process |

## Design system and accessibility (step 6)

| What | Detail | Tested by |
| --- | --- | --- |
| **A small design system** | `src/components/ui/`: Select, DateField, RadioCards, Stepper, Badge, Card, SectionHeading, shared focus and button styles. Every form is drawn from these, so the four lines look and behave the same. | `date-field.test.ts`, `stepper.test.ts` |
| **Native controls under the styling** | Selects stay native selects (phone pickers, screen readers); choice cards are real radios stretched over the card; dates are three labelled selects in a fieldset, still sent as one ISO value, and rebuilt on the server when JavaScript is off. | `actions.test.ts`, e2e specs |
| **Accessible by default** | Decorative icons `aria-hidden`; icon-only buttons labelled; visible focus rings; the progress bar marks `aria-current="step"`; the mobile menu is a modal `<dialog>` (focus trap, Escape); motion respects reduced-motion; mobile-first layouts with no `max-*` breakpoints. | review, `stepper.test.ts` |
| **Errors you can act on** | An error summary takes focus after a failed send and links each mistake to its field; required messages are derived from each field's label in the line config, not hand-written per line; plan buttons have unique accessible names with plan and price. | `lobs.test.ts`, `actions.test.ts`, `e2e/leads.spec.ts`, `e2e/plans.spec.ts` |
| **One row, three widths, no breakpoint juggling (plans redesign)** | The plan row is a flex-wrap with the design's own bases (`1 1 240px`, `2 1 340px`, price `margin-left: auto`), so at tablet width the price and Select drop to a second line by themselves; only the phone card is a separate base layout. The sort, cover and "only" checkbox live in the URL; with JavaScript they navigate in place, without it they are a plain GET form. A cover can be `within` another in the line config, so "Agency repair only" is config, not a car special case. | `plan-list.test.ts`, `e2e/plans.spec.ts` |
| **Disclosures, not hover (plans redesign)** | The header contact card opens on click or keyboard only and closes on a click outside or Escape (focus back on the badge); plan extras are a button with `aria-expanded` whose collapsed ticks still count. Hover-only menus fail touch and keyboard users. | `e2e/plans.spec.ts`, `e2e/leads.spec.ts` |
| **Config decides the wording** | How long a price runs (a year, or one trip) is a property of the cover in `src/lobs`, so the plan cards, the plans note and the payment total follow it with no per-page checks. | `lobs.test.ts`, `e2e/lobs.spec.ts` |

## Payments

| What | Detail | Tested by |
| --- | --- | --- |
| **Idempotent checkout** | Each order uses `Idempotency-Key: order-<id>` at PaySandbox; pressing Pay twice reuses the open session instead of creating a second charge. | spec 08 |
| **Changed mind after checkout** | A new selection expires the old pending order. A payment that still arrives on the old session is recorded and audited on its own order but never overwrites the newer choice; booking only applies a paid order whose amount matches the quote. | spec 08 |
| **Verified, de-duplicated webhooks** | Standard Webhooks signatures; each `webhook-id` handled once (a table, insert-on-conflict). If handling fails, the row is removed and 500 is returned so the gateway's retry is processed, not skipped. | `webhook.test.ts`; spec 08 |
| **Late webhook resilience** | If the customer is back before the webhook, the order read asks PaySandbox for the session and settles it (pull reconciliation). The thank-you page waits up to 30 s. | spec 08, `payment.spec.ts` |
| **Failures are first-class** | `payment.failed` is audited with the decline code. Proven live: an "insufficient funds" card left the order pending and logged the reason, then a good card paid. | live test, lead CAR-8FSMAZC |
| **Line items, not just a total** | Plan, each included add-on at $0, each paid add-on; the gateway's checkout shows exactly what the customer chose. | live checkout |
| **Currency without conversion** | The gateway project is USD to match the CRM; amounts move as cents, never through an exchange rate. | design §8 |

## Business rules that match a real broker

- **Two journeys, one rule:** self-serve (full form, pay at once) and assisted (short form,
  coordinator calls, sends a pay link). The coordinator owns everything before payment; the
  advisor is assigned **after** payment.
- **Automatic assignment, no manual work:** active and available people of the right role in the
  product's department; fewest open records wins, then whoever waited longest, then lowest id.
  The reason is written on the timeline ("fewest open"). If nobody is available, the website shows
  a help-desk card instead of a person.
- **Compliance stays intact:** online payment comes before KYC and documents, but the policy is
  still only booked after them; booking then marks it paid "Online (PaySandbox)" automatically.
  The four-eyes rule (who submits KYC can't approve it) is respected in the tests too.
- **One open online choice per lead:** choosing again updates the same quote and reference.
- **History stays true:** quotes copy the plan and add-ons at the time (snapshots), so editing a
  plan later never changes what a customer was offered or paid.
- **Everything is audited:** every website and system action appears on the lead timeline with
  "Website" as the actor.

## Delivery and quality

- **Small steps, each live before the next** (leads → plans → payment → assisted → hardening),
  each with its own design section, plan, tests and live check with made-up data.
- **Zero-downtime database changes:** every migration is additive and runs **before** the merge,
  so the running code never sees a missing column.
- **Preview deployments share the production database**, so migrations never run during a build
  (a PR preview must not change live data). Rollout order: CRM API first, website second.
- **A fake payment gateway for tests:** a small Node server speaks PaySandbox's API, hosted
  checkout and signed webhooks, so the whole flow (including "webhook never arrives") runs in E2E
  without touching the live gateway or its daily limits.
- **Cross-repo end-to-end tests:** the website's tests drive the CRM's real screens (coordinator
  completes details, converts, creates a pay link) and then pay through the website.
- **Test-first for logic** (signing, pricing, assignment, pay links, rate limits, travel dates, date
  selects, the progress bar, each line's `buildDetails`), and only the
  touched specs run, once per step.
- **Honest CI:** a lockfile written by a newer npm broke `npm ci` on CI's npm; it is regenerated
  with the CI's npm version instead of loosening CI.
- **Guardrails respected:** changes go through worktrees and pull requests; protected `main` is
  never edited directly, and git hooks are never skipped.

## Monitoring (Pulse)

Brokwise reports to [Pulse](https://github.com/AbdulSubhan1/monitor), my small monitor for all my live projects.

| What | Detail | Where |
| --- | --- | --- |
| **Page views and browser errors** | One `next/script` tag (`afterInteractive`): cookie-free, no ids, paths without query strings. | `src/app/layout.tsx` |
| **Named events** | `callback_requested` on the request-received page, `payment_succeeded` on the paid thank-you page. An event fired before the beacon loads waits in its queue. | `src/components/pulse-event.tsx` |
| **Every server error** | Next.js `onRequestError` sends the error, route and digest with no code in each route. | `src/instrumentation.ts` |
| **A key log per lead** | "Lead submitted" with product and form, sent with `after()` so the visitor never waits. | `src/app/[lob]/actions.ts` |
| **Can't break the site** | Off until `MONITOR_LOG_TOKEN` is set; 2-second timeout; every failure ignored. The token is this site's own, so it can't write logs as another project. | `src/lib/pulse.ts`, `pulse.test.ts` |

## Numbers (end of step 5)

| | Unit tests | End-to-end tests |
| --- | --- | --- |
| PolicyDesk website/payments work | 46 | 47 (specs 06–10) |
| Brokwise | 53 | 22 |
