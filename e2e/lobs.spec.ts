import { expect, type Page, test } from "@playwright/test";
import { dollars, pickDate, SELECT_PLAN, usd } from "./helpers";

// The lines beyond car run on the same /[lob] pages, driven by src/lobs. PolicyDesk routes travel and home to its
// home_travel department (coordinator Mehwish Iqbal, advisor Tariq Hussain in its seed) and health to its health
// department; payment goes through PolicyDesk's fake PaySandbox on port 3072, as in payment.spec.ts.

const CHECKOUT = /^http:\/\/localhost:3072\/c\//;
const TERMS = "I agree to the terms and confirm my details are made up for this demo.";
const NEXT_YEAR = new Date().getFullYear() + 1;

async function contact(page: Page, name: string, email: string, mobile: string) {
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mobile number").fill(mobile);
}

test("travel full journey → plans → pay (fake) → thank-you with a home_travel advisor", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/travel");
  await page.getByRole("link", { name: /Get prices now/ }).click();
  await expect(page).toHaveURL("/travel/details");
  await expect(page.getByRole("navigation", { name: "Progress" }).locator('[aria-current="step"]')).toContainText(
    "Fill details",
  );

  await page.getByLabel("Where are you going?").selectOption("europe_schengen");
  // An annual plan has no end date; a single trip asks for one.
  await page.getByRole("radio", { name: /Annual plan/ }).check();
  await expect(page.getByRole("group", { name: "End date", exact: true })).toHaveCount(0);
  await page.getByRole("radio", { name: /Single trip/ }).check();
  await pickDate(page, "Start date", `${NEXT_YEAR}-03-01`);
  await pickDate(page, "End date", `${NEXT_YEAR}-03-15`);
  await page.getByLabel("Travellers").selectOption("2");
  await page.getByLabel("Oldest traveller's age").fill("41");
  await contact(page, "Usman Farooq", `usman.farooq.${Date.now()}@example.test`, "3121234567");
  await page.getByRole("button", { name: "Get prices" }).click();

  await expect(page).toHaveURL("/travel/plans", { timeout: 30_000 });
  await expect(page.getByRole("article").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/^TRV-[A-Z2-9]{7}$/)).toBeVisible();
  // Travel plans only: the cover filter offers the travel covers, not car ones.
  await expect(page.getByRole("link", { name: "Single trip", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Third party", exact: true })).toHaveCount(0);

  // A single-trip plan is priced for the trip, not for a year.
  await page.getByRole("link", { name: "Single trip", exact: true }).click();
  await expect(page).toHaveURL("/travel/plans?cover=single_trip");
  await expect(page.getByText("Prices are for the whole trip, in US dollars.")).toBeVisible();
  const trip = page.getByRole("article").first();
  await expect(trip.getByText("Total for this trip")).toBeVisible();
  await expect(trip.getByRole("button", { name: SELECT_PLAN })).toHaveAccessibleName(/ for this trip$/);

  await trip.getByRole("button", { name: SELECT_PLAN }).click();
  await expect(page).toHaveURL("/travel/payment", { timeout: 30_000 });
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Review and pay" })).toBeVisible({ timeout: 30_000 });
  await expect(main.getByTestId("quote-reference")).toHaveText(/^TRV-[A-Z2-9]{7}-Q\d+$/);
  await expect(main.getByText("Total for this trip")).toBeVisible();
  const total = dollars(await main.getByTestId("order-total").textContent());

  await main.getByLabel(TERMS).check();
  await page.getByRole("button", { name: `Pay ${usd(total)} with PaySandbox` }).click();
  await expect(page).toHaveURL(CHECKOUT, { timeout: 30_000 });
  await page.getByRole("button", { name: "Pay", exact: true }).click();

  await expect(page).toHaveURL(/\/travel\/thank-you(\?.*)?$/, { timeout: 30_000 });
  await expect(main.getByRole("heading", { name: "Payment received" })).toBeVisible({ timeout: 30_000 });
  await expect(main.getByTestId("order-total")).toHaveText(usd(total));
  await expect(main.getByText("Your advisor Tariq Hussain will contact you about documents.")).toBeVisible();
  const badge = page.getByRole("button", { name: "Your advisor" });
  await badge.hover();
  await expect(page.getByRole("banner").getByRole("link", { name: "Email Tariq Hussain through the help desk" })).toHaveAttribute(
    "href",
    /^mailto:help@brokwise\.test\?subject=For%20Tariq%20Hussain%3A%20TRV-/,
  );
});

test("home call me back → received shows a home_travel coordinator", async ({ page }) => {
  await page.goto("/home");
  await page.getByRole("link", { name: /Call me back/ }).click();
  await expect(page).toHaveURL("/home/quick");
  await contact(page, "Hina Baig", `hina.baig.${Date.now()}@example.test`, "3331239876");
  await page.getByLabel("City").fill("Islamabad");
  await page.getByRole("button", { name: "Call me back" }).click();

  await expect(page).toHaveURL("/home/received", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Request received" })).toBeVisible();
  await expect(page.getByText("Your coordinator will call you.")).toBeVisible();
  const badge = page.getByRole("button", { name: "Your coordinator" });
  await expect(badge).toContainText("Mehwish");
  await badge.hover();
  await expect(page.getByRole("banner").getByRole("link", { name: "Email Mehwish Iqbal through the help desk" })).toBeVisible();
});

test("health plans show the included wellness check-up", async ({ page }) => {
  await page.goto("/health/details");
  await page.getByRole("radio", { name: /Just me/ }).check();
  await expect(page.getByLabel("Number of children")).toHaveCount(0);
  await page.getByRole("radio", { name: "No", exact: true }).check();
  await page.getByLabel("Full name").fill("Rabia Anwar");
  await pickDate(page, "Your date of birth", "1988-06-15");
  await page.getByLabel("City").fill("Karachi");
  await page.getByLabel("Email").fill(`rabia.anwar.${Date.now()}@example.test`);
  await page.getByLabel("Mobile number").fill("3007771234");
  await page.getByRole("button", { name: "Get prices" }).click();

  await expect(page).toHaveURL("/health/plans", { timeout: 30_000 });
  await expect(page.getByRole("article").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/^HLT-[A-Z2-9]{7}$/)).toBeVisible();
  const cards = await page.getByRole("article").all();
  expect(cards.length).toBeGreaterThan(0);
  for (const card of cards) {
    const wellness = card.getByRole("listitem").filter({ hasText: "Wellness check-up" });
    await expect(wellness).toBeVisible();
    await expect(wellness).toContainText("Included");
  }
});

test("unknown line → 404 with links", async ({ page }) => {
  await page.goto("/boat/details");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "We can't find that page" })).toBeVisible();
  for (const [name, href] of [
    ["Car insurance", "/car"],
    ["Travel insurance", "/travel"],
    ["Home insurance", "/home"],
    ["Health insurance", "/health"],
  ]) {
    await expect(main.getByRole("link", { name })).toHaveAttribute("href", href);
  }
  // Next adds its own noindex for not-found pages next to ours; what matters is that one is there
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
});

test("old /car/details still works", async ({ page }) => {
  const res = await page.goto("/car/details");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Get prices now" })).toBeVisible();
  await expect(page.getByLabel("Car make")).toBeVisible();
  await expect(page.getByRole("group", { name: "Date of birth", exact: true })).toBeVisible();
});
