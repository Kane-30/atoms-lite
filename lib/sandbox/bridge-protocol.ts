export const BRIDGE_METHODS = ["list", "insert", "update", "remove"] as const;

export type BridgeMethod = (typeof BRIDGE_METHODS)[number];

export type BridgeRequest = {
  type: "atomslite:req";
  id: string;
  method: BridgeMethod;
  collection: string;
  docId?: string;
  doc?: unknown;
  patch?: unknown;
};

export type BridgeSuccess = {
  type: "atomslite:res";
  id: string;
  ok: true;
  data: unknown;
};

export type BridgeFailure = {
  type: "atomslite:res";
  id: string;
  ok: false;
  error: string;
};

export type BridgeResponse = BridgeSuccess | BridgeFailure;

export type ParseBridgeRequestResult =
  | { ok: true; request: BridgeRequest }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function isBridgeMethod(value: unknown): value is BridgeMethod {
  return (
    typeof value === "string" &&
    (BRIDGE_METHODS as readonly string[]).includes(value)
  );
}

export function parseBridgeRequest(input: unknown): ParseBridgeRequestResult {
  if (!isRecord(input) || input.type !== "atomslite:req") {
    return { ok: false, error: "invalid_message" };
  }
  if (!nonEmptyString(input.id)) {
    return { ok: false, error: "missing_id" };
  }
  if (!isBridgeMethod(input.method)) {
    return { ok: false, error: "unknown_method" };
  }
  if (!nonEmptyString(input.collection)) {
    return { ok: false, error: "missing_collection" };
  }

  const request: BridgeRequest = {
    type: "atomslite:req",
    id: input.id,
    method: input.method,
    collection: input.collection,
  };

  if (input.docId !== undefined) {
    if (!nonEmptyString(input.docId)) {
      return { ok: false, error: "invalid_doc_id" };
    }
    request.docId = input.docId;
  }
  if ("doc" in input) request.doc = input.doc;
  if ("patch" in input) request.patch = input.patch;

  return { ok: true, request };
}

export function bridgeSuccess(id: string, data: unknown): BridgeSuccess {
  return { type: "atomslite:res", id, ok: true, data };
}

export function bridgeFailure(id: string, error: string): BridgeFailure {
  return { type: "atomslite:res", id, ok: false, error };
}
