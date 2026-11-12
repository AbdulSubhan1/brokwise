# Brokwise

Brokwise is a made-up insurance broker's website selling car, travel, home and health insurance. It is the demo merchant for
PaySandbox (a fake payment gateway) and uses PolicyDesk (an insurance CRM) as its back office. Every
person, insurer and number on it is made up.

The website has no database. Its forms call PolicyDesk's private website API with signed
server-to-server requests; PolicyDesk stores the opportunity (and, for the full form, the lead) and
assigns a coordinator automatically. Payment goes through PaySandbox's hosted checkout: PolicyDesk
creates the checkout session and receives PaySandbox's webhook, then assigns an advisor. The visitor's
journey is kept in a signed, http-only cookie. A "Call me back" customer pays through a private payment link that their
coordinator creates in PolicyDesk.

Every line of business (`car`, `travel`, `home`, `health`) has the same pages, driven by one config file
per line in `src/lobs/`:

- `/` home, with the four lines of business
- `/<line>` choose between "Get prices now" and "Call me back", with what the line covers
- `/<line>/details` full form (creates an opportunity and a lead), then on to the plans
- `/<line>/quick` short form (creates an opportunity)
- `/<line>/received` request received, with the assigned coordinator in the header
- `/<line>/plans` "N plans for your Corolla": what was quoted with "Edit details", sort and cover filter, one row per
  plan with its extras on request and a live price (full-form journeys only)
- `/<line>/payment` "Review and pay": the saved plan and add-ons, priced by PolicyDesk, with the quote reference,
  "Change plan", and the terms box; "Pay" opens PaySandbox's hosted checkout (`/<line>/selected` redirects here)
- `/<line>/thank-you` the paid order and the advisor assigned after payment (or "Confirming your payment…")
- `/pay/<token>` a coordinator's private payment link ("Call me back" journeys): opens the line's payment page, or
  its thank-you page once paid; `/pay/expired` and `/pay/invalid` when it can't be used

Any other line (`/boat`) is a "page not found" with links to the four lines.

More in [`docs/kb/`](docs/kb/README.md) and the design in [`docs/superpowers/specs/`](docs/superpowers/specs/2026-11-11-brokwise-design.md).

## Run it locally with PolicyDesk

You need PolicyDesk with the website API (four products: branch `feat/website-more-lobs`) running next to Brokwise.

1. Start PolicyDesk on port 3070 with a website secret. To pay, also give it PaySandbox settings
   (a PaySandbox `sk_test_` key and webhook secret, or PolicyDesk's fake PaySandbox as below) and
   where Brokwise runs, so PaySandbox can send the visitor back:

   ```bash
   cd ../policydesk-website
   E2E_PORT=3070 node e2e/fake-paysandbox.mjs &   # optional fake PaySandbox on 3072, see that file for its settings
   WEBSITE_API_SECRET=dev-secret \
   PAYSANDBOX_API_URL=http://localhost:3072/api/v1 PAYSANDBOX_SECRET_KEY=sk_test_e2e \
   PAYSANDBOX_WEBHOOK_SECRET=whsec_... WEBSITE_URL=http://localhost:3000 \
   npm run dev -- -p 3070
   ```

   Without `PAYSANDBOX_SECRET_KEY`, PolicyDesk answers `payments_disabled` and the payment page says
   payments are unavailable. Brokwise itself needs no PaySandbox settings.

2. Set up Brokwise:

   ```bash
   npm install
   cp .env.example .env.local   # then set the values below
   npm run dev                  # http://localhost:3000
   ```

## Environment variables

| Name | What it is |
| --- | --- |
| `POLICYDESK_API_URL` | Where PolicyDesk runs, e.g. `http://localhost:3070`. |
| `WEBSITE_API_SECRET` | Shared secret that signs every call to PolicyDesk. Same value as `WEBSITE_API_SECRET` in PolicyDesk (`dev-secret` in the example above). |
| `JOURNEY_COOKIE_SECRET` | Signs the `bw_journey` cookie. At least 32 characters. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Optional. Cloudflare Turnstile site key for the "not a bot" check on the quick and full forms. |
| `TURNSTILE_SECRET_KEY` | Optional. Cloudflare Turnstile secret key; the form actions verify each token with it before calling PolicyDesk. |

The app checks the first three when it first needs them and stops with a clear message if one is missing.
Turnstile is on only when **both** Turnstile keys are set; with either one empty the forms show no check and load
nothing from Cloudflare. Redeploy after adding them (the pages read the site key at build time). For local testing,
Cloudflare's test site key `1x00000000000000000000AA` with secret `1x0000000000000000000000000000000AA` always passes,
and secret `2x0000000000000000000000000000000AA` always fails.

## Security

- Every response carries `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and
  `Permissions-Policy: camera=(), microphone=(), geolocation=()`; production also sends
  `Strict-Transport-Security: max-age=63072000; includeSubDomains` (`next.config.ts`).
- The full form's answers are kept in an encrypted, http-only `bw_answers` cookie (AES-256-GCM, key derived from
  `JOURNEY_COOKIE_SECRET`, 7 days) for the plans page's summary and "Edit details". It holds the visitor's name,
  email and mobile, so it is encrypted, not just signed; it only counts for the journey and line it was written for.
- Each call to PolicyDesk carries the visitor's IP in `x-brokwise-client-ip` (first `x-forwarded-for` address, else
  `x-real-ip`, else `unknown`). PolicyDesk limits requests per IP per hour and answers 429; the website then shows
  "Too many requests. Please wait a few minutes and try again."

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server. |
| `npm run build` / `npm start` | Production build and server. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | TypeScript check. |
| `npm test` | Unit tests (Vitest): request signing, form rules per line (travel dates included), each line's `buildDetails`, the date selects, the progress bar, plan tags, money format, the plan card total, the header contact card, the pay-link token shape, the visitor IP, Turnstile and the 429 messages. |
| `npm run test:e2e` | End-to-end tests (Playwright). Starts PolicyDesk on 3070 (from `POLICYDESK_DIR`, default `../policydesk-website`; `POLICYDESK_PORT` to change the port), PolicyDesk's fake PaySandbox on 3072 and Brokwise on 3100. Run `npx playwright install chromium` once first. |
