"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  badgeKey?: "buzon";
};

const items: NavItem[] = [
  { href: "/ajustes", label: "Ajustes" },
  { href: "/amigos", label: "Amigos" },
  { href: "/buzon", label: "Buzon", badgeKey: "buzon" },
  { href: "/compartidos", label: "Compartidos" },
  { href: "/explorar", label: "Explorar" },
  { href: "/mis-documentos", label: "Mis documentos" },
  { href: "/organizaciones", label: "Organizaciones" },
  { href: "/perfil", label: "Perfil" },
];

export function SidebarNav({
  onItemClick,
  pendientesBuzon = 0,
}: {
  onItemClick?: () => void;
  pendientesBuzon?: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const activo =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={[
              "flex items-center px-[10px] py-[7px] rounded-[10px] text-[14px] transition-colors",
              activo
                ? "bg-accent-soft text-accent"
                : "text-ink-soft hover:bg-soft hover:text-ink",
            ].join(" ")}
          >
            <span className="flex items-center gap-2 min-w-0">
              {item.badgeKey === "buzon" && (
                <span aria-hidden="true" className="w-4 h-4 grid place-items-center">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                  </svg>
                </span>
              )}
              <span className="truncate">{item.label}</span>
            </span>
            {item.badgeKey === "buzon" && pendientesBuzon > 0 && (
              <span
                className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-mono font-semibold leading-[18px] text-center"
                aria-label={`${pendientesBuzon} pendientes`}
              >
                {pendientesBuzon > 99 ? "99+" : pendientesBuzon}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
