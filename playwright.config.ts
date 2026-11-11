import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run Brokwise against a real local PolicyDesk (branch feat/website-payments) with its own test
// database, and PolicyDesk against its fake PaySandbox (e2e/fake-paysandbox.mjs in PolicyDesk), so the whole payment
// runs without the live service.
const POLICYDESK_DIR = process.env.POLICYDESK_DIR ?? "../policydesk-website";
// POLICYDESK_PORT lets the suite run when 3070 is already taken on this machine
const POLICYDESK_PORT = Number(process.env.POLICYDESK_PORT ?? 3070);
const PAYSANDBOX_PORT = 3072;
const PORT = 3100;
const WEBSITE_API_SECRET = "e2e-secret";
const JOURNEY_COOKIE_SECRET = "e2e-journey-cookie-secret-32-chars!";
const PAYSANDBOX_SECRET_KEY = "sk_test_e2e";
// TODO(step 3): keep equal to PAYSANDBOX_WEBHOOK_SECRET in PolicyDesk's playwright.config.ts (not written yet when
// this was added): whsec_ + base64 of 24 fixed bytes (here 0x01…0x18). The fake signs its webhooks with it.
const PAYSANDBOX_WEBHOOK_SECRET = "whsec_AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcY";

export default defineConfig({
  testDir: "./e2e",
  // The specs create records in one shared PolicyDesk database and its automatic assignment, so run one at a time.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "en-US",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // PolicyDesk's fake PaySandbox: checkout sessions, a hosted checkout page with Pay buttons, signed webhooks.
      command: "node e2e/fake-paysandbox.mjs",
      cwd: POLICYDESK_DIR,
      port: PAYSANDBOX_PORT,
      env: { E2E_PORT: String(POLICYDESK_PORT), PAYSANDBOX_WEBHOOK_SECRET },
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      // db:setup migrates and seeds only when the database is empty, so reruns keep the same data.
      command: `npm run db:setup && npm run dev -- -p ${POLICYDESK_PORT}`,
      cwd: POLICYDESK_DIR,
      url: `http://localhost:${POLICYDESK_PORT}/login`,
      env: {
        PGLITE_DIR: "./.pglite-e2e",
        WEBSITE_API_SECRET,
        PAYSANDBOX_API_URL: `http://localhost:${PAYSANDBOX_PORT}/api/v1`,
        PAYSANDBOX_SECRET_KEY,
        PAYSANDBOX_WEBHOOK_SECRET,
        WEBSITE_URL: `http://localhost:${PORT}`,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: `npm run dev -- -p ${PORT}`,
      url: `http://localhost:${PORT}`,
      env: {
        POLICYDESK_API_URL: `http://localhost:${POLICYDESK_PORT}`,
        WEBSITE_API_SECRET,
        JOURNEY_COOKIE_SECRET,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
