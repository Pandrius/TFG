"use client";

import { useState } from "react";
import Link from "next/link";
import { SidebarNav } from "./SidebarNav";
import { BuscadorTrigger } from "./BuscadorTrigger";
import { Avatar } from "@/components/ui/Avatar";
import { cerrarSesion } from "@/app/(auth)/acciones";

interface Props {
  children: React.ReactNode;
  perfil: {
    nombre_usuario: string;
    nombre_completo: string | null;
    avatar_url: string | null;
  } | null;
  userEmail: string;
}

export function AppLayoutClient({ children, perfil, userEmail }: Props) {
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  const nombreMostrado =
    perfil?.nombre_completo ?? perfil?.nombre_usuario ?? userEmail;

  const SidebarContent = () => (
    <>
      <div className="flex items-center justify-between mb-[22px] px-1">
        <Link
          href="/inicio"
          className="font-display font-semibold text-[22px] tracking-tight block"
          onClick={() => setSidebarAbierto(false)}
        >
          Dr<em className="italic text-accent">es</em>.
        </Link>
        <button
          className="md:hidden text-mute p-1"
          onClick={() => setSidebarAbierto(false)}
          aria-label="Cerrar menú"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <BuscadorTrigger />

      <div className="flex-1 overflow-y-auto">
        <SidebarNav onItemClick={() => setSidebarAbierto(false)} />
      </div>

      {/* ── Usuario / pie de sidebar ── */}
      <div className="mt-auto pt-[18px] border-t border-rule">
        <Link
          href="/perfil"
          className="flex items-center gap-[10px] px-1 py-2 rounded-[10px] hover:bg-soft transition-colors"
          onClick={() => setSidebarAbierto(false)}
        >
          <Avatar
            nombreCompleto={perfil?.nombre_completo ?? null}
            nombreUsuario={perfil?.nombre_usuario ?? userEmail}
            avatarUrl={perfil?.avatar_url ?? null}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate">
              {nombreMostrado}
            </div>
            <div className="text-mute text-[11px] truncate">{userEmail}</div>
          </div>
        </Link>
        <form action={cerrarSesion}>
          <button
            type="submit"
            className="w-full text-left px-[10px] py-[7px] text-[13px] text-mute hover:text-ink rounded-[10px] hover:bg-soft transition-colors"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="flex-1 flex flex-col md:grid md:grid-cols-[232px_1fr] min-h-screen">
      {/* ── Mobile Header ────────────────────────── */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-paper border-b border-rule sticky top-0 z-30">
        <Link href="/inicio" className="font-display font-semibold text-[20px] tracking-tight">
          Dr<em className="italic text-accent">es</em>.
        </Link>
        <button
          onClick={() => setSidebarAbierto(true)}
          className="p-1 text-ink-soft"
          aria-label="Abrir menú"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </header>

      {/* ── Sidebar (Desktop) ────────────────────────── */}
      <aside className="hidden md:flex sticky top-0 h-screen overflow-y-auto bg-paper border-r border-rule flex-col px-4 py-[22px]">
        <SidebarContent />
      </aside>

      {/* ── Sidebar (Mobile Overlay) ─────────────────── */}
      {sidebarAbierto && (
        <>
          <div
            className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarAbierto(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-[280px] bg-paper z-50 md:hidden flex flex-col px-4 py-[22px] shadow-xl animate-in slide-in-from-left duration-300">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* ── Contenido principal ────────────────────────── */}
      <main className="bg-card flex-1 min-w-0">{children}</main>
    </div>
  );
}
