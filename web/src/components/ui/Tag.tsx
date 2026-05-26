import type { ReactNode } from "react";

type Variant = "pub" | "priv" | "proc" | "err" | "neutral";

interface Props {
  variant: Variant;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  pub: "text-accent border-accent-soft",
  priv: "text-oro border-oro-soft",
  proc: "text-ink-soft border-rule",
  err: "text-danger border-danger-soft",
  neutral: "text-mute border-rule",
};

export function Tag({ variant, children }: Props) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border bg-transparent",
        "px-2.5 py-0.5 text-[11px] font-medium",
        variantClasses[variant],
      ].join(" ")}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}
