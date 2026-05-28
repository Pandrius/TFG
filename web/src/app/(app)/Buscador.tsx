"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { ResultadoBusqueda } from "@/app/api/buscar/route";

/* ── icono de tipo de archivo ─────────────────────────────── */
function iconoTipo(tipo: string | null) {
  if (!tipo) return "D";
  const t = tipo.toLowerCase();
  if (t === "pdf") return "P";
  if (t === "docx" || t === "doc") return "W";
  if (t === "xlsx" || t === "xls" || t === "csv") return "X";
  if (t === "pptx" || t === "ppt") return "S";
  return t[0]?.toUpperCase() ?? "D";
}

/* ── tipos de ítem para navegación con teclado ───────────── */
type Item =
  | { tipo: "doc"; id: string; nombre: string; ext: string | null; username: string }
  | { tipo: "carpeta"; id: string; nombre: string; username: string }
  | { tipo: "usuario"; id: string; nombre_usuario: string; nombre_completo: string | null }
  | { tipo: "org"; id: string; nombre: string };

function hrefItem(item: Item) {
  if (item.tipo === "doc") return `/documentos/${item.id}`;
  if (item.tipo === "carpeta") return `/carpetas/${item.id}`;
  if (item.tipo === "usuario") return `/usuarios/${item.id}`;
  return `/organizaciones/${item.id}`;
}

/* ── componente principal ─────────────────────────────────── */
interface Props {
  abierto: boolean;
  onCerrar: () => void;
}

