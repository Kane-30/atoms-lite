"use client";

import { useCallback, useRef, useState } from "react";
import { shouldIgnoreSubmit, type SubmitGate } from "@/lib/ui/submit-gate";

export function useSubmitLock(windowMs = 800) {
  const gate = useRef<SubmitGate>({ busy: false, lastKey: null, lastAt: 0 });
  const [pending, setPending] = useState(false);

  const run = useCallback(async (key: string, action: () => Promise<boolean>) => {
    const now = Date.now();
    if (shouldIgnoreSubmit(gate.current, key, now, windowMs)) return;
    gate.current = { busy: true, lastKey: key, lastAt: now };
    setPending(true);
    let hold = false;
    try {
      hold = await action();
    } finally {
      if (!hold) {
        gate.current = { ...gate.current, busy: false };
        setPending(false);
      }
    }
  }, [windowMs]);

  return { pending, run };
}
