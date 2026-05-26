import type { ReactNode } from "react";

type Estado = "pending" | "done" | "now" | "err";

interface Props {
  estado: Estado;
  children: ReactNode;
}

const claseEstado: Record<Estado, string> = {
  pending: "bg-soft text-mute border border-rule",
  done: "bg-accent-soft text-accent",
  now: "bg-ink text-paper",
  err: "bg-danger-soft text-danger",
};

/** Chip de fase del pipeline (4 estados: pendiente, hecho, ahora, error). */
export function StageChip({ estado, children }: Props) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-[4px] px-2 py-0.5",
        "font-mono text-[10px]",
        claseEstado[estado],
      ].join(" ")}
    >
      <span
        className={[
          "w-[5px] h-[5px] rounded-full bg-current",
          estado === "now" ? "animate-pulse" : "",
        ].join(" ")}
        aria-hidden
      />
      {children}
    </span>
  );
}
