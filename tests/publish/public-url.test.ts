import { describe, expect, it } from "vitest";
import { publishedUrl } from "@/lib/publish/public-url";

describe("publishedUrl", () => {
  it("uses the online origin even when the local app url is localhost", () => {
    expect(
      publishedUrl("abc12xyz", {
        APP_PUBLIC_URL: "https://atoms-lite-l43x6zxw.edgeone.cool/",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      }),
    ).toBe("https://atoms-lite-l43x6zxw.edgeone.cool/published/abc12xyz");
  });
});
