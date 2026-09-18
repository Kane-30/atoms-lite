"use client";

import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/ui/submit-button";
import { useSubmitLock } from "@/lib/ui/use-submit-lock";

export function LogoutButton({ menu = false }: { menu?: boolean }) {
  const router = useRouter();
  const { pending, run } = useSubmitLock();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void run("logout", async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/login");
          router.refresh();
          return true;
        });
      }}
    >
      <SubmitButton
        pending={pending}
        idle={menu ? "退出登录" : "退出"}
        busy="正在退出"
        variant={menu ? "danger" : "ghost"}
      />
      {pending ? (
        <p className="sr-only" role="status">
          正在退出
        </p>
      ) : null}
    </form>
  );
}
