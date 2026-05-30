"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type Variant = "ok" | "warn" | "err";

interface ToastData {
  id: number;
  variant: Variant;
  titulo: string;
  detalle?: string;
}

interface ToastContextValue {
  mostrar: (toast: Omit<ToastData, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const mostrar = useCallback((toast: Omit<ToastData, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const cerrar = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ mostrar }}>
      {children}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-6 sm:right-6 z-50 flex flex-col gap-2 sm:max-w-sm">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => cerrar(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const variantStyles: Record<
  Variant,
  { bg: string; fg: string; icon: string }
> = {
  ok: { bg: "bg-accent-soft", fg: "text-accent", icon: "✓" },
  warn: { bg: "bg-oro-soft", fg: "text-oro", icon: "!" },
  err: { bg: "bg-danger-soft", fg: "text-danger", icon: "✕" },
};

function ToastItem({
  toast,
  onClose,
}: {
  toast: ToastData;
  onClose: () => void;
}) {
  const styles = variantStyles[toast.variant];
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-[10px] border border-rule bg-card px-4 py-3.5 shadow-[var(--shadow-2)]"
    >
      <span
        className={[
          "w-6 h-6 rounded-full grid place-items-center text-sm font-semibold shrink-0",
          styles.bg,
          styles.fg,
        ].join(" ")}
        aria-hidden
      >
        {styles.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium m-0">{toast.titulo}</p>
        {toast.detalle && (
          <p className="text-xs text-mute mt-0.5 leading-snug">{toast.detalle}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar notificación"
        className="text-mute hover:text-ink text-xs font-mono"
      >
        ✕
      </button>
    </div>
  );
}
