import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent-soft text-accent hover:bg-accent-soft-hover hover:text-accent-hover",
  accent: "bg-accent text-white hover:bg-accent-hover",
  ghost: "bg-transparent text-ink border border-rule hover:bg-soft",
  danger: "bg-danger text-white hover:bg-[#6F1E16]",
  link: "bg-transparent text-accent border-b border-accent-soft hover:border-accent rounded-none px-0",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    className = "",
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center gap-2 rounded-full font-medium",
        "transition-colors duration-100",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-tint",
        "disabled:opacity-45 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
      {...rest}
    >
      {loading && (
        <span
          className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
});
