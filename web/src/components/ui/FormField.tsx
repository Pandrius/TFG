import type { ReactNode } from "react";

interface Props {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ label, htmlFor, hint, error, children }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="font-display italic text-[13px] text-ink-soft"
      >
        {label}
      </label>
      {children}
      {error && (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      )}
      {!error && hint && <span className="text-xs text-mute">{hint}</span>}
    </div>
  );
}
