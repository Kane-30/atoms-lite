"use client";

import { useEffect, useMemo, useState } from "react";
import { assembleSrcdoc } from "@/lib/sandbox/assemble-srcdoc";

const POC_FILES = [
  {
    path: "index.html",
    content: `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>POC-3 Bridge</title>
<link rel="stylesheet" href="styles/poc.css">
</head>
<body>
<p id="status">loading…</p>
<script src="scripts/poc.js"></script>
</body>
</html>`,
  },
  { path: "styles/poc.css", content: "body{font-family:system-ui;padding:1rem}" },
  {
    path: "scripts/poc.js",
    content: `document.getElementById('status').textContent = 'iframe ok';
if (window.atomslite) window.atomslite.ready();`,
  },
];

export default function BridgePocPage() {
  const { html, missing, blockedCdns } = useMemo(
    () => assembleSrcdoc(POC_FILES),
    [],
  );
  const [ready, setReady] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "atomslite:ready") {
        setReady(true);
        setLastMessage("atomslite:ready");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6 font-sans">
      <h1 className="text-xl font-semibold">POC-3: Bridge + srcdoc</h1>
      <ul className="list-inside list-disc text-sm text-neutral-600">
        <li>
          Parent received ready:{" "}
          <strong className={ready ? "text-green-700" : "text-amber-700"}>
            {ready ? "yes" : "waiting…"}
          </strong>
        </li>
        <li>Last message type: {lastMessage ?? "—"}</li>
        <li>Assembler missing: {missing.length ? missing.join(", ") : "none"}</li>
        <li>
          Blocked CDNs: {blockedCdns.length ? blockedCdns.join(", ") : "none"}
        </li>
      </ul>
      <iframe
        title="POC-3 sandbox"
        sandbox="allow-scripts"
        srcDoc={html}
        className="h-40 w-full rounded border border-neutral-300 bg-white"
      />
    </main>
  );
}
