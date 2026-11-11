# Brokwise

Brokwise is a made-up insurance broker's website, car insurance first. It is the demo merchant for
PaySandbox (a fake payment gateway) and uses PolicyDesk (an insurance CRM) as its back office. Every
person, insurer and number on it is made up.

The website has no database. Its forms call PolicyDesk's private website API with signed
server-to-server requests; PolicyDesk stores the opportunity (and, for the full form, the lead) and
assigns a coordinator automatically. The visitor's journey is kept in a signed, http-only cookie.

- `/` home, with the lines of business (only Car is active for now)
- `/car` choose between "Get prices now" and "Call me back"
- `/car/details` full form (creates an opportunity and a lead), then on to the plans
- `/car/quick` short form (creates an opportunity)
- `/car/received` request received, with the assigned coordinator in the header
- `/car/plans` car plans with add-ons and a live total (full-form journeys only)
- `/car/selected` the saved plan and add-ons, priced by PolicyDesk, with the quote reference

More in [`docs/kb/`](docs/kb/README.md) and the design in [`docs/superpowers/specs/`](docs/superpowers/specs/2026-11-11-brokwise-design.md).

## Run it locally with PolicyDesk

You need PolicyDesk with the website API (plans and selection: branch `feat/website-plans`) running next to Brokwise.

1. Start PolicyDesk on port 3070 with a website secret:

   ```bash
   cd ../policydesk-website
   WEBSITE_API_SECRET=dev-secret npm run dev -- -p 3070
   ```

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

The app checks these when it first needs them and stops with a clear message if one is missing.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server. |
| `npm run build` / `npm start` | Production build and server. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | TypeScript check. |
| `npm test` | Unit tests (Vitest): request signing, form rules, money format and the plan card total. |
| `npm run test:e2e` | End-to-end tests (Playwright). Starts PolicyDesk on 3070 (from `POLICYDESK_DIR`, default `../policydesk-website`) and Brokwise on 3100. Run `npx playwright install chromium` once first. |
