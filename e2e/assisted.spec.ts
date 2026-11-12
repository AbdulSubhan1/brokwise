import { type Browser, expect, type Page, test } from "@playwright/test";
import { dollars, usd } from "./helpers";

// The assisted journey: the customer asks for a call on Brokwise, a coordinator does the rest in PolicyDesk (signed in
// with the demo role buttons, as PolicyDesk's own E2E helpers do) and sends a private payment link, and the customer
// pays through /pay/<token> on the same payment and thank-you pages as a self-serve visitor.

const PD = `http://localhost:${process.env.POLICYDESK_PORT ?? 3070}`;
const CHECKOUT = /^http:\/\/localhost:3072\/c\//;
const THANK_YOU = /\/car\/thank-you(\?.*)?$/;
const TERMS = "I agree to the terms and conditions and confirm my details are made up for this demo.";
const PAY_LINK = /https?:\/\/[^\s"'<>]+\/pay\/[A-Za-z0-9_-]{43}/;

/** A PolicyDesk tab in its own browser context, signed in as the admin (who sees every department's opportunities). */
async function policyDeskAsAdmin(browser: Browser): Promise<Page> {
  const pd = await browser.newPage({ baseURL: PD, locale: "en-US" });
  await pd.goto("/login");
  await pd.getByRole("button", { name: /^Admin\b/ }).click();
  // The first sign-in also compiles the dashboard in dev mode, so allow time for it
  await expect(pd).toHaveURL(`${PD}/`, { timeout: 30_000 });
  return pd;
}

/** Presses a PolicyDesk form button and waits for its server action to answer. */
async function submit(pd: Page, name: string) {
  await Promise.all([
    pd.waitForResponse((r) => r.request().method() === "POST" && r.url().startsWith(PD), { timeout: 30_000 }),
    pd.getByRole("main").getByRole("button", { name, exact: true }).click(),
  ]);
}

/** Opens an Autocomplete by its label and picks an option (the first one when none is named). */
async function pick(pd: Page, label: string, option?: string) {
  const box = pd.getByRole("main").getByRole("combobox", { name: label });
  await box.click();
  if (option) await box.fill(option);
  await (option ? pd.getByRole("option", { name: option }) : pd.getByRole("option")).first().click();
}

/** Picks a YYYY-MM-DD day in PolicyDesk's DatePicker: jumps to the year, then pages to the month. */
async function pickDate(pd: Page, label: string, iso: string) {
  await pd.getByRole("button", { name: label, exact: true }).click();
  const dialog = pd.getByRole("dialog", { name: label });
  const title = dialog.locator("[aria-live]");
  const year = Number(iso.slice(0, 4));

  await title.click();
  for (;;) {
    const [from, to] = (await title.innerText()).split(" – ").map(Number);
    if (year >= from && year <= to) break;
    await dialog.getByRole("button", { name: year < from ? "Previous" : "Next" }).click();
  }
  await dialog.getByRole("button", { name: String(year), exact: true }).click();

  for (;;) {
    const shown = (await dialog.locator("[data-day]").first().getAttribute("data-day"))!.slice(0, 7);
    if (shown === iso.slice(0, 7)) break;
    await dialog.getByRole("button", { name: shown < iso ? "Next" : "Previous" }).click();
  }
  await dialog.locator(`[data-day="${iso}"]`).click();
  await expect(dialog).toHaveCount(0);
}

/** The pay link PolicyDesk shows once, whether it is printed as text or sits in a read-only box next to Copy. */
async function shownPayLink(pd: Page): Promise<string> {
  let link = "";
  await expect
    .poll(
      async () => {
        const text = await pd.getByRole("main").evaluate((main) =>
          [(main as HTMLElement).innerText, ...Array.from(main.querySelectorAll("input"), (i) => i.value)].join("\n"),
        );
        link = text.match(PAY_LINK)?.[0] ?? "";
        return link;
      },
      { timeout: 30_000 },
    )
    .not.toBe("");
  return link;
}

async function journeyCookie(page: Page) {
  return (await page.context().cookies()).find((c) => c.name === "bw_journey");
}

test.describe.serial("assisted journey", () => {
  let payLink = "";

  test("call me back → coordinator sends a link → customer pays through /pay/<token> → thank-you with advisor", async ({
    page,
    browser,
  }) => {
    test.setTimeout(240_000);
    const customer = "Nadia Rauf";
    const email = `nadia.rauf.${Date.now()}@example.test`;

    // 1. The customer asks for a call.
    await page.goto("/car/quick");
    await page.getByLabel("Full name").fill(customer);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Country code").selectOption("+92");
    await page.getByLabel("Mobile number").fill("3009876543");
    await page.getByLabel("Car make").selectOption("Toyota");
    await page.getByLabel("Car model").selectOption("Corolla");
    await page.getByLabel("Model year").selectOption("2021");
    await page.getByRole("button", { name: "Call me back" }).click();
    await expect(page).toHaveURL("/car/received", { timeout: 30_000 });
    await expect(
      page.getByRole("main").getByText("When your coordinator has your details, they'll send you a payment link."),
    ).toBeVisible({ timeout: 30_000 });

    // 2. In PolicyDesk the coordinator completes the details, qualifies and converts without an advisor.
    const pd = await policyDeskAsAdmin(browser);
    await pd.goto(`/opportunities?q=${encodeURIComponent(email)}`);
    await pd.getByRole("main").getByRole("link", { name: customer }).click();
    await expect(pd).toHaveURL(/\/opportunities\/\d+$/, { timeout: 30_000 });
    const opportunityUrl = new URL(pd.url()).pathname;
    const main = pd.getByRole("main");

    await pick(pd, "GCC spec", "Yes");
    await main.getByLabel("Car value").fill("17000");
    await pickDate(pd, "Date of birth", "1990-03-21");
    await main.getByLabel("Nationality").fill("Pakistani");
    await main.getByLabel("City").fill("Lahore");
    await main.getByLabel("Years licensed").fill("8");
    await submit(pd, "Save details");

    await pick(pd, "Status", "Qualified");
    await submit(pd, "Set status");
    await expect(main.getByText("The advisor is assigned automatically after the customer pays.")).toBeVisible({
      timeout: 30_000,
    });
    await submit(pd, "Convert");

    // 3. On the opportunity page: the plan, then the payment link, shown once.
    await pd.goto(opportunityUrl);
    await expect(main.getByText("Online payment")).toBeVisible({ timeout: 30_000 });
    await pick(pd, "Plan");
    await submit(pd, "Save choice");
    await main.getByRole("button", { name: "Create payment link" }).click();
    payLink = await shownPayLink(pd);
    await expect(main.getByRole("button", { name: /Copy/ })).toBeVisible();
    await expect(main.getByText("Shown once. Create a new link if it's lost.")).toBeVisible();

    // 4. The customer opens the link in their own browser and pays.
    await page.context().clearCookies();
    await page.goto(new URL(payLink).pathname);
    await expect(page).toHaveURL("/car/payment", { timeout: 30_000 });
    const pay = page.getByRole("main");
    await expect(pay.getByRole("heading", { name: "Review and pay" })).toBeVisible({ timeout: 30_000 });
    await expect(pay.getByTestId("quote-reference")).toHaveText(/^CAR-[A-Z2-9]{7}-Q\d+$/);
    const total = dollars(await pay.getByTestId("order-total").textContent());
    expect(total).toBeGreaterThan(0);

    await pay.getByLabel(TERMS).check();
    await page.getByRole("button", { name: `Pay ${usd(total)} with PaySandbox` }).click();
    await expect(page).toHaveURL(CHECKOUT, { timeout: 30_000 });
    await page.getByRole("button", { name: "Pay", exact: true }).click();

    await expect(page).toHaveURL(THANK_YOU, { timeout: 30_000 });
    const thanks = page.getByRole("main");
    await expect(thanks.getByRole("heading", { name: "Payment received" })).toBeVisible({ timeout: 30_000 });
    await expect(thanks.getByTestId("order-total")).toHaveText(usd(total));
    await expect(thanks.getByText(/^Your advisor .+ will contact you about documents\.$/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Your advisor" })).toBeVisible();

    // 5. PolicyDesk shows the link as paid.
    await pd.goto(opportunityUrl);
    await expect(main.getByText("Paid", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    await pd.close();
  });

  test("paid link → thank-you", async ({ page }) => {
    test.skip(!payLink, "needs the link paid in the previous test");
    await page.context().clearCookies();
    await page.goto(new URL(payLink).pathname);
    await expect(page).toHaveURL(THANK_YOU, { timeout: 30_000 });
    await expect(page.getByRole("main").getByRole("heading", { name: "Payment received" })).toBeVisible({
      timeout: 30_000,
    });
  });
});

test("garbage token → invalid page, no cookie", async ({ page }) => {
  const invalid = "This payment link isn't valid. Check the link your coordinator sent, or ask for a new one.";
  await page.context().clearCookies();

  // Not even token-shaped: refused before PolicyDesk is asked.
  await page.goto("/pay/not-a-real-token");
  await expect(page).toHaveURL("/pay/invalid");
  await expect(page.getByRole("main").getByText(invalid)).toBeVisible();

  // Token-shaped but unknown to PolicyDesk (404 not_found).
  await page.goto(`/pay/${"A".repeat(43)}`);
  await expect(page).toHaveURL("/pay/invalid", { timeout: 30_000 });
  await expect(page.getByRole("main").getByText(invalid)).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "help@brokwise.test" })).toBeVisible();

  expect(await journeyCookie(page)).toBeUndefined();
});

test("expired-link page tells the customer to ask for a new one", async ({ page }) => {
  // PolicyDesk's expiry (72 hours) is covered by its unit tests; this checks what the customer sees on a 410.
  await page.goto("/pay/expired");
  await expect(
    page.getByRole("main").getByText("This payment link has expired. Ask your coordinator for a new one."),
  ).toBeVisible();
});
