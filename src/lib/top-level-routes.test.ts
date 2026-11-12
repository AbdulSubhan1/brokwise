import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LOB_SLUGS } from "@/lobs";
import { isKnownTopLevel } from "./top-level-routes";

// The proxy answers 404 for any path whose first segment is not one of ours, so the 404 page gets a real 404 status.

describe("isKnownTopLevel", () => {
  it("knows the home page, the lines and the pay pages", () => {
    for (const path of ["/", "/car", "/travel/details", "/home/plans", "/health/thank-you", "/pay/expired", "/pay/abc"]) {
      expect(isKnownTopLevel(path), path).toBe(true);
    }
  });

  it("does not know a line we don't sell", () => {
    for (const path of ["/boat", "/boat/details", "/Car/details", "/wp-admin/setup"]) {
      expect(isKnownTopLevel(path), path).toBe(false);
    }
  });

  it("leaves Next internals and files alone", () => {
    for (const path of ["/_next/static/chunks/a.js", "/_next/image", "/__nextjs_original-stack-frame", "/favicon.ico", "/robots.txt"]) {
      expect(isKnownTopLevel(path), path).toBe(true);
    }
  });

  it("knows every line", () => {
    for (const slug of LOB_SLUGS) expect(isKnownTopLevel(`/${slug}`), slug).toBe(true);
  });

  it("knows every folder under src/app", () => {
    const app = fileURLToPath(new URL("../app", import.meta.url));
    const folders = readdirSync(app, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("["))
      .map((d) => d.name);
    expect(folders.length).toBeGreaterThan(0);
    for (const name of folders) expect(isKnownTopLevel(`/${name}/x`), name).toBe(true);
  });
});
