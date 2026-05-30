"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const grupos = [
  {
    label: "Personal",
    items: [
      { href: "/mis-documentos", label: "Mis documentos" },
      { href: "/carpetas", label: "Carpetas" },
    ],
  },
  {
    label: "Colaboración",
    items: [
      { href: "/compartidos", label: "Compartidos" },
      { href: "/amigos", label: "Amigos" },
      { href: "/organizaciones", label: "Organizaciones" },
      { href: "/explorar", label: "Explorar" },
    ],
  },
  {
    label: "Cuenta",
    items: [
      { href: "/perfil", label: "Perfil" },
      { href: "/ajustes", label: "Ajustes" },
    ],
  },
];

export function SidebarNav({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col">
      {grupos.map((grupo) => (
        <div key={grupo.label}>
          <div className="font-display italic text-[13px] text-mute mt-[14px] mb-1 px-[6px]">
            {grupo.label}
          </div>
          {grupo.items.map((item) => {
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
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
