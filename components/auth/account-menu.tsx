"use client";

import { useEffect, useRef, useState } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { avatarLabel } from "@/lib/auth/avatar";

export function AccountMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const mark = avatarLabel(name);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-sm font-medium"
        aria-expanded={open}
        aria-label="账号"
        onClick={() => setOpen((value) => !value)}
      >
        {mark}
      </button>
      {open ? (
        <div className="absolute bottom-12 left-0 z-20 w-64 rounded-xl border border-white/10 bg-neutral-900 p-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-medium">
              {mark}
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium">{name}</div>
              <div className="truncate text-xs text-neutral-400">{email}</div>
            </div>
          </div>
          <div className="my-3 border-t border-white/10" />
          <LogoutButton menu />
        </div>
      ) : null}
    </div>
  );
}
