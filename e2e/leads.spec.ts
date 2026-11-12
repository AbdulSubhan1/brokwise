import { expect, type Page, test } from "@playwright/test";
import { SignJWT } from "jose";
import { pickDate } from "./helpers";

async function expectCoordinatorInHeader(page: Page) {
  const badge = page.getByRole("button", { name: "Your coordinator" });
  await expect(badge).toBeVisible();
  // The footer has the help desk's email and number too, so look only in the header
  const header = page.getByRole("banner");

  // The card opens on hover…
  const email = header.getByRole("link", { name: /^Email .+ through the help desk$/ });
  await badge.hover();
  await expect(email).toBeVisible();
  // The person's own (PolicyDesk login) email never shows: Email writes to the help desk, naming them.
  await expect(email).toHaveAttribute("href", /^mailto:help@brokwise\.test\?subject=For%20/);
  await expect(header.getByText(/@policydesk/)).toHaveCount(0);
  await expect(header.getByRole("link", { name: /^Call .+ on \+92/ })).toHaveAttribute("href", /^tel:\+92\d+$/);

  // …and on keyboard focus.
  await page.mouse.move(0, 0);
  await expect(email).toBeHidden();
  await badge.focus();
  await expect(email).toBeVisible();
}

async function pickCar(page: Page, make: string, model: string, year: string) {
  await page.getByLabel("Car make").selectOption(make);
  await page.getByLabel("Car model").selectOption(model);
  await page.getByLabel("Model year").selectOption(year);
}

test("call me back → received page shows a coordinator", async ({ page }) => {
  await page.goto("/car");
  await page.getByRole("link", { name: /Call me back/ }).click();
  await expect(page).toHaveURL("/car/quick");
  await expect(page.getByText("Demo site: use made-up details. Payments are in PaySandbox test mode.")).toBeVisible();

  await page.getByLabel("Full name").fill("Hamza Iqbal");
  await page.getByLabel("Email").fill("hamza.iqbal@example.test");
  await page.getByLabel("Country code").selectOption("+92");
  await page.getByLabel("Mobile number").fill("3001234567");
  await pickCar(page, "Toyota", "Corolla", "2020");
  await page.getByRole("button", { name: "Call me back" }).click();

  await expect(page).toHaveURL("/car/received", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Request received" })).toBeVisible();
  await expect(page.getByText("Your coordinator will call you.")).toBeVisible();
  await expect(page.getByText(/CAR-/)).toHaveCount(0);
  await expectCoordinatorInHeader(page);
});

test("get prices now → plans page shows CAR- reference and a coordinator", async ({ page }) => {
  await page.goto("/car");
  await page.getByRole("link", { name: /Get prices now/ }).click();
  await expect(page).toHaveURL("/car/details");
  await expect(page.getByText("Demo site: use made-up details. Payments are in PaySandbox test mode.")).toBeVisible();

  await pickCar(page, "Honda", "Civic", "2019");
  await page.getByRole("radio", { name: "Yes" }).check();
  await page.getByLabel("Car value (USD)").fill("15000");
  await page.getByLabel("Full name").fill("Mariam Siddiqui");
  await pickDate(page, "Date of birth", "1988-06-15");
  await page.getByLabel("Nationality").fill("Pakistani");
  await page.getByLabel("City").fill("Karachi");
  await page.getByLabel("Years with a driving licence").fill("10");
  await page.getByLabel("Email").fill("mariam.siddiqui@example.test");
  await page.getByLabel("Mobile number").fill("3217654321");
  await page.getByRole("button", { name: "Get prices" }).click();

  // The full form creates a lead, so the visitor goes straight on to the plans (step 2).
  await expect(page).toHaveURL("/car/plans", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Choose your plan" })).toBeVisible();
  await expect(page.getByText(/^CAR-[A-Z2-9]{7}$/)).toBeVisible();
  await expectCoordinatorInHeader(page);
});

test("an empty details form lists its mistakes at the top and moves focus there", async ({ page }) => {
  await page.goto("/car/details");
  await page.getByRole("button", { name: "Get prices" }).click();

  const summary = page.getByRole("alert").filter({ hasText: "Fix 12 things to see your prices" });
  await expect(summary).toBeFocused();
  // Each field says what it needs, under the field and in the summary.
  await expect(page.getByText("This field is required.")).toHaveCount(0);
  const model = page.getByLabel("Car model");
  await expect(model).toHaveAttribute("aria-invalid", "true");
  await expect(model).toHaveAccessibleDescription("Choose your car model.");

  await summary.getByRole("link", { name: "Enter your date of birth." }).click();
  await expect(page.getByRole("group", { name: "Date of birth", exact: true }).getByLabel("Day")).toBeFocused();
});

test("received without a cookie redirects to /car", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/car/received");
  await expect(page).toHaveURL("/car");
});

test("forged cookie redirects to /car", async ({ page }) => {
  // A well-formed journey token for a made-up opportunity, signed with the wrong secret.
  const forged = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("3f2b8c1d-4e5a-4b6c-8d7e-9f0a1b2c3d4e")
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode("not-the-real-secret-but-32-chars-long!"));
  await page.context().addCookies([{ name: "bw_journey", value: forged, url: "http://localhost:3100" }]);

  await page.goto("/car/received");
  await expect(page).toHaveURL("/car");
});
