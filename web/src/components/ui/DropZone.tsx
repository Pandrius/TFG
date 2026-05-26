"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";

interface Props {
  /** Callback con los ficheros seleccionados (drop o picker). */
  onArchivos: (archivos: File[]) => void;
  /** Tipos MIME / extensiones aceptadas (separadas por coma). */
  accept?: string;
  /** Permite seleccionar varios ficheros a la vez. */
  multiple?: boolean;
  /** Deshabilita interacción cuando true. */
  disabled?: boolean;
  /** Slot del contenido visual (icono + textos). */
  children: ReactNode;
}

/** Área draggable reutilizable. Captura drop y click → file picker. */
export function DropZone({
  onArchivos,
  accept,
  multiple = false,
  disabled = false,
  children,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);

  const elegir = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHover(false);
    if (disabled) return;
    onArchivos(Array.from(e.dataTransfer.files));
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={onDrop}
      onClick={elegir}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault();
          elegir();
        }
      }}
      className={[
        "rounded-[14px] border-2 border-dashed p-8 text-center transition-colors",
        "select-none cursor-pointer outline-none",
        "focus-visible:ring-3 focus-visible:ring-accent-tint",
        disabled
          ? "border-rule opacity-50 cursor-not-allowed"
          : hover
          ? "border-accent bg-accent-tint"
          : "border-rule bg-paper hover:border-accent-soft-hover",
      ].join(" ")}
    >
      {children}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const lista = Array.from(e.target.files ?? []);
          e.target.value = "";
          onArchivos(lista);
        }}
      />
    </div>
  );
}
