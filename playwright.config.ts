import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run Brokwise against a real local PolicyDesk (branch feat/website-api) with its own test database.
const POLICYDESK_DIR = process.env.POLICYDESK_DIR ?? "../policydesk-website";
// POLICYDESK_PORT lets the suite run when 3070 is already taken on this machine
const POLICYDESK_PORT = Number(process.env.POLICYDESK_PORT ?? 3070);
const PORT = 3100;
const WEBSITE_API_SECRET = "e2e-secret";
const JOURNEY_COOKIE_SECRET = "e2e-journey-cookie-secret-32-chars!";

export default defineConfig({
  testDir: "./e2e",
  // Both specs create records in one shared PolicyDesk database and its automatic assignment, so run one at a time.
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
      // db:setup migrates and seeds only when the database is empty, so reruns keep the same data.
      command: `npm run db:setup && npm run dev -- -p ${POLICYDESK_PORT}`,
      cwd: POLICYDESK_DIR,
      url: `http://localhost:${POLICYDESK_PORT}/login`,
      env: { PGLITE_DIR: "./.pglite-e2e", WEBSITE_API_SECRET },
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
