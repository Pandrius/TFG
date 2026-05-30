"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Tag } from "@/components/ui/Tag";
import { useToast } from "@/components/ui/Toast";
import {
  crearCarpeta,
  eliminarCarpeta,
  renombrarCarpeta,
} from "../carpetas/acciones";
import { actualizarConfidencialidad } from "./acciones";
import { ModalEliminar } from "./ModalEliminar";
import { ModalHacerPublico } from "./ModalHacerPublico";
import { ModalMoverACarpeta } from "./ModalMoverACarpeta";
import { RenombrarInline } from "./RenombrarInline";
import FormularioInvitacion, {
  type UsuarioInvitable,
} from "../documentos/[id]/FormularioInvitacion";

export interface DocumentoExplorador {
  id: string;
  nombre: string;
  tipo_archivo: string | null;
  confidencialidad: number | null;
  tamano_bytes: number | null;
  fecha: string;
  carpeta_id: string | null;
}

export interface CarpetaExplorador {
  id: string;
  nombre: string;
  parent_id: string | null;
}

interface Props {
  documentos: DocumentoExplorador[];
  carpetas: CarpetaExplorador[];
  carpetaActualId: string | null;
  usuariosInvitables: UsuarioInvitable[];
}

type Filtro = "todos" | "privados" | "publicos";
type MenuDoc = { id: string; x: number; y: number } | null;
type MenuCarpeta = { id: string; x: number; y: number } | null;

const ETIQUETAS_FILTRO: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "privados", label: "Privados" },
  { id: "publicos", label: "Publicos" },
];

