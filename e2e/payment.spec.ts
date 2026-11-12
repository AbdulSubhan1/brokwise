import { expect, type Page, test } from "@playwright/test";
import { dollars, fillFullForm, SELECT_PLAN, usd } from "./helpers";

// PolicyDesk talks to its fake PaySandbox on port 3072 (see playwright.config.ts). Its hosted checkout page has two
// buttons: "Pay" (completes the session and sends the signed webhook) and "Pay without webhook" (completes it only,
// so PolicyDesk learns about the payment when the thank-you page re-checks the session).

const CHECKOUT = /^http:\/\/localhost:3072\/c\//;
const THANK_YOU = /\/car\/thank-you(\?.*)?$/;
const TERMS = "I confirm this is a demo and my details are made up.";

/** Full form → first plan → straight to the review-and-pay page. Returns the saved total. */
async function openPayment(page: Page, email?: string): Promise<number> {
  await fillFullForm(page, email);
  await page.getByRole("article").first().getByRole("button", { name: SELECT_PLAN }).click();
  await expect(page).toHaveURL("/car/payment", { timeout: 30_000 });
  // Next keeps the previous page hidden in the DOM, so look only in the visible main, after the page streams in
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Review and pay" })).toBeVisible({ timeout: 30_000 });
  return dollars(await main.getByTestId("order-total").textContent());
}

/** Ticks the terms, presses Pay and lands on the fake hosted checkout. */
async function goToCheckout(page: Page, total: number) {
  await page.getByRole("main").getByLabel(TERMS).check();
  await page.getByRole("button", { name: `Pay ${usd(total)} with PaySandbox` }).click();
  await expect(page).toHaveURL(CHECKOUT, { timeout: 30_000 });
}

async function expectPaid(page: Page, total: number) {
  await expect(page).toHaveURL(THANK_YOU, { timeout: 30_000 });
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Payment received" })).toBeVisible({ timeout: 30_000 });
  await expect(main.getByTestId("order-total")).toHaveText(usd(total));
  await expect(main.getByTestId("payment-id")).toHaveText(/^pay_\w+$/);
  await expect(main.getByText(/^Paid on [A-Z][a-z]+ \d{1,2}, \d{4}$/)).toBeVisible();
}

test("full journey: plans → pay on the fake checkout → thank-you shows paid order and advisor", async ({ page }) => {
  const total = await openPayment(page, "sara.malik@example.test");
  const main = page.getByRole("main");
  await expect(main.getByTestId("order-total")).toHaveText(usd(total));
  await expect(main.getByTestId("quote-reference")).toHaveText(/^CAR-[A-Z2-9]{7}-Q\d+$/);
  await expect(main.getByText("Demo site: use made-up details. Payments are in PaySandbox test mode.")).toBeVisible();
  await expect(
    main.getByText("You'll pay on PaySandbox's test checkout. Use test card 4242 4242 4242 4242."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Your coordinator" })).toBeVisible();

  await goToCheckout(page, total);
  await page.getByRole("button", { name: "Pay", exact: true }).click();

  await expectPaid(page, total);
  await expect(main.getByText(/^A receipt goes to s\*+k@example\.test$/)).toBeVisible();
  await expect(main.getByText(/^Your advisor .+ will contact you about documents\.$/)).toBeVisible();

  // After payment the header shows the advisor instead of the coordinator; Email goes through the help desk.
  const badge = page.getByRole("button", { name: "Your advisor" });
  await expect(badge).toBeVisible();
  await badge.hover();
  const email = page.getByRole("banner").getByRole("link", { name: /^Email .+ through the help desk$/ });
  await expect(email).toBeVisible();
  await expect(email).toHaveAttribute("href", /^mailto:help@brokwise\.test\?subject=For%20.+%3A%20CAR-[A-Z2-9]{7}-Q\d+$/);
});

test("pay without webhook → thank-you confirms after the re-check", async ({ page }) => {
  const total = await openPayment(page);
  await goToCheckout(page, total);
  await page.getByRole("button", { name: "Pay without webhook" }).click();

  // PolicyDesk has no webhook for this payment: its order read asks PaySandbox about the session and marks it paid.
  await expectPaid(page, total);
  await expect(page.getByRole("button", { name: "Your advisor" })).toBeVisible();
});

test("terms box must be ticked", async ({ page }) => {
  const total = await openPayment(page);
  const terms = page.getByRole("main").getByLabel(TERMS);

  await page.getByRole("button", { name: `Pay ${usd(total)} with PaySandbox` }).click();
  await expect(page.getByText("Tick the box to confirm before you pay.")).toBeVisible();
  await expect(terms).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL("/car/payment");

  await terms.check();
  await page.getByRole("button", { name: `Pay ${usd(total)} with PaySandbox` }).click();
  await expect(page).toHaveURL(CHECKOUT, { timeout: 30_000 });
});

test("paid journey opening /car/payment goes to /car/thank-you", async ({ page }) => {
  const total = await openPayment(page);
  await goToCheckout(page, total);
  await page.getByRole("button", { name: "Pay", exact: true }).click();
  await expectPaid(page, total);

  await page.goto("/car/payment");
  await expectPaid(page, total);
});

test("thank-you without a cookie → /car", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/car/thank-you");
  await expect(page).toHaveURL("/car");
  await page.goto("/car/payment");
  await expect(page).toHaveURL("/car");
});
