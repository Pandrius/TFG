type Props = {
  probabilidad: number | null | undefined;
  tipoArchivo?: string | null;
  confidencialidad?: number | null;
};

export function FiabilidadModelo({
  probabilidad,
  tipoArchivo,
  confidencialidad,
}: Props) {
  const valor = obtenerFiabilidadMostrada(probabilidad, tipoArchivo, confidencialidad);
  const texto = valor === null ? "N/D" : `${Math.round(valor * 100)}%`;

  return (
    <span
      className="shrink-0 rounded-full border border-rule bg-soft px-2 py-0.5 text-[10px] font-mono text-mute"
      title={valor === null ? "Fiabilidad no disponible" : "Fiabilidad de la clasificacion"}
    >
      {texto}
    </span>
  );
}

function obtenerFiabilidadMostrada(
  probabilidad: number | null | undefined,
  tipoArchivo?: string | null,
  confidencialidad?: number | null,
) {
  if (typeof probabilidad === "number") return probabilidad;

  const tipo = (tipoArchivo ?? "").toLowerCase();
  const esAudio = ["wav", "mp3", "mpeg", "m4a", "mp4", "aiff", "flac"].includes(tipo);
  const esPrivado = (confidencialidad ?? 1) === 1;
  return esAudio && esPrivado ? 1 : null;
}
