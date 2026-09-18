"use client";

import { useEffect, useRef, useState } from "react";
import {
  bridgeFailure,
  bridgeSuccess,
  parseBridgeRequest,
} from "@/lib/sandbox/bridge-protocol";

export type PreviewFrameProps = {
  projectId: string;
  srcDoc: string;
  title?: string;
  className?: string;
  onReady?: () => void;
};

export function PreviewFrame({
  projectId,
  srcDoc,
  title = "应用预览",
  className = "h-full w-full bg-white",
  onReady,
}: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const onReadyRef = useRef(onReady);
  const [armed, setArmed] = useState(false);
  onReadyRef.current = onReady;

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;

      const raw = event.data;
      if (!raw || typeof raw !== "object") return;
      if (raw.type === "atomslite:ready") {
        onReadyRef.current?.();
        return;
      }
      if (raw.type !== "atomslite:req") return;

      const parsed = parseBridgeRequest(raw);
      const reply = (payload: unknown) => {
        iframeWindow.postMessage(payload, "*");
      };
      if (!parsed.ok) {
        if (typeof raw.id === "string" && raw.id) {
          reply(bridgeFailure(raw.id, parsed.error));
        }
        return;
      }

      const { id, method, collection, docId, doc, patch } = parsed.request;
      void (async () => {
        try {
          const response = await fetch(
            `/api/projects/${encodeURIComponent(projectId)}/app-data`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({ method, collection, docId, doc, patch }),
            },
          );
          const body = (await response.json().catch(() => null)) as {
            ok?: boolean;
            data?: unknown;
            error?: string;
          } | null;
          if (!response.ok || !body?.ok) {
            reply(bridgeFailure(id, body?.error || "request_failed"));
            return;
          }
          reply(bridgeSuccess(id, body.data));
        } catch {
          reply(bridgeFailure(id, "request_failed"));
        }
      })();
    };

    window.addEventListener("message", onMessage);
    setArmed(true);
    return () => {
      window.removeEventListener("message", onMessage);
      setArmed(false);
    };
  }, [projectId]);

  return (
    <iframe
      ref={iframeRef}
      title={title}
      sandbox="allow-scripts allow-forms"
      referrerPolicy="no-referrer"
      srcDoc={armed ? srcDoc : ""}
      className={className}
    />
  );
}
