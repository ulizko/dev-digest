import { describe, it, expect } from "vitest";
import { formatCost } from "./format-cost";

describe("formatCost", () => {
  it("renders missing cost as an em dash, never $0.00", () => {
    expect(formatCost(null)).toBe("—");
    expect(formatCost(undefined)).toBe("—");
  });

  it("renders a free run as $0", () => {
    expect(formatCost(0)).toBe("$0");
  });

  it("keeps at least 3 decimals and 2 significant digits", () => {
    expect(formatCost(0.0013)).toBe("$0.0013");
    expect(formatCost(0.014)).toBe("$0.014");
    expect(formatCost(0.06)).toBe("$0.060");
    expect(formatCost(0.00001)).toBe("$0.000010");
    expect(formatCost(1.5)).toBe("$1.500");
  });
});
