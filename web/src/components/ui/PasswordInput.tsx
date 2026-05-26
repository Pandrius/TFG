"use client";

import { useState, forwardRef, type InputHTMLAttributes } from "react";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  error?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, Props>(
  function PasswordInput({ error = false, className = "", ...rest }, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={[
            "w-full rounded-[10px] border bg-card px-3.5 py-2.5 pr-10",
            "text-sm text-ink placeholder:text-mute",
            "transition-[border-color,box-shadow] duration-100",
            "focus:outline-none focus:ring-3",
            error
              ? "border-danger focus:ring-danger-tint"
              : "border-rule focus:border-accent focus:ring-accent-tint",
            className,
          ].join(" ")}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-mute hover:text-ink"
        >
          {visible ? "ocultar" : "mostrar"}
        </button>
      </div>
    );
  },
);
