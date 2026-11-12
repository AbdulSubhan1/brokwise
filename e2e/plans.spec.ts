import { expect, type Locator, type Page, test } from "@playwright/test";
import { dollars, fillFullForm, SELECT_PLAN, usd } from "./helpers";

// Plans come from PolicyDesk's seeded made-up car plans, so these tests find plan rows by what they offer
// (an unticked or a pre-ticked add-on) instead of by insurer or plan name. Each plan is an article; the page shows the
// first six and a "Show N more plans" button.

function cards(page: Page): Locator {
  return page.getByRole("article");
}

/** Opens a row's collapsed extras ("Add extras · n available"), if it has some and they are closed. */
async function showAddOns(card: Locator) {
  const toggle = card.getByRole("button", { name: /^Add extras · \d+ available/ });
  if ((await toggle.count()) > 0 && (await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
}

/** The first card that has an add-on matching `checked`, with its add-ons shown. */
async function cardWithAddOn(page: Page, checked: boolean): Promise<Locator> {
  const all = await cards(page).all();
  for (const card of all) {
    await showAddOns(card);
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

/** After Select: the one review page before paying, with the saved total. */
async function selectedTotal(page: Page): Promise<number> {
  await expect(page).toHaveURL("/car/payment", { timeout: 30_000 });
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Review and pay" })).toBeVisible({ timeout: 30_000 });
  return dollars(await main.getByTestId("order-total").textContent());
}

test("full form → plans page lists plans cheapest first", async ({ page }) => {
  await fillFullForm(page);
  await expect(page).toHaveTitle(/Choose your plan/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^\d+ plans for your Corolla$/);
  await expect(page.getByText("Yearly prices in US dollars.")).toBeVisible();
  // Next keeps the previous page hidden in the DOM for back navigation, so look only in the visible main
  await expect(
    page.getByRole("main").getByText("Demo site: use made-up details. Payments are in PaySandbox test mode."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Your coordinator" })).toBeVisible();

  await expect(cards(page).first()).toBeVisible();
  // "Lowest price" orders by the price each row shows (the plan with its pre-ticked extras).
  const prices = (await page.getByTestId("plan-total").allTextContents()).map(dollars);
  expect(prices.length).toBeGreaterThan(1);
  expect(prices.length).toBeLessThanOrEqual(6);
  expect(prices).toEqual([...prices].sort((a, b) => a - b));

  // Every card has its button, each named after its own plan and price.
  const selects = page.getByRole("button", { name: SELECT_PLAN });
  await expect(selects).toHaveCount(prices.length);
  const names = await selects.evaluateAll((buttons) => buttons.map((b) => b.getAttribute("aria-label")));
  expect(new Set(names).size).toBe(names.length);
  await expect(selects.first()).toHaveText("Select");

  // The cover filter narrows the list to one kind of cover; each tab says how many plans it has.
  const filter = page.getByRole("navigation", { name: "Filter by cover" });
  const all = dollars(await filter.getByRole("link", { name: /^All · \d+$/ }).textContent());
  const tab = filter.getByRole("link", { name: /^Third party · \d+$/ });
  const count = dollars(await tab.textContent());
  await tab.click();
  await expect(page).toHaveURL("/car/plans?cover=third_party");
  await expect(tab).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${count} plans for your Corolla`);
  await expect(cards(page)).toHaveCount(Math.min(count, 6));
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThan(all);
});

test("summary strip says what was quoted, and Edit details opens the form filled in", async ({ page }) => {
  await fillFullForm(page);
  const summary = page.getByRole("region", { name: "Your quote" });
  await expect(summary).toContainText("Toyota Corolla 2021");
  await expect(summary).toContainText("GCC spec · worth $17,000");
  await expect(summary).toContainText(/driver \d+ · licence 8 years · Lahore/);
  await expect(summary.getByText(/^CAR-[A-Z2-9]{7}$/)).toBeVisible();

  await summary.getByRole("link", { name: "Edit details" }).click();
  await expect(page).toHaveURL("/car/details");
  await expect(page.getByLabel("Car make")).toHaveValue("Toyota");
  await expect(page.getByLabel("Car model")).toHaveValue("Corolla");
  await expect(page.getByLabel("Model year")).toHaveValue("2021");
  await expect(page.getByRole("radio", { name: "Yes" })).toBeChecked();
  await expect(page.getByLabel("Car value (USD)")).toHaveValue("17000");
  await expect(page.getByLabel("City")).toHaveValue("Lahore");
  await expect(page.getByLabel("Years with a driving licence")).toHaveValue("8");
  await expect(page.getByLabel("Full name")).toHaveValue("Bilal Ahmed");
  await expect(page.getByRole("textbox", { name: "Email", exact: true })).toHaveValue("bilal.ahmed@example.test");
  await expect(page.getByLabel("Mobile number")).toHaveValue("3331234567");

  // A changed answer gives new prices for the changed car.
  await page.getByLabel("Car model").selectOption("Camry");
  await page.getByRole("button", { name: "Get prices" }).click();
  await expect(page).toHaveURL("/car/plans", { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/plans for your Camry$/, { timeout: 30_000 });
  await expect(page.getByRole("region", { name: "Your quote" })).toContainText("Toyota Camry 2021");
});

test("sort by lowest excess, agency repair only, and show more plans", async ({ page }) => {
  await fillFullForm(page);
  const filter = page.getByRole("navigation", { name: "Filter by cover" });
  const all = dollars(await filter.getByRole("link", { name: /^All · \d+$/ }).textContent());

  // Fewer plans at first, then the rest.
  const more = page.getByRole("button", { name: /^Show \d+ more plans?$/ });
  if (all > 6) {
    await expect(cards(page)).toHaveCount(6);
    await expect(more).toHaveText(`Show ${all - 6} more ${all - 6 === 1 ? "plan" : "plans"}`);
    await more.click();
    await expect(cards(page)).toHaveCount(all);
    await expect(more).toHaveCount(0);
  }

  await page.getByLabel("Sort by").selectOption("excess");
  await expect(page).toHaveURL("/car/plans?sort=excess");
  await expect(page.getByLabel("Sort by")).toHaveValue("excess");
  const excesses = await cards(page).evaluateAll((rows) =>
    rows.map((row) => Number(row.querySelectorAll("dd")[1]?.textContent?.replace(/[^\d]/g, ""))),
  );
  expect(excesses).toEqual([...excesses].sort((a, b) => a - b));

  // Agency repair is comprehensive cover: its checkbox narrows the comprehensive tab, and the order stays.
  await page.getByRole("checkbox", { name: "Agency repair only" }).check();
  await expect(page).toHaveURL("/car/plans?cover=comprehensive_agency&sort=excess");
  await expect(filter.getByRole("link", { name: /^Comprehensive · \d+$/ })).toHaveAttribute("aria-current", "page");
  const agency = await cards(page).count();
  expect(agency).toBeGreaterThan(0);
  for (const row of await cards(page).all()) await expect(row.locator("dd").first()).toHaveText(/agency/i);

  await page.getByRole("checkbox", { name: "Agency repair only" }).uncheck();
  await expect(page).toHaveURL("/car/plans?cover=comprehensive&sort=excess");
  await expect(page.getByRole("checkbox", { name: "Agency repair only" })).not.toBeChecked();
  expect(await cards(page).count()).toBeGreaterThan(agency);
});

test("extras open on request and add up under the grid", async ({ page }) => {
  await fillFullForm(page);
  // By position: the toggle's name changes once it is open, so a filter on it would lose the row.
  const withExtras = await cards(page).evaluateAll((rows) =>
    rows.findIndex((row) => [...row.querySelectorAll("button")].some((b) => b.textContent?.startsWith("Add extras"))),
  );
  expect(withExtras).toBeGreaterThanOrEqual(0);
  const card = cards(page).nth(withExtras);
  const toggle = card.getByRole("button", { name: /^Add extras · \d+ available/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(card.getByRole("checkbox").first()).toBeHidden();
  await toggle.click();
  const hide = card.getByRole("button", { name: "Hide extras" });
  await expect(hide).toHaveAttribute("aria-expanded", "true");

  const addOn = await firstAddOn(card, false);
  const price = dollars(await addOn.locator("..").getByTestId("addon-price").textContent());
  const before = await totalOf(card);
  await addOn.check();
  const sum = card.getByTestId("plan-sum");
  await expect(sum).toContainText(`= ${usd(before + price)} a year`);
  await expect(sum).toHaveText(/^Plan \$[\d,]+ \+ \d+ extras? \(\$[\d,]+\) = \$[\d,]+ a year$/);
  await expect(card.getByTestId("plan-total")).toHaveText(usd(before + price));

  // Closed again, the ticks still count.
  await hide.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(card.getByTestId("plan-total")).toHaveText(usd(before + price));
});

test("the coordinator card opens on click only and closes outside or with Escape", async ({ page }) => {
  await fillFullForm(page);
  const badge = page.getByRole("button", { name: "Your coordinator" });
  const email = page.getByRole("banner").getByRole("link", { name: /^Email .+ through the help desk$/ });

  await badge.hover();
  await expect(email).toBeHidden();
  await badge.click();
  await expect(badge).toHaveAttribute("aria-expanded", "true");
  await expect(email).toBeVisible();
  await page.getByRole("main").click({ position: { x: 5, y: 5 } });
  await expect(email).toBeHidden();

  await badge.press("Enter");
  await expect(email).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("banner").getByRole("link", { name: /^Call .+ on \+92/ })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(email).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(email).toBeHidden();
  await expect(badge).toBeFocused();
  await badge.press("Space");
  await expect(email).toBeVisible();
  await badge.click();
  await expect(email).toBeHidden();
});

test("pick a plan with an optional add-on → review page shows the same total as the card", async ({ page }) => {
  await fillFullForm(page);
  const card = await cardWithAddOn(page, false);
  const before = await totalOf(card);
  const addOn = await firstAddOn(card, false);
  const price = dollars(await addOn.locator("..").getByTestId("addon-price").textContent());

  await addOn.check();
  const total = before + price;
  await expect(card.getByTestId("plan-total")).toHaveText(usd(total));

  // The button's name follows the ticked add-ons.
  await expect(card.getByRole("button", { name: `, ${usd(total)} a year` })).toBeVisible();
  await card.getByRole("button", { name: SELECT_PLAN }).click();
  expect(await selectedTotal(page)).toBe(total);
  const main = page.getByRole("main");
  await expect(main.getByTestId("quote-reference")).toHaveCount(1);
  await expect(main.getByTestId("quote-reference")).toHaveText(/^CAR-[A-Z2-9]{7}-Q\d+$/);
  await expect(main.getByRole("link", { name: "Change plan" })).toHaveAttribute("href", "/car/plans");
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
  await card.getByRole("button", { name: SELECT_PLAN }).click();
  expect(await selectedTotal(page)).toBe(total);
});

test("change plan keeps one quote reference", async ({ page }) => {
  await fillFullForm(page);
  const firstName = await cards(page).nth(0).getByRole("heading").textContent();
  await cards(page).nth(0).getByRole("button", { name: SELECT_PLAN }).click();
  await selectedTotal(page);
  const reference = await page.getByRole("main").getByTestId("quote-reference").textContent();
  expect(reference).toMatch(/^CAR-[A-Z2-9]{7}-Q\d+$/);

  await page.getByRole("main").getByRole("link", { name: "Change plan" }).click();
  await expect(page).toHaveURL("/car/plans");
  await expect(cards(page).nth(0).getByText("Your choice")).toBeVisible();

  const second = cards(page).nth(1);
  const secondName = await second.getByRole("heading").textContent();
  expect(secondName).not.toBe(firstName);
  await second.getByRole("button", { name: SELECT_PLAN }).click();
  await selectedTotal(page);
  await expect(page.getByRole("main").getByRole("heading", { name: secondName ?? "" })).toBeVisible();
  await expect(page.getByRole("main").getByTestId("quote-reference")).toHaveText(reference ?? "");
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
  // The old "Your choice is saved" page now goes to the payment page, which needs the journey cookie.
  await page.goto("/car/selected");
  await expect(page).toHaveURL("/car");
});

test("an old /car/selected link opens the review-and-pay page", async ({ page }) => {
  await fillFullForm(page);
  await cards(page).first().getByRole("button", { name: SELECT_PLAN }).click();
  const total = await selectedTotal(page);
  await page.goto("/car/selected");
  expect(await selectedTotal(page)).toBe(total);
});
