"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PreviewFrame } from "@/components/preview/preview-frame";
import { assembleSrcdoc } from "@/lib/sandbox/assemble-srcdoc";

const COLLECTION = "notes";

const POC_FILES = [
  {
    path: "index.html",
    content: `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>persist</title></head>
<body>
<p id="status">writing…</p>
<script src="scripts/app.js"></script>
</body>
</html>`,
  },
  {
    path: "scripts/app.js",
    content: `(async function () {
  var status = document.getElementById("status");
  var bridge = window["atomslite"];
  try {
    await bridge.db.insert("notes", { id: "poc-persist-1", text: "still-here" });
    var rows = await bridge.db.list("notes");
    status.textContent = JSON.stringify(rows);
    bridge.ready();
  } catch (err) {
    status.textContent = "error: " + (err && err.message ? err.message : String(err));
  }
})();`,
  },
];

type ProjectItem = { id: string; title: string };

export default function PersistPocPage() {
  const srcDoc = useMemo(() => assembleSrcdoc(POC_FILES).html, []);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [reread, setReread] = useState("等待 iframe 写入后，由接口再读");

  const rereadFromApi = useCallback(async (id: string) => {
    const response = await fetch(`/api/projects/${id}/app-data?collection=${COLLECTION}`, {
      credentials: "same-origin",
    });
    const body = await response.json().catch(() => null);
    setReread(JSON.stringify(body));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const listed = await fetch("/api/projects", { credentials: "same-origin" });
      if (listed.status === 401) {
        if (!cancelled) setSetupError("未登录");
        return;
      }
      const listedBody = (await listed.json().catch(() => null)) as {
        projects?: ProjectItem[];
      } | null;
      const existing = listedBody?.projects?.find((item) => item.title === "persist-poc");
      if (existing) {
        if (!cancelled) setProjectId(existing.id);
        return;
      }
      const created = await fetch("/api/projects", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "persist-poc", prompt: "persist poc" }),
      });
      const createdBody = (await created.json().catch(() => null)) as {
        projectId?: string;
      } | null;
      if (!created.ok || !createdBody?.projectId) {
        if (!cancelled) setSetupError("项目创建失败");
        return;
      }
      if (!cancelled) setProjectId(createdBody.projectId);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6 font-sans">
      <h1 className="text-xl font-semibold">生成应用数据持久化</h1>
      {setupError ? <p className="text-sm text-red-700">{setupError}</p> : null}
      <p className="text-sm text-neutral-600">项目：{projectId ?? "…"}</p>
      <section className="space-y-2">
        <h2 className="text-sm font-medium">接口再读</h2>
        <pre className="overflow-auto rounded border border-neutral-300 bg-neutral-50 p-3 text-xs">
          {reread}
        </pre>
        <button
          type="button"
          className="rounded border border-neutral-300 px-3 py-1 text-sm"
          disabled={!projectId}
          onClick={() => {
            if (projectId) void rereadFromApi(projectId);
          }}
        >
          再读
        </button>
      </section>
      {projectId ? (
        <PreviewFrame
          projectId={projectId}
          srcDoc={srcDoc}
          title="持久化证明"
          className="h-40 w-full rounded border border-neutral-300 bg-white"
          onReady={() => {
            void rereadFromApi(projectId);
          }}
        />
      ) : null}
    </main>
  );
}
