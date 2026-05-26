import type { ReactNode } from "react";

type Variant = "info" | "warn" | "err" | "ok";

interface Props {
  variant?: Variant;
  titulo?: string;
  children: ReactNode;
}

const variantClasses: Record<
  Variant,
  { bg: string; border: string; fg: string }
> = {
  info: { bg: "bg-accent-tint", border: "border-accent-soft", fg: "text-accent" },
  warn: { bg: "bg-oro-tint", border: "border-oro-soft", fg: "text-oro" },
  err: { bg: "bg-danger-tint", border: "border-danger-soft", fg: "text-danger" },
  ok: { bg: "bg-accent-tint", border: "border-accent-soft", fg: "text-accent" },
};

export function Alert({ variant = "info", titulo, children }: Props) {
  const s = variantClasses[variant];
  return (
    <div
      role="status"
      className={[
        "rounded-[10px] border p-3.5 text-sm",
        s.bg,
        s.border,
        s.fg,
      ].join(" ")}
    >
      {titulo && <p className="font-medium m-0 mb-1">{titulo}</p>}
      <div className="text-ink-soft text-xs leading-relaxed">{children}</div>
    </div>
  );
}
