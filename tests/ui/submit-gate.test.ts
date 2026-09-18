import { describe, expect, it } from "vitest";
import { shouldIgnoreSubmit } from "@/lib/ui/submit-gate";

describe("shouldIgnoreSubmit", () => {
  it("ignores a second click while the first is in flight", () => {
    expect(
      shouldIgnoreSubmit(
        { busy: true, lastKey: "login:a@b.com", lastAt: 1000 },
        "login:a@b.com",
        1001,
      ),
    ).toBe(true);
  });

  it("ignores the same action inside the debounce window", () => {
    expect(
      shouldIgnoreSubmit(
        { busy: false, lastKey: "prompt:记账", lastAt: 1000 },
        "prompt:记账",
        1500,
      ),
    ).toBe(true);
  });

  it("allows a different action immediately, and the same action after the window", () => {
    const gate = { busy: false, lastKey: "prompt:记账", lastAt: 1000 };
    expect(shouldIgnoreSubmit(gate, "prompt:待办", 1100)).toBe(false);
    expect(shouldIgnoreSubmit(gate, "prompt:记账", 1800)).toBe(false);
  });
});
