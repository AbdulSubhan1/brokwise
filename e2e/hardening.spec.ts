import { expect, test } from "@playwright/test";

// What the default E2E setup can show: security headers, and forms that work with no Turnstile keys and load nothing
// from Cloudflare. The rate-limit message and the Turnstile on/off logic are covered by unit tests
// (src/app/[lob]/actions.test.ts, src/lib/turnstile.test.ts, src/components/turnstile.test.ts); PolicyDesk's own E2E
// covers the limits themselves.

const SECURITY_HEADERS = {
  "x-frame-options": "DENY",
  "content-security-policy": "frame-ancestors 'none'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

for (const path of ["/", "/car/quick"]) {
  test(`security headers are set on ${path}`, async ({ request }) => {
    const res = await request.get(path);
    expect(res.status()).toBe(200);
    expect(res.headers()).toMatchObject(SECURITY_HEADERS);
  });
}

test("forms work without Turnstile keys (no Cloudflare script loaded)", async ({ page }) => {
  const cloudflare: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("challenges.cloudflare.com")) cloudflare.push(req.url());
  });

  await page.goto("/car/details");
  await expect(page.getByRole("button", { name: "Get prices" })).toBeVisible();
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveCount(0);

  await page.goto("/car/quick");
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveCount(0);
  await page.getByLabel("Full name").fill("Sana Khalid");
  await page.getByLabel("Email").fill("sana.khalid@example.test");
  await page.getByLabel("Country code").selectOption("+92");
  await page.getByLabel("Mobile number").fill("3007654321");
  await page.getByLabel("Car make").selectOption("Toyota");
  await page.getByLabel("Car model").selectOption("Corolla");
  await page.getByLabel("Model year").selectOption("2020");
  await page.getByRole("button", { name: "Call me back" }).click();

  await expect(page).toHaveURL("/car/received", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Request received" })).toBeVisible();
  expect(cloudflare).toEqual([]);
});
