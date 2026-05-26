import type { ReactNode } from "react";

interface Props {
  /** Etiqueta en Fraunces italic, encima del valor. */
  label: string;
  /** Valor grande. Puede ser número, string formateado o JSX (para resaltar). */
  valor: ReactNode;
  /** Texto pequeño bajo el valor (descripción del KPI). */
  pista?: string;
  /** Texto pequeño en accent a la derecha del pista (e.g. "+3 hoy"). */
  delta?: string;
  /** Slot a la derecha para `KpiAnillo` u otro indicador visual. */
  visual?: ReactNode;
}

export function Kpi({ label, valor, pista, delta, visual }: Props) {
  return (
    <div className="relative rounded-[14px] border border-rule bg-paper px-[18px] py-4">
      <div className="font-display italic text-[13px] text-mute mb-1.5">
        {label}
      </div>
      <div className="font-display text-[30px] font-medium tracking-[-0.02em] leading-none">
        {valor}
      </div>
      {(pista || delta) && (
        <div className="flex justify-between items-center mt-2 text-xs text-mute">
          {pista && <span>{pista}</span>}
          {delta && (
            <span className="font-mono text-[11px] text-accent">{delta}</span>
          )}
        </div>
      )}
      {visual && <div className="absolute top-4 right-4">{visual}</div>}
    </div>
  );
}
