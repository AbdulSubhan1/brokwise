# Future scope: car insurance website + PolicyDesk + PaySandbox

Holding page until the website repo's `docs/kb/` and PolicyDesk's `docs/` KB exist (step 1 copies
it there). Source: `2026-11-11-merchant-website-design.md`.

| Item | Why it waits | Trigger / when |
| --- | --- | --- |
| **Middle API server** (CAPI-style, Next.js API-only project): website journeys, pricing, orders and payments move out of PolicyDesk's `server/website/` and `server/payments/` folders into it | One website and one product today; a third app would add a repo, database, deploy and tests for little logic | A second app needs the same API, a real pricing engine arrives, or payments grow (split payments, several merchants) |
| **Email OTP verification** before plans are shown | Keep step 1 basic | After the basic journeys work |
| **Split payments** between sellers (broker vs partner company) | Needs PaySandbox support | When PaySandbox adds it |
| **In-page card form** (Elements-style) instead of the hosted checkout redirect | Needs PaySandbox support | When PaySandbox adds it |
| **Pricing engine**: price from car value, age, driver, eligibility rules | Flat price + add-ons is enough for now | After step 3 |
| **SEO and content pages**, more products than car | Marketing growth | After the car journey is complete |
| **Customer document upload** on the website | Coordinator/advisor upload in PolicyDesk first | Later |
| **Add-on editing screens** in PolicyDesk | Seeded data first | Later |
| **Automatic reassignment** when a coordinator/advisor does not respond in time | Needs a scheduler (QStash; Vercel Hobby crons run once a day) | Step 6+ |
| **Clean-up of old demo submissions** | PolicyDesk's live demo is open to anyone | Later |
