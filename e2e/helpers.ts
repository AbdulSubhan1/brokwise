import { expect, type Page } from "@playwright/test";

/** "$1,234" or "+$30" → 1234 / 30. */
export function dollars(text: string | null): number {
  return Number((text ?? "").replace(/[^\d]/g, ""));
}

/** 1234 → "$1,234", as the website shows it. */
export function usd(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

/** Sends the full form (which creates a lead) and waits for the plan cards to stream in. */
export async function fillFullForm(page: Page, email = "bilal.ahmed@example.test") {
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
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mobile number").fill("3331234567");
  await page.getByRole("button", { name: "Get prices" }).click();
  await expect(page).toHaveURL("/car/plans", { timeout: 30_000 });
  // The URL changes before the plans stream in, so wait for the cards before looking at the page
  await expect(page.getByRole("article").first()).toBeVisible({ timeout: 30_000 });
}
