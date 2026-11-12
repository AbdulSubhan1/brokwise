import { expect, type Page, test } from "@playwright/test";
import { fillFullForm, SELECT_PLAN } from "./helpers";

// The home page's quote card follows the visitor's journey cookie: an example without one, then the visitor's own
// plans, their chosen plan, and their payment; a "call me back" request gets "We'll call you".

const TERMS = "I agree to the terms and conditions and confirm my details are made up for this demo.";

/** The card once it has streamed in (the skeleton is labelled "Your quote"). */
async function homeCard(page: Page, label: string | RegExp) {
  await page.goto("/");
  const card = page.getByRole("region", { name: label });
  await expect(card).toBeVisible({ timeout: 30_000 });
  return card;
}

test("no journey → the example quote, clearly marked, with the hero's truthful numbers", async ({ page }) => {
  const card = await homeCard(page, "Example quote");
  await expect(card.getByText("Example", { exact: true })).toBeVisible();
  await expect(card.getByText("Example prices for a typical driver.", { exact: false })).toBeVisible();
  await expect(card.getByRole("listitem")).toHaveCount(3);

  await expect(page.getByRole("heading", { level: 1, name: "Insurance, the wise way" })).toBeVisible();
  await expect(page.getByText("partner insurers", { exact: true })).toBeVisible();
  await expect(page.getByText("5", { exact: true })).toBeVisible();
  await expect(page.getByText("4.8")).toHaveCount(0);

  // "Ask for a call back" asks which line, then opens that line's quick form.
  await page.getByRole("button", { name: "Ask for a call back" }).click();
  // The menu lists each line again; its links go to the quick forms.
  await page.locator(`a[href="/travel/quick"]`).click();
  await expect(page).toHaveURL("/travel/quick");
});

test("full form → plans card → chosen plan → paid, each step linking back into the journey", async ({ page }) => {
  await fillFullForm(page, "home.resume@example.test");

  let card = await homeCard(page, "Your car quote");
  await expect(card.getByRole("heading", { name: "Continue your car quote" })).toBeVisible();
  await expect(card.getByText(/^Reference CAR-[A-Z2-9]{7}$/)).toBeVisible();
  await expect(card.getByText(/^\d+ plans from \$[\d,]+$/)).toBeVisible();
  await expect(card.getByRole("listitem")).toHaveCount(3);
  await card.getByRole("link", { name: "See your plans" }).click();
  await expect(page).toHaveURL("/car/plans");

  await expect(page.getByRole("article").first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole("article").first().getByRole("button", { name: SELECT_PLAN }).click();
  await expect(page).toHaveURL("/car/payment", { timeout: 30_000 });
  const main = page.getByRole("main");
  const total = (await main.getByTestId("order-total").textContent()) ?? "";

  card = await homeCard(page, "Your car quote");
  await expect(card.getByText("Your plan")).toBeVisible();
  await expect(card.getByText(total, { exact: true })).toBeVisible();
  await card.getByRole("link", { name: "Review and pay" }).click();
  await expect(page).toHaveURL("/car/payment");

  await page.getByRole("main").getByLabel(TERMS).check();
  await page.getByRole("button", { name: `Pay ${total} with PaySandbox` }).click();
  await expect(page).toHaveURL(/^http:\/\/localhost:3072\/c\//, { timeout: 30_000 });
  await page.getByRole("button", { name: "Pay", exact: true }).click();
  await expect(page).toHaveURL(/\/car\/thank-you/, { timeout: 30_000 });
  await expect(page.getByRole("main").getByRole("heading", { name: "Payment received" })).toBeVisible({
    timeout: 30_000,
  });

  card = await homeCard(page, "Your car order");
  await expect(card.getByRole("heading", { name: "Payment received" })).toBeVisible();
  await expect(card.getByText(total, { exact: true })).toBeVisible();
  await card.getByRole("link", { name: "See your order" }).click();
  await expect(page).toHaveURL("/car/thank-you");
});

test("call me back → we'll call you, and a forged cookie quietly shows the example", async ({ page, context }) => {
  await page.goto("/home/quick");
  await page.getByLabel("Full name").fill("Hamza Qureshi");
  await page.getByLabel("Email").fill("home.callback@example.test");
  await page.getByLabel("Mobile number").fill("3007654321");
  await page.getByLabel("City").fill("Karachi");
  await page.getByRole("button", { name: "Call me back" }).click();
  await expect(page).toHaveURL("/home/received", { timeout: 30_000 });

  const card = await homeCard(page, "Your home request");
  await expect(card.getByRole("heading", { name: "We'll call you" })).toBeVisible();
  await expect(card.getByText(/will call you|will make sure someone calls you/)).toBeVisible();
  await card.getByRole("link", { name: "See your request" }).click();
  await expect(page).toHaveURL("/home/received");

  await context.addCookies([{ name: "bw_journey", value: "not-a-real-token", url: "http://localhost:3100" }]);
  await homeCard(page, "Example quote");
});
