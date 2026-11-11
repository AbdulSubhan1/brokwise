import { expect, type Locator, type Page, test } from "@playwright/test";

// Plans come from PolicyDesk's seeded made-up car plans, so these tests find cards by what they offer
// (an unticked or a pre-ticked add-on) instead of by insurer or plan name.

/** "$1,234" or "+$30" → 1234 / 30. */
function dollars(text: string | null): number {
  return Number((text ?? "").replace(/[^\d]/g, ""));
}

/** 1234 → "$1,234", as the cards show it. */
function usd(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

async function fillFullForm(page: Page) {
  await page.goto("/car/details");
  await page.getByLabel("Car make").selectOption("Toyota");
  await page.getByLabel("Car model").selectOption("Corolla");
  await page.getByLabel("Model year").selectOption("2021");
  await page.getByRole("radio", { name: "Yes" }).check();
  await page.getByLabel("Car value (USD)").fill("17000");
  await page.getByLabel("Full name").fill("Bilal Ahmed");
  await page.getByLabel("Date of birth").fill("1990-03-21");
  await page.getByLabel("Nationality").fill("Pakistani");
  await page.getByLabel("City").fill("Lahore");
  await page.getByLabel("Years with a driving licence").fill("8");
  await page.getByLabel("Email").fill("bilal.ahmed@example.test");
  await page.getByLabel("Mobile number").fill("3331234567");
  await page.getByRole("button", { name: "Get prices" }).click();
  await expect(page).toHaveURL("/car/plans", { timeout: 30_000 });
  // The URL changes before the plans stream in, so wait for the cards before looking at the page
  await expect(page.getByRole("article").first()).toBeVisible({ timeout: 30_000 });
}

function cards(page: Page): Locator {
  return page.getByRole("article");
}

/** The first card that has an add-on matching `checked`. */
async function cardWithAddOn(page: Page, checked: boolean): Promise<Locator> {
  const all = await cards(page).all();
  for (const card of all) {
    if ((await card.getByRole("checkbox", { checked }).count()) > 0) return card;
  }
  throw new Error(`No plan card has an add-on with checked=${checked}`);
}

/** The card's first add-on checkbox in the given state, as a locator that stays on it after it is toggled. */
async function firstAddOn(card: Locator, checked: boolean): Promise<Locator> {
  const boxes = card.getByRole("checkbox");
  const n = await boxes.count();
  for (let i = 0; i < n; i++) {
    if ((await boxes.nth(i).isChecked()) === checked) return boxes.nth(i);
  }
  throw new Error(`The card has no add-on with checked=${checked}`);
}

async function totalOf(card: Locator): Promise<number> {
  return dollars(await card.getByTestId("plan-total").textContent());
}

async function selectedTotal(page: Page): Promise<number> {
  await expect(page).toHaveURL("/car/selected", { timeout: 30_000 });
  return dollars(await page.getByTestId("selection-total").textContent());
}

test("full form → plans page lists plans cheapest first", async ({ page }) => {
  await fillFullForm(page);
  await expect(page.getByRole("heading", { name: "Choose your plan" })).toBeVisible();
  await expect(page.getByText("Prices are yearly, in US dollars.")).toBeVisible();
  // Next keeps the previous page hidden in the DOM for back navigation, so look only in the visible main
  await expect(
    page.getByRole("main").getByText("Demo site: use made-up details. Payments are in PaySandbox test mode."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Your coordinator" })).toBeVisible();

  await expect(cards(page).first()).toBeVisible();
  const prices = (await page.getByTestId("plan-price").allTextContents()).map(dollars);
  expect(prices.length).toBeGreaterThan(1);
  expect(prices).toEqual([...prices].sort((a, b) => a - b));

  // Every card has its button; included add-ons are shown as "Included", not as checkboxes.
  await expect(page.getByRole("button", { name: "Select this plan" })).toHaveCount(prices.length);

  // The cover filter narrows the list to one kind of cover.
  await page.getByRole("link", { name: "Third party", exact: true }).click();
  await expect(page).toHaveURL("/car/plans?cover=third_party");
  await expect(page.getByRole("link", { name: "Third party", exact: true })).toHaveAttribute("aria-current", "page");
  const thirdParty = await cards(page).count();
  expect(thirdParty).toBeGreaterThan(0);
  expect(thirdParty).toBeLessThan(prices.length);
});

test("pick a plan with an optional add-on → selected page shows the same total as the card", async ({ page }) => {
  await fillFullForm(page);
  const card = await cardWithAddOn(page, false);
  const before = await totalOf(card);
  const addOn = await firstAddOn(card, false);
  const price = dollars(await addOn.locator("..").getByTestId("addon-price").textContent());

  await addOn.check();
  const total = before + price;
  await expect(card.getByTestId("plan-total")).toHaveText(usd(total));

  await card.getByRole("button", { name: "Select this plan" }).click();
  expect(await selectedTotal(page)).toBe(total);
  await expect(page.getByTestId("quote-reference")).toHaveText(/^CAR-[A-Z2-9]{7}-Q\d+$/);
  await expect(page.getByText("Payment opens in the next release. Your coordinator can help meanwhile.")).toBeVisible();
});

test("untick a pre-ticked add-on → total drops by its price", async ({ page }) => {
  await fillFullForm(page);
  const card = await cardWithAddOn(page, true);
  const before = await totalOf(card);
  const addOn = await firstAddOn(card, true);
  const price = dollars(await addOn.locator("..").getByTestId("addon-price").textContent());
  expect(price).toBeGreaterThan(0);

  await addOn.uncheck();
  const total = before - price;
  await expect(card.getByTestId("plan-total")).toHaveText(usd(total));

  // PolicyDesk prices the saved quote the same way.
  await card.getByRole("button", { name: "Select this plan" }).click();
  expect(await selectedTotal(page)).toBe(total);
});

test("change plan keeps one quote reference", async ({ page }) => {
  await fillFullForm(page);
  const firstName = await cards(page).nth(0).getByRole("heading").textContent();
  await cards(page).nth(0).getByRole("button", { name: "Select this plan" }).click();
  await selectedTotal(page);
  const reference = await page.getByTestId("quote-reference").textContent();
  expect(reference).toMatch(/^CAR-[A-Z2-9]{7}-Q\d+$/);

  await page.getByRole("link", { name: "Change plan" }).click();
  await expect(page).toHaveURL("/car/plans");
  await expect(cards(page).nth(0).getByText("Your choice")).toBeVisible();

  const second = cards(page).nth(1);
  const secondName = await second.getByRole("heading").textContent();
  expect(secondName).not.toBe(firstName);
  await second.getByRole("button", { name: "Select this plan" }).click();
  await selectedTotal(page);
  await expect(page.getByRole("heading", { name: secondName ?? "" })).toBeVisible();
  await expect(page.getByTestId("quote-reference")).toHaveText(reference ?? "");
});

test("short-form journey opening /car/plans goes to /car/received", async ({ page }) => {
  await page.goto("/car/quick");
  await page.getByLabel("Full name").fill("Ayesha Khan");
  await page.getByLabel("Email").fill("ayesha.khan@example.test");
  await page.getByLabel("Mobile number").fill("3451234567");
  await page.getByLabel("Car make").selectOption("Honda");
  await page.getByLabel("Car model").selectOption("Civic");
  await page.getByLabel("Model year").selectOption("2018");
  await page.getByRole("button", { name: "Call me back" }).click();
  await expect(page).toHaveURL("/car/received", { timeout: 30_000 });

  await page.goto("/car/plans");
  await expect(page).toHaveURL("/car/received", { timeout: 30_000 });
  await expect(page.getByText("Your coordinator will call you.")).toBeVisible();
});

test("plans and selected pages without a cookie redirect to /car", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/car/plans");
  await expect(page).toHaveURL("/car");
  await page.goto("/car/selected");
  await expect(page).toHaveURL("/car");
});
