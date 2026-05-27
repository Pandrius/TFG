"use client";

import { useState } from "react";
import Link from "next/link";

import { Tag } from "@/components/ui/Tag";
import { useToast } from "@/components/ui/Toast";

import { actualizarConfidencialidad } from "./acciones";
import { ModalHacerPublico } from "./ModalHacerPublico";
import { ModalEliminar } from "./ModalEliminar";
import { RenombrarInline } from "./RenombrarInline";

export interface DocumentoFila {
  id: string;
  nombre: string;
  tipo_archivo: string | null;
  confidencialidad: number | null;
  tamano_bytes: number | null;
  fecha: string;
}

interface Props {
  documentos: DocumentoFila[];
}

type Filtro = "todos" | "privados" | "publicos";

const ETIQUETAS_FILTRO: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "privados", label: "Privados" },
  { id: "publicos", label: "Públicos" },
];

export function TablaDocumentos({ documentos }: Props) {
  const { mostrar } = useToast();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [modalPublico, setModalPublico] = useState<DocumentoFila | null>(null);
  const [modalBorrar, setModalBorrar] = useState<DocumentoFila | null>(null);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);

  const filtrados = documentos.filter((d) => {
    if (filtro === "privados") return (d.confidencialidad ?? 1) === 1;
    if (filtro === "publicos") return (d.confidencialidad ?? 1) === 0;
    return true;
  });

  const cambiarAPrivado = async (doc: DocumentoFila) => {
    const fd = new FormData();
    fd.append("doc_id", doc.id);
    fd.append("nueva", "1");
    const res = await actualizarConfidencialidad(undefined, fd);
    if (res && "ok" in res) mostrar({ variant: "ok", titulo: res.ok });
    else if (res && "error" in res)
      mostrar({ variant: "err", titulo: res.error });
  };

  return (
    <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
      {/* Cabecera con filtros */}
      <div className="flex justify-between items-center px-5 py-4 border-b border-rule">
        <h3 className="font-display font-medium text-lg tracking-[-0.01em] m-0">
          Todos los <em className="italic text-accent">documentos</em>
        </h3>
        <div className="inline-flex bg-soft rounded-full p-[3px] gap-[2px]">
          {ETIQUETAS_FILTRO.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={[
                "px-3 py-[5px] rounded-full text-xs font-medium transition-colors",
                filtro === f.id
                  ? "bg-card text-ink"
                  : "text-mute hover:text-ink",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cabecera tabla */}
      <div className="grid grid-cols-[44px_1fr_120px_100px_120px_30px] items-center px-5 py-2.5 gap-3.5 bg-soft text-mute font-display italic text-xs border-b border-rule">
        <div></div>
        <div>Documento</div>
        <div>Estado</div>
        <div>Tamaño</div>
        <div>Modificado</div>
        <div></div>
      </div>

      {/* Filas */}
      {filtrados.length === 0 ? (
        <div className="px-5 py-10 text-center text-mute text-sm">
          No hay documentos en este filtro.
        </div>
      ) : (
        filtrados.map((doc) => {
          const tipo = (doc.tipo_archivo ?? "").toUpperCase();
          const esPublico = (doc.confidencialidad ?? 1) === 0;
          const fecha = new Date(doc.fecha).toLocaleDateString("es-ES");
          const kb = doc.tamano_bytes
            ? Math.round(doc.tamano_bytes / 1024)
            : null;

          return (
            <div
              key={doc.id}
              className="grid grid-cols-[44px_1fr_120px_100px_120px_30px] items-center px-5 py-3 gap-3.5 border-b border-rule last:border-b-0 text-[13px]"
            >
              <span className="w-9 h-11 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent">
                {tipo.slice(0, 3) || "?"}
              </span>
              <div className="min-w-0">
                <RenombrarInline docId={doc.id} nombre={doc.nombre} />
                <div className="text-mute text-[11px] font-mono mt-0.5">
                  /personal · {tipo.toLowerCase() || "—"}
                </div>
              </div>
              <div>
                {esPublico ? (
                  <button
                    type="button"
                    onClick={() => void cambiarAPrivado(doc)}
                    title="Click para hacer privado"
                  >
                    <Tag variant="pub">público</Tag>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setModalPublico(doc)}
                    title="Click para hacer público"
                  >
                    <Tag variant="priv">privado</Tag>
                  </button>
                )}
              </div>
              <div className="text-mute font-mono text-[12px]">
                {kb !== null ? `${kb} KB` : "—"}
              </div>
              <div className="text-mute font-mono text-[12px]">{fecha}</div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setMenuAbierto(menuAbierto === doc.id ? null : doc.id)
                  }
                  className="text-mute hover:text-ink px-1.5 py-1 rounded-[6px] hover:bg-soft"
                  aria-label="Más acciones"
                >
                  ⋯
                </button>
                {menuAbierto === doc.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuAbierto(null)}
                    />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-rule rounded-[10px] shadow-[var(--shadow-2)] py-1 min-w-[160px]">
                      <Link
                        href={`/documentos/${doc.id}`}
                        className="block px-3 py-1.5 text-[13px] hover:bg-soft"
                        onClick={() => setMenuAbierto(null)}
                      >
                        Ver detalle
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setModalBorrar(doc);
                          setMenuAbierto(null);
                        }}
                        className="block w-full text-left px-3 py-1.5 text-[13px] text-danger hover:bg-danger-tint"
                      >
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Modales */}
      {modalPublico && (
        <ModalHacerPublico
          abierto={modalPublico !== null}
          onClose={() => setModalPublico(null)}
          docId={modalPublico.id}
          nombre={modalPublico.nombre}
          tipo={modalPublico.tipo_archivo ?? ""}
        />
      )}
      {modalBorrar && (
        <ModalEliminar
          abierto={modalBorrar !== null}
          onClose={() => setModalBorrar(null)}
          docId={modalBorrar.id}
          nombre={modalBorrar.nombre}
        />
      )}
    </div>
  );
}
