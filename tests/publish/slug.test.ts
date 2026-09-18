import { describe, expect, it } from "vitest";
import { generateSlug } from "@/lib/db/publications";

describe("generateSlug", () => {
  it("uses only lowercase letters and digits, length 8 to 12", () => {
    for (let i = 0; i < 40; i += 1) {
      const slug = generateSlug();
      expect(slug).toMatch(/^[a-z0-9]+$/);
      expect(slug.length).toBeGreaterThanOrEqual(8);
      expect(slug.length).toBeLessThanOrEqual(12);
    }
  });
});
