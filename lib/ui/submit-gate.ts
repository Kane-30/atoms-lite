export type SubmitGate = {
  busy: boolean;
  lastKey: string | null;
  lastAt: number;
};

/** Drop a submit while one is in flight, or the same key repeats inside the window. */
export function shouldIgnoreSubmit(
  gate: SubmitGate,
  key: string,
  now: number,
  windowMs = 800,
): boolean {
  if (gate.busy) return true;
  if (gate.lastKey === key && now - gate.lastAt < windowMs) return true;
  return false;
}
