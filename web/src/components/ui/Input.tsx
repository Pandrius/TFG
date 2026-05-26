import { forwardRef, type InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { error = false, className = "", ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={[
        "w-full rounded-[10px] border bg-card px-3.5 py-2.5",
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
  );
});
