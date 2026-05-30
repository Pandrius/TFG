"use client";

import { useEffect, type ReactNode } from "react";

interface Props {
  abierto: boolean;
  onClose: () => void;
  titulo: string;
  tono?: "neutral" | "warn" | "danger";
  children?: ReactNode;
  acciones: ReactNode;
}

const tonoIconClasses: Record<NonNullable<Props["tono"]>, string> = {
  neutral: "bg-accent-soft text-accent",
  warn: "bg-oro-soft text-oro",
  danger: "bg-danger-soft text-danger",
};

const tonoIcon: Record<NonNullable<Props["tono"]>, string> = {
  neutral: "•",
  warn: "!",
  danger: "✕",
};

export function Modal({
  abierto,
  onClose,
  titulo,
  tono = "neutral",
  children,
  acciones,
}: Props) {
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [abierto, onClose]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-start sm:place-items-center bg-ink/40 px-3 sm:px-4 py-4 sm:py-12 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[460px] rounded-[18px] border border-rule bg-card shadow-[var(--shadow-3)] overflow-hidden max-h-[calc(100vh-2rem)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-6 px-6 flex items-start gap-4">
          <div
            className={[
              "w-11 h-11 rounded-[12px] grid place-items-center shrink-0",
              "font-display italic font-semibold text-xl",
              tonoIconClasses[tono],
            ].join(" ")}
            aria-hidden
          >
            {tonoIcon[tono]}
          </div>
          <h3 className="font-display font-medium text-[22px] tracking-tight m-0 flex-1">
            {titulo}
          </h3>
        </div>
        {children && <div className="px-6 pt-5 overflow-y-auto">{children}</div>}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-6 py-5">{acciones}</div>
      </div>
    </div>
  );
}
