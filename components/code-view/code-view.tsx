"use client";

import { useMemo, useState } from "react";
import { buildFileTree, type TreeNode } from "@/lib/code-view/tree";

export function CodeView({ files }: { files: { path: string; content: string }[] }) {
  const tree = useMemo(() => buildFileTree(files.map((file) => file.path)), [files]);
  const [closed, setClosed] = useState<ReadonlySet<string>>(() => new Set());
  const [activePath, setActivePath] = useState(files[0]?.path ?? "");
  const active = files.find((file) => file.path === activePath) ?? files[0];

  function toggle(path: string) {
    setClosed((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="w-52 shrink-0 overflow-auto border-r border-white/10 p-3 text-sm">
        {files.length === 0 ? (
          <p className="px-2 text-neutral-500">还没有文件</p>
        ) : (
          <TreeList
            nodes={tree}
            activePath={active?.path ?? ""}
            closed={closed}
            onToggle={toggle}
            onOpen={setActivePath}
          />
        )}
      </div>
      <div className="min-w-0 flex-1 overflow-auto">
        {active ? (
          <>
            <p className="border-b border-white/10 px-4 py-2 font-mono text-xs text-neutral-400">
              {active.path}
            </p>
            <ReadOnlyCode content={active.content} />
          </>
        ) : (
          <p className="p-4 text-sm text-neutral-500">还没有文件</p>
        )}
      </div>
    </div>
  );
}

function TreeList({
  nodes,
  activePath,
  closed,
  onToggle,
  onOpen,
}: {
  nodes: TreeNode[];
  activePath: string;
  closed: ReadonlySet<string>;
  onToggle: (path: string) => void;
  onOpen: (path: string) => void;
}) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => {
        if (node.kind === "dir") {
          const expanded = !closed.has(node.path);
          return (
            <li key={node.path}>
              <button
                type="button"
                className="flex w-full items-center gap-1 rounded px-2 py-1 text-left text-neutral-300 hover:bg-white/5"
                aria-expanded={expanded}
                onClick={() => onToggle(node.path)}
              >
                <span className="w-3 text-neutral-500" aria-hidden="true">
                  {expanded ? "▾" : "▸"}
                </span>
                <span>{node.name}/</span>
              </button>
              {expanded ? (
                <div className="pl-3">
                  <TreeList
                    nodes={node.children}
                    activePath={activePath}
                    closed={closed}
                    onToggle={onToggle}
                    onOpen={onOpen}
                  />
                </div>
              ) : null}
            </li>
          );
        }

        const selected = node.path === activePath;
        return (
          <li key={node.path}>
            <button
              type="button"
              className={`block w-full truncate rounded px-2 py-1 text-left ${selected ? "bg-white/10 text-neutral-100" : "text-neutral-300 hover:bg-white/5"}`}
              aria-current={selected ? "true" : undefined}
              onClick={() => onOpen(node.path)}
            >
              {node.name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ReadOnlyCode({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <pre className="m-0 overflow-auto p-4 font-mono text-xs leading-6 text-neutral-200">
      {lines.map((line, index) => (
        <div key={`${index}:${line}`} className="flex">
          <span
            className="w-10 shrink-0 select-none pr-4 text-right text-neutral-500"
            aria-hidden="true"
          >
            {index + 1}
          </span>
          <code className="min-w-0 whitespace-pre">{line.length > 0 ? line : " "}</code>
        </div>
      ))}
    </pre>
  );
}
