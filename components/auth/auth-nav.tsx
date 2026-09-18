import Link from "next/link";

export function AuthNav({
  mode,
  locked = false,
}: {
  mode: "login" | "register";
  locked?: boolean;
}) {
  const className = locked
    ? "pointer-events-none text-neutral-500"
    : "text-neutral-300 underline";
  return (
    <nav className="flex items-center justify-between text-sm" aria-disabled={locked}>
      <Link className={className} href="/" tabIndex={locked ? -1 : undefined}>
        返回首页
      </Link>
      {mode === "login" ? (
        <Link className={className} href="/register" tabIndex={locked ? -1 : undefined}>
          没有账号？去注册
        </Link>
      ) : (
        <Link className={className} href="/login" tabIndex={locked ? -1 : undefined}>
          已有账号？去登录
        </Link>
      )}
    </nav>
  );
}
