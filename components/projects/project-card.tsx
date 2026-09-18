"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/ui/submit-button";
import { useSubmitLock } from "@/lib/ui/use-submit-lock";

export function DeleteProjectButton({
  projectId,
  title,
  redirectTo,
}: {
  projectId: string;
  title: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { pending, run } = useSubmitLock();

  return (
    <SubmitButton
      type="button"
      variant="danger"
      pending={pending}
      idle="删除"
      busy="删除中"
      onClick={() => {
        if (!window.confirm(`删除「${title}」？删掉后不能恢复。`)) return;
        void run(`delete:${projectId}`, async () => {
          const response = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
          if (!response.ok) return false;
          if (redirectTo) {
            router.push(redirectTo);
            router.refresh();
            return true;
          }
          router.refresh();
          return false;
        });
      }}
    />
  );
}

export function ProjectCard({
  id,
  title,
  meta,
  cover = false,
}: {
  id: string;
  title: string;
  meta: string;
  cover?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-neutral-900">
      {cover ? <div className="h-28 bg-gradient-to-br from-neutral-800 to-neutral-700" /> : null}
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <Link href={`/p/${id}`} className="min-w-0 flex-1 hover:text-white">
          <div className="truncate font-medium">{title}</div>
          <div className="mt-1 text-xs text-neutral-400">{meta}</div>
        </Link>
        <DeleteProjectButton projectId={id} title={title} />
      </div>
    </div>
  );
}
