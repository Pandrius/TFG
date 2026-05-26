interface Props {
  /** Porcentaje 0..100 a rellenar. */
  porcentaje: number;
}

/** Anillo conic-gradient que muestra un porcentaje (0..100) en el color accent. */
export function KpiAnillo({ porcentaje }: Props) {
  const p = Math.max(0, Math.min(100, porcentaje));
  return (
    <div
      className="relative w-9 h-9 rounded-full grid place-items-center"
      style={{
        background: `conic-gradient(var(--accent) ${p}%, var(--accent-soft) 0)`,
      }}
      aria-hidden
    >
      <div className="w-[26px] h-[26px] rounded-full bg-paper grid place-items-center">
        <span className="font-mono text-[10px] font-medium text-accent">
          {Math.round(p)}
        </span>
      </div>
    </div>
  );
}
