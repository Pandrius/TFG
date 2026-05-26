import { calcularIniciales } from "@/lib/perfil/iniciales";

type Size = "sm" | "md" | "lg" | "xl";

interface Props {
  nombreCompleto: string | null;
  nombreUsuario: string;
  avatarUrl?: string | null;
  size?: Size;
}

const sizeClasses: Record<Size, string> = {
  sm: "w-6 h-6 text-[11px]",
  md: "w-8 h-8 text-[13px]",
  lg: "w-11 h-11 text-[17px]",
  xl: "w-24 h-24 text-3xl",
};

export function Avatar({
  nombreCompleto,
  nombreUsuario,
  avatarUrl,
  size = "md",
}: Props) {
  const iniciales = calcularIniciales(nombreCompleto, nombreUsuario);
  const baseClasses = [
    "inline-grid place-items-center rounded-full overflow-hidden",
    sizeClasses[size],
  ].join(" ");

  if (avatarUrl) {
    return (
      <span className={baseClasses}>
        <img
          src={avatarUrl}
          alt={nombreCompleto ?? nombreUsuario}
          className="w-full h-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={[
        baseClasses,
        "bg-accent-soft text-accent font-display italic font-medium",
      ].join(" ")}
      aria-label={nombreCompleto ?? nombreUsuario}
    >
      {iniciales}
    </span>
  );
}