export function Buscador({ abierto, onCerrar }: Props) {
  const router = useRouter();
  const [consulta, setConsulta] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusqueda | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const [montado, setMontado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMontado(true); }, []);

  /* focus al abrir */
  useEffect(() => {
    if (abierto) {
      setConsulta("");
      setResultados(null);
      setCursor(-1);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [abierto]);

  /* cerrar con Escape */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  /* búsqueda con debounce */
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (consulta.trim().length < 2) {
      setResultados(null);
      setCargando(false);
      return;
    }
    setCargando(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/buscar?q=${encodeURIComponent(consulta.trim())}`);
        const data = (await res.json()) as ResultadoBusqueda;
        setResultados(data);
        setCursor(-1);
      } finally {
        setCargando(false);
      }
    }, 280);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [consulta]);

  /* aplanar resultados para navegación por teclado */
  const items: Item[] = [
    ...(resultados?.documentos ?? []).map((d) => ({
      tipo: "doc" as const,
      id: d.id,
      nombre: d.nombre,
      ext: d.tipo_archivo,
      username: d.username,
    })),
    ...(resultados?.carpetas ?? []).map((c) => ({
      tipo: "carpeta" as const,
      id: c.id,
      nombre: c.nombre,
      username: c.username,
    })),
    ...(resultados?.usuarios ?? []).map((u) => ({
      tipo: "usuario" as const,
      id: u.id,
      nombre_usuario: u.nombre_usuario,
      nombre_completo: u.nombre_completo,
    })),
    ...(resultados?.organizaciones ?? []).map((o) => ({
      tipo: "org" as const,
      id: o.id,
      nombre: o.nombre,
    })),
  ];

  const navegar = (item: Item) => {
    onCerrar();
    router.push(hrefItem(item));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && cursor >= 0) {
      e.preventDefault();
      navegar(items[cursor]);
    }
  };

  const hayResultados = resultados &&
    (resultados.documentos.length + resultados.carpetas.length + resultados.usuarios.length + resultados.organizaciones.length) > 0;

  if (!montado || !abierto) return null;

  return createPortal(
    /* backdrop */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      style={{ background: "rgba(15,28,24,0.35)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <div className="w-full max-w-[560px] rounded-[18px] border border-rule bg-card shadow-[var(--shadow-3)] overflow-hidden">
        {/* campo de búsqueda */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-rule">
          <span className="text-mute font-mono text-sm">⌕</span>
          <input
            ref={inputRef}
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar documentos, usuarios, organizaciones…"
            className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-mute outline-none"
          />
          {cargando && (
            <span className="w-4 h-4 rounded-full border-2 border-accent-soft border-t-accent animate-spin" />
          )}
          <kbd
            onClick={onCerrar}
            className="font-mono text-[10px] bg-soft px-1.5 py-0.5 rounded border border-rule text-mute cursor-pointer hover:bg-rule"
          >
            esc
          </kbd>
        </div>

        {/* resultados */}
        {consulta.trim().length >= 2 && (
          <div className="max-h-[420px] overflow-y-auto py-2">
            {!cargando && !hayResultados && (
              <p className="px-5 py-6 text-center text-[13px] text-mute font-display italic">
                Sin resultados para «{consulta}»
              </p>
            )}

            {/* documentos */}
            {(resultados?.documentos.length ?? 0) > 0 && (
              <GrupoResultados titulo="Documentos">
                {resultados!.documentos.map((d, i) => {
                  const idx = i;
                  return (
                    <FilaResultado
                      key={d.id}
                      activo={cursor === idx}
                      onClick={() => navegar({ tipo: "doc", id: d.id, nombre: d.nombre, ext: d.tipo_archivo, username: d.username })}
                    >
                      <span className="w-7 h-8 rounded-[5px] bg-card border border-rule grid place-items-center font-display italic text-accent text-xs flex-shrink-0">
                        {iconoTipo(d.tipo_archivo)}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium text-[13px] truncate">{d.nombre}</span>
                        <span className="font-mono text-[10px] text-mute truncate block">
                          por @{d.username} {d.tipo_archivo ? `· ${d.tipo_archivo}` : ""}
                        </span>
                      </span>
                    </FilaResultado>
                  );
                })}
              </GrupoResultados>
            )}

            {/* carpetas */}
            {(resultados?.carpetas.length ?? 0) > 0 && (
              <GrupoResultados titulo="Carpetas">
                {resultados!.carpetas.map((c, i) => {
                  const idx = (resultados?.documentos.length ?? 0) + i;
                  return (
                    <FilaResultado
                      key={c.id}
                      activo={cursor === idx}
                      onClick={() => navegar({ tipo: "carpeta", id: c.id, nombre: c.nombre, username: c.username })}
                    >
                      <span className="w-7 h-7 rounded-[8px] bg-accent-tint text-accent grid place-items-center font-display italic text-xs flex-shrink-0">
                        C
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium text-[13px] truncate">{c.nombre}</span>
                        <span className="font-mono text-[10px] text-mute truncate block">
                          por @{c.username}
                        </span>
                      </span>
                    </FilaResultado>
                  );
                })}
              </GrupoResultados>
            )}

            {/* usuarios */}
            {(resultados?.usuarios.length ?? 0) > 0 && (
              <GrupoResultados titulo="Usuarios">
                {resultados!.usuarios.map((u, i) => {
                  const idx = (resultados?.documentos.length ?? 0) + (resultados?.carpetas.length ?? 0) + i;
                  const inicial = (u.nombre_completo ?? u.nombre_usuario)[0]?.toUpperCase() ?? "?";
                  return (
                    <FilaResultado
                      key={u.id}
                      activo={cursor === idx}
                      onClick={() => navegar({ tipo: "usuario", id: u.id, nombre_usuario: u.nombre_usuario, nombre_completo: u.nombre_completo })}
                    >
                      <span className="w-7 h-7 rounded-full bg-accent-soft text-accent grid place-items-center font-display italic text-xs flex-shrink-0">
                        {inicial}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium text-[13px] truncate">
                          {u.nombre_completo ?? u.nombre_usuario}
                        </span>
                        <span className="font-mono text-[10px] text-mute">@{u.nombre_usuario}</span>
                      </span>
                    </FilaResultado>
                  );
                })}
              </GrupoResultados>
            )}

            {/* organizaciones */}
            {(resultados?.organizaciones.length ?? 0) > 0 && (
              <GrupoResultados titulo="Organizaciones">
                {resultados!.organizaciones.map((o, i) => {
                  const idx =
                    (resultados?.documentos.length ?? 0) +
                    (resultados?.carpetas.length ?? 0) +
                    (resultados?.usuarios.length ?? 0) +
                    i;
                  return (
                    <FilaResultado
                      key={o.id}
                      activo={cursor === idx}
                      onClick={() => navegar({ tipo: "org", id: o.id, nombre: o.nombre })}
                    >
                      <span className="w-7 h-7 rounded-[8px] bg-oro-soft text-oro grid place-items-center font-display italic text-xs flex-shrink-0">
                        O
                      </span>
                      <span className="font-medium text-[13px] truncate">{o.nombre}</span>
                    </FilaResultado>
                  );
                })}
              </GrupoResultados>
            )}
          </div>
        )}

        {/* hint inicial */}
        {consulta.trim().length < 2 && (
          <p className="px-5 py-5 text-[12px] text-mute font-display italic">
            Escribe al menos 2 caracteres para buscar…
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ── subcomponentes ───────────────────────────────────────── */
function GrupoResultados({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-5 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-mute">
        {titulo}
      </div>
      {children}
    </div>
  );
}

function FilaResultado({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors",
        activo ? "bg-accent-tint" : "hover:bg-soft",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
