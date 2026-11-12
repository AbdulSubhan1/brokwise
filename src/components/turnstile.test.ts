import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Turnstile } from "./turnstile";

describe("Turnstile", () => {
  it("renders the widget container with the site key and an empty token field", () => {
    const html = renderToStaticMarkup(createElement(Turnstile, { siteKey: "1x00000000000000000000AA" }));
    expect(html).toContain('data-sitekey="1x00000000000000000000AA"');
    expect(html).toMatch(/<input[^>]*type="hidden"[^>]*name="cf-turnstile-response"/);
  });
});
