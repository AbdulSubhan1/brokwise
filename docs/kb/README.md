# Brokwise knowledge base

Brokwise is a made-up insurance broker's public website. It sells many lines of business over time;
only **car** is built today. It is a demo merchant for PaySandbox (a fake payment gateway) and uses
PolicyDesk (an insurance CRM) as its back office. All people, insurers and numbers are made up.

Pages in this folder:
- this overview: what Brokwise is, the three systems, the journeys and what steps 1 and 2 ship;
- [future-scope.md](future-scope.md): what is planned later and what triggers it.

The full design is in [`docs/superpowers/specs/2026-11-11-brokwise-design.md`](../superpowers/specs/2026-11-11-brokwise-design.md).

## The three systems

```mermaid
flowchart LR
  V[Visitor's browser] --> W[Brokwise website<br/>no database]
  W -- signed server-to-server calls --> C[PolicyDesk<br/>CRM + all data]
  C -- sk_test_ API key --> P[PaySandbox]
  V -- hosted checkout --> P
  P -- signed webhook --> C
  S[Coordinators / advisors] --> C
```

| System | Owns |
| --- | --- |
| **Brokwise website** (this repo) | Marketing and journey pages, forms, the plans page, and later the payment and thank-you pages. Stores nothing except a signed journey cookie. |
| **PolicyDesk** | All data: opportunities, leads, plans, orders, payments, automatic assignment and the audit timeline. The private website API. The only holder of the PaySandbox key. |
| **PaySandbox** | Checkout sessions, hosted checkout, payment events and webhooks. |

The website never writes to PolicyDesk's database. Every call goes to PolicyDesk's private API under
`/api/website/v1/`, signed with a shared secret:

- headers `x-brokwise-timestamp` (unix seconds) and `x-brokwise-signature` (lowercase hex);
- signature = HMAC-SHA256(`WEBSITE_API_SECRET`, `${timestamp}.${METHOD}.${pathAndQuery}.${rawBody}`);
- PolicyDesk refuses a request that is unsigned, wrongly signed, or more than 5 minutes off its clock.

The code is in `src/lib/signature.ts` (signing) and `src/lib/policydesk.ts` (the client).

## Journeys

**A. Self-serve ("Get prices now")**
1. The visitor fills the full form (car, driver, contact). PolicyDesk creates the opportunity and the
   lead together and assigns a coordinator automatically.
2. The visitor goes straight on to the car plans, ticks add-ons and picks one. PolicyDesk prices the
   choice and saves it on the lead as a quote (step 2).
3. Later steps: a payment page through PaySandbox, and a thank-you page with the advisor assigned
   after payment.

**B. Assisted ("Call me back")**
1. The visitor fills the short form (name, mobile, email, car make, model, year). PolicyDesk creates the
   opportunity only and assigns a coordinator automatically.
2. Later steps: the coordinator completes the details in PolicyDesk, converts it to a lead and sends a
   private payment link.

One rule for both: the coordinator owns everything before payment; the advisor comes in after payment.

## What step 1 ships

| Page | What it does |
| --- | --- |
| `/` | Home: lines of business as cards (only Car is active), a made-up trust strip. |
| `/car` | Choice between "Get prices now" (full form) and "Call me back" (short form). |
| `/car/quick` | Short form. |
| `/car/details` | Full form. |
| `/car/received` | "Request received": lead reference (full form), next steps, and the coordinator card in the header, or the help desk card when nobody is available. |

Every form page shows: "Demo site: use made-up details. Payments are in PaySandbox test mode."

**Journey cookie.** After a form is sent, the website stores the opportunity's public id in the
`bw_journey` cookie: a signed (HS256) token, http-only, `SameSite=Lax`, secure in production, valid
for 7 days. `/car/received` reads it; when it is missing or forged the visitor goes back to `/car`
and PolicyDesk is not called.

**Errors.** When PolicyDesk rejects a field, the error is shown under that field. Any other failure
(PolicyDesk down, slower than 8 seconds) shows "We couldn't send your request. Please try again."

**Automatic assignment** happens in PolicyDesk: among active and available coordinators in the car
department, the one with the fewest open records; ties go to the one assigned longest ago. When nobody
is available, the website shows the Brokwise help desk instead of a person.

## What step 2 ships

| Page | What it does |
| --- | --- |
| `/car/details` | After the full form, the visitor goes to `/car/plans` (it used to be `/car/received`). |
| `/car/plans` | "Choose your plan": the car plans, cheapest first, with a cover filter (All · Third party · Comprehensive · Agency repair, as `?cover=`). Each card shows the insurer, plan, cover, excess, benefits, add-ons and a live total, and a "Select this plan" button. |
| `/car/selected` | The saved choice: plan line, each add-on ("Included" or its price), the total, the quote reference and "Change plan". Payment comes in the next release. |
| `/car/received` | For a full-form journey it now links to the plans. |

**Add-ons.** Each plan has its own add-ons, of three kinds:
- *included*: always on, shown with a tick and "Included", no price;
- *optional*: a checkbox, unticked at first, with its price (`+$35`);
- *pre-ticked*: a checkbox, ticked at first; the visitor may untick it.

The card total is the plan price plus every ticked add-on. It is for display only: the form sends just
the plan id and the ticked add-on ids, and **PolicyDesk works out the price itself**. Prices are yearly,
in whole US dollars (`$1,234`), with no tax line.

**One choice per journey.** Picking again (via "Change plan") updates the same quote in PolicyDesk, so
the quote reference stays the same. When the visitor comes back to `/car/plans`, the saved plan is
marked "Your choice" and its add-ons are ticked again.

**Who sees plans.** Only full-form journeys have a lead, so only they see plans. A short-form journey
that opens `/car/plans` goes to `/car/received` (PolicyDesk answers `409 no_lead`). No or a forged
cookie goes to `/car`, as before.

**Errors.** If a plan or add-on changed since the page was drawn (PolicyDesk answers 400), the plans
page shows "That choice is no longer available. Please pick again." If PolicyDesk can't be reached, it
shows "We couldn't save your choice. Please try again."

**API calls** (signed as in step 1): `GET /opportunities/{publicId}/plans` and
`PUT /opportunities/{publicId}/selection` with `{ planId, addOnIds }`. `GET /opportunities/{publicId}`
now also returns the saved `selection`.
