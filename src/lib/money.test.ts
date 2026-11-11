import { describe, expect, it } from "vitest";
import { formatUsd } from "./money";

describe("formatUsd", () => {
  it("formats 1234 as $1,234", () => {
    expect(formatUsd(1234)).toBe("$1,234");
  });

  it("shows small and zero amounts without decimals", () => {
    expect(formatUsd(0)).toBe("$0");
    expect(formatUsd(25)).toBe("$25");
  });
});
