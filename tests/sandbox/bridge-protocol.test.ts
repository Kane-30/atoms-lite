import { describe, expect, it } from "vitest";
import { parseBridgeRequest } from "@/lib/sandbox/bridge-protocol";

describe("parseBridgeRequest", () => {
  it("parses a valid request", () => {
    expect(
      parseBridgeRequest({
        type: "atomslite:req",
        id: "1",
        method: "insert",
        collection: "notes",
        docId: "d1",
        doc: { text: "hi" },
      }),
    ).toEqual({
      ok: true,
      request: {
        type: "atomslite:req",
        id: "1",
        method: "insert",
        collection: "notes",
        docId: "d1",
        doc: { text: "hi" },
      },
    });
  });

  it("rejects a missing id", () => {
    expect(
      parseBridgeRequest({
        type: "atomslite:req",
        method: "list",
        collection: "notes",
      }).ok,
    ).toBe(false);
    expect(
      parseBridgeRequest({
        type: "atomslite:req",
        id: "",
        method: "list",
        collection: "notes",
      }).ok,
    ).toBe(false);
  });

  it("rejects an unknown method", () => {
    const result = parseBridgeRequest({
      type: "atomslite:req",
      id: "1",
      method: "drop",
      collection: "notes",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("unknown_method");
  });
});