export function ExploradorDocumentos({
  documentos,
  carpetas,
  carpetaActualId,
  usuariosInvitables,
}: Props) {
  const router = useRouter();
  const { mostrar } = useToast();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [modalPublico, setModalPublico] = useState<DocumentoExplorador | null>(null);
  const [modalBorrar, setModalBorrar] = useState<DocumentoExplorador | null>(null);
  const [modalMover, setModalMover] = useState<DocumentoExplorador | null>(null);
  const [modalEnviar, setModalEnviar] = useState<DocumentoExplorador | null>(null);
  const [menuDoc, setMenuDoc] = useState<MenuDoc>(null);
  const [menuCarpeta, setMenuCarpeta] = useState<MenuCarpeta>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [descargando, setDescargando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [nombreNueva, setNombreNueva] = useState("");
  const [guardandoCarpeta, setGuardandoCarpeta] = useState(false);
  const [carpetaEditando, setCarpetaEditando] = useState<CarpetaExplorador | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const inputNuevaRef = useRef<HTMLInputElement>(null);

  const carpetasPorId = useMemo(
    () => new Map(carpetas.map((carpeta) => [carpeta.id, carpeta])),
    [carpetas],
  );
  const carpetaActual = carpetaActualId ? carpetasPorId.get(carpetaActualId) ?? null : null;

  const carpetasActuales = carpetas
    .filter((carpeta) => carpeta.parent_id === carpetaActualId)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const documentosActuales = documentos.filter((doc) => (doc.carpeta_id ?? null) === carpetaActualId);
  const documentosFiltrados = documentosActuales.filter((doc) => {
    if (filtro === "privados") return (doc.confidencialidad ?? 1) === 1;
    if (filtro === "publicos") return (doc.confidencialidad ?? 1) === 0;
    return true;
  });

  const rutasCarpetas = useMemo(() => {
    const cache = new Map<string, string>();
    const resolver = (carpeta: CarpetaExplorador): string => {
      const previa = cache.get(carpeta.id);
      if (previa) return previa;
      const padre = carpeta.parent_id ? carpetasPorId.get(carpeta.parent_id) : null;
      const ruta = padre ? `${resolver(padre)} / ${carpeta.nombre}` : carpeta.nombre;
      cache.set(carpeta.id, ruta);
      return ruta;
    };

    return carpetas.map((carpeta) => ({
      id: carpeta.id,
      nombre: resolver(carpeta),
    }));
  }, [carpetas, carpetasPorId]);

  const migas = useMemo(() => {
    const items: CarpetaExplorador[] = [];
    let actual = carpetaActual;
    while (actual) {
      items.unshift(actual);
      actual = actual.parent_id ? carpetasPorId.get(actual.parent_id) ?? null : null;
    }
    return items;
  }, [carpetaActual, carpetasPorId]);

  const cambiarAPrivado = async (doc: DocumentoExplorador) => {
    const fd = new FormData();
    fd.append("doc_id", doc.id);
    fd.append("nueva", "1");
    const res = await actualizarConfidencialidad(undefined, fd);
    if (res && "ok" in res) mostrar({ variant: "ok", titulo: res.ok });
    else if (res && "error" in res) mostrar({ variant: "err", titulo: res.error });
  };

  const crearNuevaCarpeta = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = nombreNueva.trim();
    if (!nombre) return;

    setGuardandoCarpeta(true);
    const fd = new FormData();
    fd.append("nombre", nombre);
    if (carpetaActualId) fd.append("parent_id", carpetaActualId);

    const res = await crearCarpeta(undefined, fd);
    setGuardandoCarpeta(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      setNombreNueva("");
      setCreando(false);
      router.refresh();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  const abrirRenombrarCarpeta = (carpeta: CarpetaExplorador) => {
    setCarpetaEditando(carpeta);
    setNombreEditado(carpeta.nombre);
    setMenuCarpeta(null);
  };

  const guardarRenombreCarpeta = async () => {
    if (!carpetaEditando) return;
    const nombre = nombreEditado.trim();
    if (!nombre) return;

    setGuardandoCarpeta(true);
    const fd = new FormData();
    fd.append("carpeta_id", carpetaEditando.id);
    fd.append("nombre", nombre);
    const res = await renombrarCarpeta(undefined, fd);
    setGuardandoCarpeta(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      setCarpetaEditando(null);
      router.refresh();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  const borrarCarpeta = async (carpeta: CarpetaExplorador) => {
    setMenuCarpeta(null);
    if (!window.confirm(`Eliminar la carpeta "${carpeta.nombre}"? Sus documentos quedaran sin carpeta.`)) {
      return;
    }
    const res = await eliminarCarpeta(carpeta.id);
    if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
      return;
    }
    mostrar({ variant: "ok", titulo: "Carpeta eliminada." });
    if (carpetaActualId === carpeta.id) router.push("/mis-documentos");
    else router.refresh();
  };

  const abrirMenu = (
    id: string,
    boton: HTMLButtonElement,
    tipo: "doc" | "carpeta",
  ) => {
    const rect = boton.getBoundingClientRect();
    const anchoMenu = 176;
    const menu = {
      id,
      x: Math.max(12, Math.min(rect.right - anchoMenu, window.innerWidth - anchoMenu - 12)),
      y: Math.min(rect.bottom + 6, window.innerHeight - 150),
    };
    if (tipo === "doc") {
      setMenuDoc(menuDoc?.id === id ? null : menu);
      setMenuCarpeta(null);
    } else {
      setMenuCarpeta(menuCarpeta?.id === id ? null : menu);
      setMenuDoc(null);
    }
  };

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (seleccionados.size === documentosFiltrados.length) setSeleccionados(new Set());
    else setSeleccionados(new Set(documentosFiltrados.map((doc) => doc.id)));
  };

  const descargarSeleccionados = async () => {
    if (seleccionados.size === 0 || descargando) return;
    setDescargando(true);
    try {
      const res = await fetch("/api/descargar-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...seleccionados] }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        mostrar({ variant: "err", titulo: data.error ?? "Error al descargar." });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "documentos.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSeleccionados(new Set());
    } catch {
      mostrar({ variant: "err", titulo: "Error de red al descargar." });
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
      <div className="flex flex-col gap-4 px-5 py-4 border-b border-rule">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-mute">
              <button
                type="button"
                onClick={() => router.push("/mis-documentos")}
                className="hover:text-accent"
              >
                Mi unidad
              </button>
              {migas.map((carpeta) => (
                <span key={carpeta.id} className="inline-flex items-center gap-1.5">
                  <span>/</span>
                  <button
                    type="button"
                    onClick={() => router.push(`/mis-documentos?carpeta=${carpeta.id}`)}
                    className="max-w-[180px] truncate hover:text-accent"
                  >
                    {carpeta.nombre}
                  </button>
                </span>
              ))}
            </div>
            <h3 className="font-display font-medium text-lg tracking-[-0.01em] m-0 mt-1">
              {carpetaActual?.nombre ?? "Todos tus archivos"}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex bg-soft rounded-full p-[3px] gap-[2px]">
              {ETIQUETAS_FILTRO.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setFiltro(item.id);
                    setSeleccionados(new Set());
                  }}
                  className={[
                    "px-3 py-[5px] rounded-full text-xs font-medium transition-colors",
                    filtro === item.id ? "bg-card text-ink" : "text-mute hover:text-ink",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                setCreando(true);
                window.setTimeout(() => inputNuevaRef.current?.focus(), 0);
              }}
            >
              + Carpeta
            </Button>
          </div>
        </div>

        {creando && (
          <form onSubmit={crearNuevaCarpeta} className="flex flex-col gap-2 sm:flex-row">
            <Input
              ref={inputNuevaRef}
              value={nombreNueva}
              onChange={(e) => setNombreNueva(e.target.value)}
              placeholder={carpetaActualId ? "Nombre de la subcarpeta" : "Nombre de la carpeta"}
              maxLength={100}
              disabled={guardandoCarpeta}
              className="flex-1"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={guardandoCarpeta}
              disabled={!nombreNueva.trim()}
            >
              Crear
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => {
                setCreando(false);
                setNombreNueva("");
              }}
              disabled={guardandoCarpeta}
            >
              Cancelar
            </Button>
          </form>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[28px_44px_1fr_120px_100px_120px_68px] items-center px-5 py-2.5 gap-3.5 bg-soft text-mute font-display italic text-xs border-b border-rule">
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={documentosFiltrados.length > 0 && seleccionados.size === documentosFiltrados.length}
                onChange={toggleTodos}
                className="w-4 h-4 cursor-pointer accent-[var(--accent)]"
                aria-label="Seleccionar todos"
              />
            </div>
            <div></div>
            <div>Nombre</div>
            <div>Estado</div>
            <div>Tamano</div>
            <div>Modificado</div>
            <div></div>
          </div>

          {carpetasActuales.map((carpeta) => (
            <div
              key={carpeta.id}
              className="grid grid-cols-[28px_44px_1fr_120px_100px_120px_68px] items-center px-5 py-3 gap-3.5 border-b border-rule text-[13px]"
            >
              <div />
              <span className="w-9 h-9 rounded-[8px] border border-rule bg-card grid place-items-center text-accent font-semibold">
                /
              </span>
              <Link
                href={`/mis-documentos?carpeta=${carpeta.id}`}
                className="font-medium hover:text-accent transition-colors truncate"
              >
                {carpeta.nombre}
              </Link>
              <span className="text-mute text-[12px]">Carpeta</span>
              <span className="text-mute font-mono text-[12px]">
                {documentos.filter((doc) => doc.carpeta_id === carpeta.id).length} docs
              </span>
              <span className="text-mute font-mono text-[12px]">
                {carpetas.filter((item) => item.parent_id === carpeta.id).length} subcarp.
              </span>
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => abrirMenu(carpeta.id, e.currentTarget, "carpeta")}
                  className="text-mute hover:text-ink px-1.5 py-1 rounded-[6px] hover:bg-soft"
                  aria-label="Mas acciones"
                >
                  ...
                </button>
                {menuCarpeta?.id === carpeta.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuCarpeta(null)} />
                    <div
                      className="fixed z-50 bg-card border border-rule rounded-[10px] shadow-[var(--shadow-2)] py-1 w-44"
                      style={{ left: menuCarpeta.x, top: menuCarpeta.y }}
                    >
                      <Link
                        href={`/mis-documentos?carpeta=${carpeta.id}`}
                        className="block px-3 py-1.5 text-[13px] hover:bg-soft"
                      >
                        Abrir
                      </Link>
                      <button
                        type="button"
                        onClick={() => abrirRenombrarCarpeta(carpeta)}
                        className="block w-full text-left px-3 py-1.5 text-[13px] hover:bg-soft"
                      >
                        Renombrar
                      </button>
                      <button
                        type="button"
                        onClick={() => void borrarCarpeta(carpeta)}
                        className="block w-full text-left px-3 py-1.5 text-[13px] text-danger hover:bg-danger-tint"
                      >
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

          {documentosFiltrados.map((doc) => {
            const tipo = (doc.tipo_archivo ?? "").toUpperCase();
            const esPublico = (doc.confidencialidad ?? 1) === 0;
            const fecha = new Date(doc.fecha).toLocaleDateString("es-ES");
            const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;

            return (
              <div
                key={doc.id}
              className="grid grid-cols-[28px_44px_1fr_120px_100px_120px_68px] items-center px-5 py-3 gap-3.5 border-b border-rule last:border-b-0 text-[13px]"
              >
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={seleccionados.has(doc.id)}
                    onChange={() => toggleSeleccion(doc.id)}
                    className="w-4 h-4 cursor-pointer accent-[var(--accent)]"
                    aria-label={`Seleccionar ${doc.nombre}`}
                  />
                </div>
                <span className="w-9 h-11 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent">
                  {tipo.slice(0, 3) || "?"}
                </span>
                <div className="min-w-0">
                  <RenombrarInline docId={doc.id} nombre={doc.nombre} />
                  <div className="text-mute text-[11px] font-mono mt-0.5">
                    {carpetaActual ? carpetaActual.nombre : "Mi unidad"} - {tipo.toLowerCase() || "-"}
                  </div>
                </div>
                <div>
                  {esPublico ? (
                    <button type="button" onClick={() => void cambiarAPrivado(doc)}>
                      <Tag variant="pub">publico</Tag>
                    </button>
                  ) : (
                    <button type="button" onClick={() => setModalPublico(doc)}>
                      <Tag variant="priv">privado</Tag>
                    </button>
                  )}
                </div>
                <div className="text-mute font-mono text-[12px]">
                  {kb !== null ? `${kb} KB` : "-"}
                </div>
                <div className="text-mute font-mono text-[12px]">{fecha}</div>
                <div className="relative flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setModalEnviar(doc)}
                    className="text-mute hover:text-ink px-1.5 py-1 rounded-[6px] hover:bg-soft"
                    aria-label={`Enviar ${doc.nombre}`}
                    title="Enviar"
                  >
                    <IconoEnviar />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => abrirMenu(doc.id, e.currentTarget, "doc")}
                    className="text-mute hover:text-ink px-1.5 py-1 rounded-[6px] hover:bg-soft"
                    aria-label="Mas acciones"
                  >
                    ...
                  </button>
                  {menuDoc?.id === doc.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuDoc(null)} />
                      <div
                        className="fixed z-50 bg-card border border-rule rounded-[10px] shadow-[var(--shadow-2)] py-1 w-44"
                        style={{ left: menuDoc.x, top: menuDoc.y }}
                      >
                        <Link
                          href={`/documentos/${doc.id}`}
                          className="block px-3 py-1.5 text-[13px] hover:bg-soft"
                          onClick={() => setMenuDoc(null)}
                        >
                          Ver detalle
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setModalMover(doc);
                            setMenuDoc(null);
                          }}
                          className="block w-full text-left px-3 py-1.5 text-[13px] hover:bg-soft"
                        >
                          Mover a carpeta
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setModalBorrar(doc);
                            setMenuDoc(null);
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
          })}

          {carpetasActuales.length === 0 && documentosFiltrados.length === 0 && (
            <div className="px-5 py-10 text-center text-mute text-sm">
              Esta ubicacion esta vacia.
            </div>
          )}
        </div>
      </div>

      {carpetaEditando && (
        <Modal
          abierto={carpetaEditando !== null}
          onClose={() => setCarpetaEditando(null)}
          titulo="Renombrar carpeta"
          acciones={
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCarpetaEditando(null)}
                disabled={guardandoCarpeta}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={guardarRenombreCarpeta}
                loading={guardandoCarpeta}
                disabled={!nombreEditado.trim()}
              >
                Guardar
              </Button>
            </>
          }
        >
          <Input
            value={nombreEditado}
            onChange={(e) => setNombreEditado(e.target.value)}
            maxLength={100}
            autoFocus
          />
        </Modal>
      )}

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
      {modalMover && (
        <ModalMoverACarpeta
          abierto={modalMover !== null}
          onClose={() => setModalMover(null)}
          docId={modalMover.id}
          nombre={modalMover.nombre}
          carpetas={rutasCarpetas}
        />
      )}
      {modalEnviar && (
        <Modal
          abierto={modalEnviar !== null}
          onClose={() => setModalEnviar(null)}
          titulo="Enviar documento"
          acciones={
            <Button type="button" variant="ghost" onClick={() => setModalEnviar(null)}>
              Cerrar
            </Button>
          }
        >
          <div className="flex flex-col gap-3">
            <p className="text-mute text-[13px]">
              Enviar <span className="font-medium text-ink">{modalEnviar.nombre}</span> a:
            </p>
            <FormularioInvitacion
              documentoId={modalEnviar.id}
              usuarios={usuariosInvitables}
              onEnviado={() => setModalEnviar(null)}
            />
          </div>
        </Modal>
      )}

      {seleccionados.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-card border border-rule rounded-full shadow-[var(--shadow-2)] px-5 py-3 flex items-center gap-4">
          <span className="text-[13px] font-medium">
            {seleccionados.size} seleccionado{seleccionados.size !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={descargarSeleccionados}
            disabled={descargando}
            className="flex items-center gap-1.5 text-[13px] font-medium text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
          >
            {descargando ? "Descargando..." : `Descargar (${seleccionados.size})`}
          </button>
          <button
            type="button"
            onClick={() => setSeleccionados(new Set())}
            className="text-mute hover:text-ink text-[13px] font-mono transition-colors"
            aria-label="Deseleccionar todo"
          >
            x
          </button>
        </div>
      )}
    </div>
  );
}

function IconoEnviar() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}
