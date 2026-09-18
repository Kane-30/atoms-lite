import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  pending: boolean;
  idle: ReactNode;
  busy: ReactNode;
  variant?: "solid" | "ghost" | "inverse" | "danger";
};

export function SubmitButton({
  pending,
  idle,
  busy,
  disabled,
  className = "",
  type = "submit",
  variant = "solid",
  ...rest
}: Props) {
  const locked = pending || disabled;
  const tone =
    variant === "ghost"
      ? "h-9 bg-transparent px-0 text-neutral-200 underline"
      : variant === "danger"
        ? "h-9 justify-start bg-transparent px-0 text-red-400"
        : "h-11 bg-white px-4 text-neutral-900";
  const spin =
    variant === "ghost"
      ? "border-neutral-500 border-t-neutral-100"
      : "border-neutral-300 border-t-neutral-900";
  return (
    <button
      {...rest}
      type={type}
      disabled={locked}
      aria-busy={pending}
      className={`inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${tone} ${className}`}
    >
      {pending ? (
        <span className={`h-4 w-4 animate-spin rounded-full border-2 ${spin}`} />
      ) : null}
      <span>{pending ? busy : idle}</span>
    </button>
  );
}
