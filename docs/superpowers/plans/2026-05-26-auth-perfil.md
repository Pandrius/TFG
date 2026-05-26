# Auth + perfil — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el flujo completo de autenticación (registro con username+confirm-password, login, recuperación por email) y la pantalla de perfil (avatar con upload opcional, edición de nombre, cambio de contraseña), aplicando por primera vez el sistema de diseño **Esmeralda biblioteca** definido en el sub-proyecto A.

**Architecture:** Server actions de Next.js 16 (App Router con `proxy.ts`) para todo el flujo de auth y perfil, salvo el upload de avatar que va por route handler para soportar `multipart/form-data`. Componentes UI reutilizables bajo `web/src/components/ui/`. Tokens del sistema en `globals.css` mediante CSS custom properties + `@theme` de Tailwind v4, con dark mode automático por `prefers-color-scheme`. Storage de avatares en bucket `avatars` de Supabase con RLS por carpeta `{user_id}/`.

**Tech Stack:** Next.js 16.2.6 (App Router, `proxy.ts`), React 19.2.4, TypeScript 5, Tailwind v4, Supabase (auth + storage + RLS), Vitest 1.x para tests de utilidades. Sin librerías nuevas de validación ni de UI.

**Spec asociada:** `docs/superpowers/specs/2026-05-26-auth-perfil-design.md`

---

## Estructura de ficheros

### Nuevos

```
docs/superpowers/plans/2026-05-26-auth-perfil.md   (este fichero)
supabase/migrations/20260526000001_perfil_y_avatares.sql

web/vitest.config.ts
web/src/lib/auth/validaciones.ts                   utilidades puras (username/password/email)
web/src/lib/auth/__tests__/validaciones.test.ts
web/src/lib/perfil/iniciales.ts                    cálculo de iniciales
web/src/lib/perfil/__tests__/iniciales.test.ts

web/src/components/ui/Button.tsx
web/src/components/ui/Input.tsx
web/src/components/ui/PasswordInput.tsx
web/src/components/ui/FormField.tsx
web/src/components/ui/Tag.tsx
web/src/components/ui/Avatar.tsx
web/src/components/ui/AvatarUpload.tsx
web/src/components/ui/Modal.tsx
web/src/components/ui/Alert.tsx
web/src/components/ui/Toast.tsx                    componente Toast + ToastProvider + useToast()

web/src/app/(auth)/recuperar/page.tsx
web/src/app/(auth)/recuperar/confirmar/page.tsx
web/src/app/(app)/perfil/page.tsx
web/src/app/(app)/perfil/acciones.ts
web/src/app/api/perfil/avatar/route.ts
```

### Modificados

```
web/package.json                                   añadir vitest + scripts test
web/src/app/layout.tsx                             cargar Fraunces/Inter/JBM + ToastProvider
web/src/app/globals.css                            tokens del sistema + dark mode
web/src/app/page.tsx                               landing pública rediseñada
web/src/app/(auth)/acciones.ts                     reescritura completa
web/src/app/(auth)/login/page.tsx                  rediseñada
web/src/app/(auth)/registro/page.tsx               rediseñada + username + confirm password
web/src/app/(app)/layout.tsx                       topbar con Avatar real + sistema de diseño
web/src/proxy.ts                                   añadir /recuperar/* a rutas públicas
```

---

## Tarea 1 — Setup de Vitest

**Files:**
- Modify: `web/package.json`
- Create: `web/vitest.config.ts`

**Steps:**

- [ ] **Paso 1: Instalar Vitest**

```bash
cd web && npm install --save-dev vitest @vitejs/plugin-react
```

- [ ] **Paso 2: Crear `web/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
```

- [ ] **Paso 3: Añadir script de tests en `web/package.json`**

En la sección `"scripts"` añadir:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Paso 4: Verificar que `npm test` no rompe sin tests**

```bash
cd web && npm test
```

Esperado: `No test files found, exiting with code 0`.

- [ ] **Paso 5: Commit**

```bash
git add web/package.json web/package-lock.json web/vitest.config.ts
git commit -m "B-01: setup de Vitest para tests de utilidades"
```

---

## Tarea 2 — Cargar fuentes en `layout.tsx`

**Files:**
- Modify: `web/src/app/layout.tsx`

**Steps:**

- [ ] **Paso 1: Reemplazar el contenido entero de `web/src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dres — Clasificación documental",
  description:
    "Sube documentos y deja que un modelo decida automáticamente si son públicos o privados.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${fraunces.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Paso 2: Arrancar dev server y comprobar que carga sin errores**

```bash
cd web && npm run dev
```

Abrir `http://localhost:3000`. Esperado: la página se ve con las fuentes nuevas (aunque la maquetación siga rota, las letras deben ser Inter/Fraunces). Si Next.js da "Module not found" para algún subset, revisar versiones.

- [ ] **Paso 3: Commit**

```bash
git add web/src/app/layout.tsx
git commit -m "B-02: cargar fuentes Inter, Fraunces y JetBrains Mono"
```

---

## Tarea 3 — Reescribir `globals.css` con los tokens del sistema

**Files:**
- Modify: `web/src/app/globals.css`

**Steps:**

- [ ] **Paso 1: Reemplazar el contenido entero de `web/src/app/globals.css`**

```css
@import "tailwindcss";

/* ============================================================ */
/*  Tokens del sistema de diseño "Esmeralda biblioteca"          */
/*  Fuente de verdad visual: design/04-sistema.html              */
/* ============================================================ */

:root {
  /* Superficies y bordes */
  --paper: #ECEAD8;
  --card: #F8F6E4;
  --soft: #E2DEC5;
  --rule: #CCC8AB;
  --rule-soft: #DDD7B8;

  /* Tinta */
  --ink: #0F1C18;
  --ink-soft: #1D2E27;
  --mute: #6A7268;

  /* Acento (esmeralda) */
  --accent: #0F5A45;
  --accent-hover: #0C4836;
  --accent-soft: #C9DDD2;
  --accent-soft-hover: #B8CFC2;
  --accent-tint: #E6EFE9;

  /* Soporte (oro) */
  --oro: #A5701E;
  --oro-soft: #F1DEB0;
  --oro-tint: #F8EAD2;

  /* Estado destructivo */
  --danger: #8C2A20;
  --danger-soft: #EFD2CD;
  --danger-tint: #F8E3DF;

  /* Sombras */
  --shadow-1: 0 1px 0 rgba(15, 28, 24, 0.04);
  --shadow-2: 0 4px 12px -2px rgba(15, 28, 24, 0.06), 0 1px 0 rgba(15, 28, 24, 0.04);
  --shadow-3: 0 12px 32px -8px rgba(15, 28, 24, 0.18), 0 1px 0 rgba(15, 28, 24, 0.04);
}

@media (prefers-color-scheme: dark) {
  :root {
    --paper: #0E1816;
    --card: #141F1B;
    --soft: #1B2823;
    --rule: #283831;
    --rule-soft: #1F2D27;

    --ink: #EBE3CA;
    --ink-soft: #D2C8AB;
    --mute: #8A9388;

    --accent: #46B891;
    --accent-hover: #5FC7A1;
    --accent-soft: #1E3A30;
    --accent-soft-hover: #295244;
    --accent-tint: #16291F;

    --oro: #E0A65A;
    --oro-soft: #3A2D14;
    --oro-tint: #2A2110;

    --danger: #E08070;
    --danger-soft: #3F1E17;
    --danger-tint: #2A140E;

    --shadow-1: 0 1px 0 rgba(0, 0, 0, 0.4);
    --shadow-2: 0 4px 12px -2px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(0, 0, 0, 0.4);
    --shadow-3: 0 12px 32px -8px rgba(0, 0, 0, 0.6), 0 1px 0 rgba(0, 0, 0, 0.4);
  }
}

/* Mapear las custom properties como utilidades de Tailwind v4 */
@theme inline {
  --color-paper: var(--paper);
  --color-card: var(--card);
  --color-soft: var(--soft);
  --color-rule: var(--rule);
  --color-rule-soft: var(--rule-soft);

  --color-ink: var(--ink);
  --color-ink-soft: var(--ink-soft);
  --color-mute: var(--mute);

  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-soft: var(--accent-soft);
  --color-accent-soft-hover: var(--accent-soft-hover);
  --color-accent-tint: var(--accent-tint);

  --color-oro: var(--oro);
  --color-oro-soft: var(--oro-soft);
  --color-oro-tint: var(--oro-tint);

  --color-danger: var(--danger);
  --color-danger-soft: var(--danger-soft);
  --color-danger-tint: var(--danger-tint);

  --font-sans: var(--font-sans);
  --font-display: var(--font-display);
  --font-mono: var(--font-mono);
}

body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-sans), system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* Helpers tipográficos para uso fuera de componentes */
.font-display { font-family: var(--font-display), serif; letter-spacing: -0.02em; }
.font-mono    { font-family: var(--font-mono), monospace; }
```

- [ ] **Paso 2: Verificar en dev server**

```bash
cd web && npm run dev
```

Esperado: el fondo cambia a crema (`#ECEAD8`) y el texto a tinta verde oscura (`#0F1C18`). Si el navegador está en dark mode, fondo verde muy oscuro y tinta crema.

- [ ] **Paso 3: Commit**

```bash
git add web/src/app/globals.css
git commit -m "B-03: tokens del sistema Esmeralda biblioteca + dark mode automatico"
```

---

## Tarea 4 — Utilidades puras: validaciones de auth e iniciales

**Files:**
- Create: `web/src/lib/auth/validaciones.ts`
- Create: `web/src/lib/auth/__tests__/validaciones.test.ts`
- Create: `web/src/lib/perfil/iniciales.ts`
- Create: `web/src/lib/perfil/__tests__/iniciales.test.ts`

**Steps:**

- [ ] **Paso 1: Escribir los tests primero — `web/src/lib/auth/__tests__/validaciones.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  validarNombreUsuario,
  validarEmail,
  validarPassword,
} from "../validaciones";

describe("validarNombreUsuario", () => {
  it("acepta entre 3 y 32 letras, números, puntos y guion bajo", () => {
    expect(validarNombreUsuario("andres")).toBeNull();
    expect(validarNombreUsuario("andres.garcia")).toBeNull();
    expect(validarNombreUsuario("usuario_99")).toBeNull();
    expect(validarNombreUsuario("a".repeat(32))).toBeNull();
  });

  it("rechaza menos de 3 caracteres", () => {
    expect(validarNombreUsuario("ab")).toMatch(/3 caracteres/i);
  });

  it("rechaza más de 32 caracteres", () => {
    expect(validarNombreUsuario("a".repeat(33))).toMatch(/32 caracteres/i);
  });

  it("rechaza caracteres no permitidos", () => {
    expect(validarNombreUsuario("andres garcia")).toMatch(/letras, números/i);
    expect(validarNombreUsuario("andres-garcia")).toMatch(/letras, números/i);
    expect(validarNombreUsuario("andres@uni")).toMatch(/letras, números/i);
  });
});

describe("validarEmail", () => {
  it("acepta emails con formato razonable", () => {
    expect(validarEmail("a@b.co")).toBeNull();
    expect(validarEmail("andres.garcia@uni.es")).toBeNull();
  });

  it("rechaza emails sin @ o sin dominio", () => {
    expect(validarEmail("noarroba")).toMatch(/válido/i);
    expect(validarEmail("a@")).toMatch(/válido/i);
    expect(validarEmail("@b.co")).toMatch(/válido/i);
  });
});

describe("validarPassword", () => {
  it("acepta contraseñas de 8 caracteres o más", () => {
    expect(validarPassword("12345678")).toBeNull();
    expect(validarPassword("contraseña-segura-larga")).toBeNull();
  });

  it("rechaza contraseñas más cortas", () => {
    expect(validarPassword("1234567")).toMatch(/8 caracteres/i);
    expect(validarPassword("")).toMatch(/8 caracteres/i);
  });
});
```

- [ ] **Paso 2: Ejecutar tests para confirmar que fallan**

```bash
cd web && npm test -- validaciones
```

Esperado: errores de import — `Cannot find module '../validaciones'`.

- [ ] **Paso 3: Implementar `web/src/lib/auth/validaciones.ts`**

```ts
/**
 * Validadores puros para los campos del flujo de auth.
 * Devuelven null si el valor es válido, o un mensaje de error en español.
 */

const REGEX_USERNAME = /^[a-zA-Z0-9._]+$/;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarNombreUsuario(valor: string): string | null {
  if (valor.length < 3) return "El nombre de usuario debe tener al menos 3 caracteres.";
  if (valor.length > 32) return "El nombre de usuario no puede pasar de 32 caracteres.";
  if (!REGEX_USERNAME.test(valor)) {
    return "Solo se permiten letras, números, punto y guion bajo.";
  }
  return null;
}

export function validarEmail(valor: string): string | null {
  if (!REGEX_EMAIL.test(valor)) return "Introduce un email válido.";
  return null;
}

export function validarPassword(valor: string): string | null {
  if (valor.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  return null;
}
```

- [ ] **Paso 4: Ejecutar tests y confirmar que pasan**

```bash
cd web && npm test -- validaciones
```

Esperado: 9 tests pasan en verde.

- [ ] **Paso 5: Escribir los tests de iniciales — `web/src/lib/perfil/__tests__/iniciales.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { calcularIniciales } from "../iniciales";

describe("calcularIniciales", () => {
  it("usa la primera letra del primer y último token del nombre completo", () => {
    expect(calcularIniciales("Andrés García", "andres.garcia")).toBe("AG");
    expect(calcularIniciales("María del Carmen López", "marialopez")).toBe("ML");
  });

  it("si el nombre completo es una sola palabra, repite o usa solo la primera", () => {
    expect(calcularIniciales("Andrés", "andres")).toBe("AN");
  });

  it("si no hay nombre completo, usa las dos primeras letras del username", () => {
    expect(calcularIniciales(null, "andres.garcia")).toBe("AN");
    expect(calcularIniciales("", "marialopez")).toBe("MA");
  });

  it("siempre devuelve en mayúsculas", () => {
    expect(calcularIniciales("andrés garcía", "andres")).toBe("AG");
  });

  it("ignora espacios extra", () => {
    expect(calcularIniciales("  Andrés   García  ", "andres")).toBe("AG");
  });
});
```

- [ ] **Paso 6: Ejecutar tests y confirmar que fallan**

```bash
cd web && npm test -- iniciales
```

Esperado: errores de import.

- [ ] **Paso 7: Implementar `web/src/lib/perfil/iniciales.ts`**

```ts
/**
 * Calcula las 2 iniciales para el avatar.
 * Prioridad: primer y último token del nombre completo; si no hay,
 * primeras 2 letras del nombre de usuario.
 */
export function calcularIniciales(
  nombreCompleto: string | null,
  nombreUsuario: string,
): string {
  const completo = (nombreCompleto ?? "").trim();
  if (completo) {
    const tokens = completo.split(/\s+/).filter(Boolean);
    if (tokens.length >= 2) {
      const primero = tokens[0]?.[0] ?? "";
      const ultimo = tokens[tokens.length - 1]?.[0] ?? "";
      return (primero + ultimo).toUpperCase();
    }
    if (tokens.length === 1) {
      return tokens[0].slice(0, 2).toUpperCase();
    }
  }
  return nombreUsuario.slice(0, 2).toUpperCase();
}
```

- [ ] **Paso 8: Ejecutar tests y confirmar que pasan**

```bash
cd web && npm test
```

Esperado: 14 tests pasan en total.

- [ ] **Paso 9: Commit**

```bash
git add web/src/lib/auth web/src/lib/perfil
git commit -m "B-04: utilidades de validacion (auth) y calculo de iniciales (perfil)"
```

---

## Tarea 5 — Componente `Button`

**Files:**
- Create: `web/src/components/ui/Button.tsx`

**Steps:**

- [ ] **Paso 1: Crear el componente**

```tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent-soft text-accent hover:bg-accent-soft-hover hover:text-accent-hover",
  accent: "bg-accent text-white hover:bg-accent-hover",
  ghost: "bg-transparent text-ink border border-rule hover:bg-soft",
  danger: "bg-danger text-white hover:bg-[#6F1E16]",
  link: "bg-transparent text-accent border-b border-accent-soft hover:border-accent rounded-none px-0",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    className = "",
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center gap-2 rounded-full font-medium",
        "transition-colors duration-100",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-tint",
        "disabled:opacity-45 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
      {...rest}
    >
      {loading && (
        <span
          className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
});
```

- [ ] **Paso 2: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add web/src/components/ui/Button.tsx
git commit -m "B-05: componente Button con 5 variantes y 3 tamanos"
```

---

## Tarea 6 — Componentes `Input`, `PasswordInput`, `FormField`

**Files:**
- Create: `web/src/components/ui/Input.tsx`
- Create: `web/src/components/ui/PasswordInput.tsx`
- Create: `web/src/components/ui/FormField.tsx`

**Steps:**

- [ ] **Paso 1: Crear `web/src/components/ui/Input.tsx`**

```tsx
import { forwardRef, type InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { error = false, className = "", ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={[
        "w-full rounded-[10px] border bg-card px-3.5 py-2.5",
        "text-sm text-ink placeholder:text-mute",
        "transition-[border-color,box-shadow] duration-100",
        "focus:outline-none focus:ring-3",
        error
          ? "border-danger focus:ring-danger-tint"
          : "border-rule focus:border-accent focus:ring-accent-tint",
        className,
      ].join(" ")}
      {...rest}
    />
  );
});
```

- [ ] **Paso 2: Crear `web/src/components/ui/PasswordInput.tsx`**

```tsx
"use client";

import { useState, forwardRef, type InputHTMLAttributes } from "react";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  error?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, Props>(
  function PasswordInput({ error = false, className = "", ...rest }, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={[
            "w-full rounded-[10px] border bg-card px-3.5 py-2.5 pr-10",
            "text-sm text-ink placeholder:text-mute",
            "transition-[border-color,box-shadow] duration-100",
            "focus:outline-none focus:ring-3",
            error
              ? "border-danger focus:ring-danger-tint"
              : "border-rule focus:border-accent focus:ring-accent-tint",
            className,
          ].join(" ")}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-mute hover:text-ink"
        >
          {visible ? "ocultar" : "mostrar"}
        </button>
      </div>
    );
  },
);
```

- [ ] **Paso 3: Crear `web/src/components/ui/FormField.tsx`**

```tsx
import type { ReactNode } from "react";

interface Props {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ label, htmlFor, hint, error, children }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="font-display italic text-[13px] text-ink-soft"
      >
        {label}
      </label>
      {children}
      {error && (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      )}
      {!error && hint && <span className="text-xs text-mute">{hint}</span>}
    </div>
  );
}
```

- [ ] **Paso 4: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Paso 5: Commit**

```bash
git add web/src/components/ui/Input.tsx web/src/components/ui/PasswordInput.tsx web/src/components/ui/FormField.tsx
git commit -m "B-06: componentes Input, PasswordInput y FormField"
```

---

## Tarea 7 — Componente `Tag`

**Files:**
- Create: `web/src/components/ui/Tag.tsx`

**Steps:**

- [ ] **Paso 1: Crear el componente**

```tsx
import type { ReactNode } from "react";

type Variant = "pub" | "priv" | "proc" | "err" | "neutral";

interface Props {
  variant: Variant;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  pub: "text-accent border-accent-soft",
  priv: "text-oro border-oro-soft",
  proc: "text-ink-soft border-rule",
  err: "text-danger border-danger-soft",
  neutral: "text-mute border-rule",
};

export function Tag({ variant, children }: Props) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border bg-transparent",
        "px-2.5 py-0.5 text-[11px] font-medium",
        variantClasses[variant],
      ].join(" ")}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}
```

- [ ] **Paso 2: Commit**

```bash
git add web/src/components/ui/Tag.tsx
git commit -m "B-07: componente Tag (outline con 5 variantes semanticas)"
```

---

## Tarea 8 — Componente `Avatar`

**Files:**
- Create: `web/src/components/ui/Avatar.tsx`

**Steps:**

- [ ] **Paso 1: Crear el componente**

```tsx
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
```

- [ ] **Paso 2: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add web/src/components/ui/Avatar.tsx
git commit -m "B-08: componente Avatar (iniciales o imagen, 4 tamanos)"
```

---

## Tarea 9 — Sistema de toasts (`Toast` + `ToastProvider` + `useToast`)

**Files:**
- Create: `web/src/components/ui/Toast.tsx`

**Steps:**

- [ ] **Paso 1: Crear el módulo completo del sistema de toasts**

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type Variant = "ok" | "warn" | "err";

interface ToastData {
  id: number;
  variant: Variant;
  titulo: string;
  detalle?: string;
}

interface ToastContextValue {
  mostrar: (toast: Omit<ToastData, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const mostrar = useCallback((toast: Omit<ToastData, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const cerrar = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ mostrar }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => cerrar(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const variantStyles: Record<
  Variant,
  { bg: string; fg: string; icon: string }
> = {
  ok: { bg: "bg-accent-soft", fg: "text-accent", icon: "✓" },
  warn: { bg: "bg-oro-soft", fg: "text-oro", icon: "!" },
  err: { bg: "bg-danger-soft", fg: "text-danger", icon: "✕" },
};

function ToastItem({
  toast,
  onClose,
}: {
  toast: ToastData;
  onClose: () => void;
}) {
  const styles = variantStyles[toast.variant];
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-[10px] border border-rule bg-card px-4 py-3.5 shadow-[var(--shadow-2)]"
    >
      <span
        className={[
          "w-6 h-6 rounded-full grid place-items-center text-sm font-semibold shrink-0",
          styles.bg,
          styles.fg,
        ].join(" ")}
        aria-hidden
      >
        {styles.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium m-0">{toast.titulo}</p>
        {toast.detalle && (
          <p className="text-xs text-mute mt-0.5 leading-snug">{toast.detalle}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar notificación"
        className="text-mute hover:text-ink text-xs font-mono"
      >
        ✕
      </button>
    </div>
  );
}
```

- [ ] **Paso 2: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add web/src/components/ui/Toast.tsx
git commit -m "B-09: sistema de toasts (ToastProvider + useToast + componente)"
```

---

## Tarea 10 — Componente `Modal`

**Files:**
- Create: `web/src/components/ui/Modal.tsx`

**Steps:**

- [ ] **Paso 1: Crear el componente**

```tsx
"use client";

import { useEffect, type ReactNode } from "react";

interface Props {
  abierto: boolean;
  onClose: () => void;
  titulo: string;
  tono?: "neutral" | "warn" | "danger";
  children?: ReactNode;
  acciones: ReactNode;
}

const tonoIconClasses: Record<NonNullable<Props["tono"]>, string> = {
  neutral: "bg-accent-soft text-accent",
  warn: "bg-oro-soft text-oro",
  danger: "bg-danger-soft text-danger",
};

const tonoIcon: Record<NonNullable<Props["tono"]>, string> = {
  neutral: "•",
  warn: "!",
  danger: "✕",
};

export function Modal({
  abierto,
  onClose,
  titulo,
  tono = "neutral",
  children,
  acciones,
}: Props) {
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [abierto, onClose]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4 py-12"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[460px] rounded-[18px] border border-rule bg-card shadow-[var(--shadow-3)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-6 px-6 flex items-start gap-4">
          <div
            className={[
              "w-11 h-11 rounded-[12px] grid place-items-center shrink-0",
              "font-display italic font-semibold text-xl",
              tonoIconClasses[tono],
            ].join(" ")}
            aria-hidden
          >
            {tonoIcon[tono]}
          </div>
          <h3 className="font-display font-medium text-[22px] tracking-tight m-0 flex-1">
            {titulo}
          </h3>
        </div>
        {children && <div className="px-6 pt-5">{children}</div>}
        <div className="flex justify-end gap-2 px-6 py-5">{acciones}</div>
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add web/src/components/ui/Modal.tsx
git commit -m "B-10: componente Modal (overlay + esc para cerrar + tonos)"
```

---

## Tarea 11 — Componente `Alert` (banner inline)

**Files:**
- Create: `web/src/components/ui/Alert.tsx`

**Steps:**

- [ ] **Paso 1: Crear el componente**

```tsx
import type { ReactNode } from "react";

type Variant = "info" | "warn" | "err" | "ok";

interface Props {
  variant?: Variant;
  titulo?: string;
  children: ReactNode;
}

const variantClasses: Record<
  Variant,
  { bg: string; border: string; fg: string }
> = {
  info: { bg: "bg-accent-tint", border: "border-accent-soft", fg: "text-accent" },
  warn: { bg: "bg-oro-tint", border: "border-oro-soft", fg: "text-oro" },
  err: { bg: "bg-danger-tint", border: "border-danger-soft", fg: "text-danger" },
  ok: { bg: "bg-accent-tint", border: "border-accent-soft", fg: "text-accent" },
};

export function Alert({ variant = "info", titulo, children }: Props) {
  const s = variantClasses[variant];
  return (
    <div
      role="status"
      className={[
        "rounded-[10px] border p-3.5 text-sm",
        s.bg,
        s.border,
        s.fg,
      ].join(" ")}
    >
      {titulo && <p className="font-medium m-0 mb-1">{titulo}</p>}
      <div className="text-ink-soft text-xs leading-relaxed">{children}</div>
    </div>
  );
}
```

- [ ] **Paso 2: Commit**

```bash
git add web/src/components/ui/Alert.tsx
git commit -m "B-11: componente Alert (banner inline con 4 variantes)"
```

---

## Tarea 12 — Migración SQL: bucket de avatares + ajuste del trigger

**Files:**
- Create: `supabase/migrations/20260526000001_perfil_y_avatares.sql`

**Steps:**

- [ ] **Paso 1: Crear la migración**

```sql
-- ============================================================
-- Migración 20260526000001 — Bucket de avatares + ajuste del
-- trigger de creación de perfiles para usar el nombre_usuario
-- elegido por el usuario en el registro.
-- ============================================================

-- 1. Bucket "avatars" en Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies del bucket
-- Lectura: cualquiera (los avatares se sirven directamente en <img>).
DROP POLICY IF EXISTS "avatares_lectura_publica" ON storage.objects;
CREATE POLICY "avatares_lectura_publica" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'avatars');

-- Subida: solo el dueño dentro de su carpeta {auth.uid()}/...
DROP POLICY IF EXISTS "avatares_subida_propia" ON storage.objects;
CREATE POLICY "avatares_subida_propia" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Actualización: solo el dueño.
DROP POLICY IF EXISTS "avatares_update_propia" ON storage.objects;
CREATE POLICY "avatares_update_propia" ON storage.objects
    FOR UPDATE TO authenticated USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Borrado: solo el dueño.
DROP POLICY IF EXISTS "avatares_borrado_propio" ON storage.objects;
CREATE POLICY "avatares_borrado_propio" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 3. Reescritura del trigger: usar el nombre_usuario del registro
-- sin sufijo aleatorio. El form ya garantiza unicidad chequeando antes
-- de llamar a signUp; el UNIQUE NOT NULL de la columna respalda.
CREATE OR REPLACE FUNCTION crear_perfil_nuevo_usuario()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, nombre_usuario, nombre_completo)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'nombre_usuario',
            -- Fallback: solo para usuarios creados desde el panel admin
            -- de Supabase (sin metadata). Sufijo aleatorio para no chocar.
            split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 8)
        ),
        NEW.raw_user_meta_data->>'nombre_completo'
    );
    RETURN NEW;
END;
$$;
-- Trigger ya existe de la migración 20260522000001; no recrear.
```

- [ ] **Paso 2: Aplicar la migración**

```bash
supabase db push --linked
```

Esperado: `Applied 1 migration`. Si Supabase falla al insertar el bucket porque ya existe, no es problema (el `ON CONFLICT` lo previene). Si las policies fallan por restricción del proyecto, crear el bucket desde el panel y reintentar la migración.

- [ ] **Paso 3: Añadir el redirect URL en el panel de Supabase**

Acceder al panel del proyecto → Authentication → URL Configuration → "Redirect URLs". Añadir:

```
http://localhost:3000/recuperar/confirmar
https://<dominio-vercel>/recuperar/confirmar
```

Sin esto el link del email no funciona. Este paso es manual, no de código.

- [ ] **Paso 4: Commit**

```bash
git add supabase/migrations/20260526000001_perfil_y_avatares.sql
git commit -m "B-12: migracion bucket avatares + ajuste trigger sin sufijo aleatorio"
```

---

## Tarea 13 — Reescritura de `acciones.ts` con `registrarse`, `solicitarRecuperacion`

**Files:**
- Modify: `web/src/app/(auth)/acciones.ts`

**Steps:**

- [ ] **Paso 1: Reemplazar el contenido entero de `web/src/app/(auth)/acciones.ts`**

```ts
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import {
  validarEmail,
  validarNombreUsuario,
  validarPassword,
} from "@/lib/auth/validaciones";

export type EstadoFormulario =
  | { error: string; campo?: string }
  | { ok: string }
  | undefined;

export async function registrarse(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const nombreUsuario = String(datos.get("nombre_usuario") ?? "").trim();
  const nombreCompleto = String(datos.get("nombre_completo") ?? "").trim();
  const email = String(datos.get("email") ?? "").trim();
  const password = String(datos.get("password") ?? "");
  const passwordConfirm = String(datos.get("password_confirm") ?? "");

  const errorUser = validarNombreUsuario(nombreUsuario);
  if (errorUser) return { error: errorUser, campo: "nombre_usuario" };

  const errorEmail = validarEmail(email);
  if (errorEmail) return { error: errorEmail, campo: "email" };

  const errorPass = validarPassword(password);
  if (errorPass) return { error: errorPass, campo: "password" };

  if (password !== passwordConfirm) {
    return { error: "Las contraseñas no coinciden.", campo: "password_confirm" };
  }

  // Chequeo de unicidad del nombre_usuario antes de crear la cuenta.
  const admin = crearClienteAdmin();
  const { data: existe } = await admin
    .from("profiles")
    .select("id")
    .eq("nombre_usuario", nombreUsuario)
    .maybeSingle();

  if (existe) {
    return {
      error: "Ese nombre de usuario ya está en uso.",
      campo: "nombre_usuario",
    };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nombre_usuario: nombreUsuario,
        nombre_completo: nombreCompleto || null,
      },
    },
  });
  if (error) return { error: traducirError(error.message) };

  redirect("/inicio");
}

export async function iniciarSesion(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const email = String(datos.get("email") ?? "").trim();
  const password = String(datos.get("password") ?? "");

  if (!email || !password) {
    return { error: "Introduce email y contraseña." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: traducirError(error.message) };

  redirect("/inicio");
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function solicitarRecuperacion(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const email = String(datos.get("email") ?? "").trim();

  const errorEmail = validarEmail(email);
  if (errorEmail) return { error: errorEmail };

  const supabase = await crearClienteServidor();
  const cabeceras = await headers();
  const host = cabeceras.get("host") ?? "localhost:3000";
  const protocolo = host.startsWith("localhost") ? "http" : "https";

  // No comprobamos si el email existe: respondemos siempre con éxito
  // para evitar enumeración de usuarios.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${protocolo}://${host}/recuperar/confirmar`,
  });

  return {
    ok: "Si ese email está registrado, te hemos enviado un enlace para restablecer la contraseña.",
  };
}

function traducirError(mensaje: string): string {
  if (mensaje.includes("Invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }
  if (mensaje.toLowerCase().includes("already registered")) {
    return "Ese email ya está registrado.";
  }
  if (mensaje.includes("Password should be")) {
    return "La contraseña no cumple los requisitos mínimos.";
  }
  return mensaje;
}
```

- [ ] **Paso 2: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add web/src/app/(auth)/acciones.ts
git commit -m "B-13: server actions de auth reescritas con validaciones y recuperacion"
```

---

## Tarea 14 — Pantalla `/registro` rediseñada

**Files:**
- Modify: `web/src/app/(auth)/registro/page.tsx`

**Steps:**

- [ ] **Paso 1: Reemplazar el contenido entero de `web/src/app/(auth)/registro/page.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Alert } from "@/components/ui/Alert";

import { registrarse } from "../acciones";

export default function PaginaRegistro() {
  const [estado, accion, pendiente] = useActionState(registrarse, undefined);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const noCoinciden =
    passwordConfirm.length > 0 && password !== passwordConfirm;

  const errorDe = (campo: string) =>
    estado && "error" in estado && estado.campo === campo
      ? estado.error
      : undefined;

  const errorGeneral =
    estado && "error" in estado && !estado.campo ? estado.error : undefined;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form
        action={accion}
        className="flex w-full max-w-sm flex-col gap-5 rounded-[18px] border border-rule bg-card p-8 shadow-[var(--shadow-2)]"
      >
        <header>
          <p className="font-display italic text-accent text-sm m-0">
            — crea tu cuenta
          </p>
          <h1 className="font-display font-medium text-3xl tracking-tight m-0 mt-1">
            Empieza a archivar.
          </h1>
        </header>

        <FormField
          label="Nombre de usuario"
          htmlFor="nombre_usuario"
          hint="3–32 caracteres. Letras, números, punto y guion bajo."
          error={errorDe("nombre_usuario")}
        >
          <Input
            id="nombre_usuario"
            name="nombre_usuario"
            type="text"
            required
            autoComplete="username"
            error={!!errorDe("nombre_usuario")}
          />
        </FormField>

        <FormField label="Nombre completo (opcional)" htmlFor="nombre_completo">
          <Input
            id="nombre_completo"
            name="nombre_completo"
            type="text"
            autoComplete="name"
          />
        </FormField>

        <FormField label="Email" htmlFor="email" error={errorDe("email")}>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            error={!!errorDe("email")}
          />
        </FormField>

        <FormField
          label="Contraseña"
          htmlFor="password"
          hint="Mínimo 8 caracteres."
          error={errorDe("password")}
        >
          <PasswordInput
            id="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            error={!!errorDe("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>

        <FormField
          label="Confirmar contraseña"
          htmlFor="password_confirm"
          error={
            noCoinciden ? "Las contraseñas no coinciden." : errorDe("password_confirm")
          }
        >
          <PasswordInput
            id="password_confirm"
            name="password_confirm"
            required
            minLength={8}
            autoComplete="new-password"
            error={noCoinciden || !!errorDe("password_confirm")}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
          />
        </FormField>

        {errorGeneral && <Alert variant="err">{errorGeneral}</Alert>}

        <Button
          type="submit"
          variant="accent"
          size="lg"
          loading={pendiente}
          disabled={noCoinciden}
        >
          {pendiente ? "Creando cuenta…" : "Crear cuenta"}
        </Button>

        <p className="text-center text-sm text-mute">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-accent border-b border-accent-soft hover:border-accent">
            Inicia sesión
          </Link>
        </p>
      </form>
    </main>
  );
}
```

- [ ] **Paso 2: Probar visualmente**

```bash
cd web && npm run dev
```

Abrir `http://localhost:3000/registro`. Esperado: formulario con la estética del sistema. Probar el toggle "mostrar/ocultar" de las contraseñas, escribir contraseñas diferentes en los dos campos y verificar que aparece el error "Las contraseñas no coinciden" y que el botón "Crear cuenta" queda desactivado.

- [ ] **Paso 3: Commit**

```bash
git add web/src/app/(auth)/registro/page.tsx
git commit -m "B-14: pantalla /registro rediseniada con username + confirm password"
```

---

## Tarea 15 — Pantalla `/login` rediseñada

**Files:**
- Modify: `web/src/app/(auth)/login/page.tsx`

**Steps:**

- [ ] **Paso 1: Reemplazar el contenido entero de `web/src/app/(auth)/login/page.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

import { iniciarSesion } from "../acciones";

export default function PaginaLogin() {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, undefined);
  const error = estado && "error" in estado ? estado.error : undefined;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form
        action={accion}
        className="flex w-full max-w-sm flex-col gap-5 rounded-[18px] border border-rule bg-card p-8 shadow-[var(--shadow-2)]"
      >
        <header>
          <p className="font-display italic text-accent text-sm m-0">
            — vuelve a tu archivo
          </p>
          <h1 className="font-display font-medium text-3xl tracking-tight m-0 mt-1">
            Iniciar sesión.
          </h1>
        </header>

        <FormField label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </FormField>

        <FormField label="Contraseña" htmlFor="password">
          <PasswordInput
            id="password"
            name="password"
            required
            autoComplete="current-password"
          />
        </FormField>

        {error && <Alert variant="err">{error}</Alert>}

        <Button type="submit" variant="accent" size="lg" loading={pendiente}>
          {pendiente ? "Entrando…" : "Entrar"}
        </Button>

        <div className="flex justify-between text-sm">
          <Link
            href="/recuperar"
            className="text-mute hover:text-ink"
          >
            ¿Olvidaste tu contraseña?
          </Link>
          <Link
            href="/registro"
            className="text-accent border-b border-accent-soft hover:border-accent"
          >
            Crear cuenta
          </Link>
        </div>
      </form>
    </main>
  );
}
```

- [ ] **Paso 2: Probar visualmente**

```bash
cd web && npm run dev
```

Abrir `http://localhost:3000/login`. Esperado: formulario con la nueva estética, enlace de recuperación visible. Intentar entrar con credenciales malas → `Alert` con el mensaje traducido.

- [ ] **Paso 3: Commit**

```bash
git add web/src/app/(auth)/login/page.tsx
git commit -m "B-15: pantalla /login rediseniada con enlace de recuperacion"
```

---

## Tarea 16 — Pantalla `/recuperar`

**Files:**
- Create: `web/src/app/(auth)/recuperar/page.tsx`

**Steps:**

- [ ] **Paso 1: Crear el fichero**

```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";

import { solicitarRecuperacion } from "../acciones";

export default function PaginaRecuperar() {
  const [estado, accion, pendiente] = useActionState(
    solicitarRecuperacion,
    undefined,
  );
  const error = estado && "error" in estado ? estado.error : undefined;
  const ok = estado && "ok" in estado ? estado.ok : undefined;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-[18px] border border-rule bg-card p-8 shadow-[var(--shadow-2)]">
        <header>
          <p className="font-display italic text-accent text-sm m-0">
            — restablecer contraseña
          </p>
          <h1 className="font-display font-medium text-3xl tracking-tight m-0 mt-1">
            ¿Olvidaste tu <em className="italic text-accent">contraseña</em>?
          </h1>
          <p className="text-sm text-mute mt-3 leading-relaxed">
            Te enviamos un enlace por email para que crees una nueva.
          </p>
        </header>

        {ok ? (
          <Alert variant="ok" titulo="Revisa tu bandeja de entrada">
            {ok}
          </Alert>
        ) : (
          <form action={accion} className="flex flex-col gap-5">
            <FormField label="Email" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
              />
            </FormField>

            {error && <Alert variant="err">{error}</Alert>}

            <Button type="submit" variant="accent" size="lg" loading={pendiente}>
              {pendiente ? "Enviando…" : "Enviar enlace"}
            </Button>
          </form>
        )}

        <Link
          href="/login"
          className="text-center text-sm text-mute hover:text-ink"
        >
          ← Volver al login
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Paso 2: Añadir `/recuperar` a las rutas públicas del proxy**

Modificar `web/src/proxy.ts`:

```ts
// Rutas accesibles sin haber iniciado sesión.
const RUTAS_PUBLICAS = ["/", "/login", "/registro", "/recuperar", "/recuperar/confirmar"];
```

Y actualizar la condición de redirección "logueado en login/registro → inicio" para incluir las nuevas rutas:

```ts
  if (user && (ruta === "/login" || ruta === "/registro" || ruta.startsWith("/recuperar"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/inicio";
    return NextResponse.redirect(url);
  }
```

- [ ] **Paso 3: Probar visualmente**

```bash
cd web && npm run dev
```

Abrir `http://localhost:3000/recuperar`. Enviar el formulario con tu email registrado y verificar que llega el email (puede tardar un par de minutos). Verificar también el caso "email no existe" → mismo mensaje de éxito.

- [ ] **Paso 4: Commit**

```bash
git add web/src/app/(auth)/recuperar/page.tsx web/src/proxy.ts
git commit -m "B-16: pantalla /recuperar + rutas publicas extendidas"
```

---

## Tarea 17 — Pantalla `/recuperar/confirmar`

**Files:**
- Create: `web/src/app/(auth)/recuperar/confirmar/page.tsx`

**Steps:**

- [ ] **Paso 1: Crear el fichero**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { PasswordInput } from "@/components/ui/PasswordInput";

import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { validarPassword } from "@/lib/auth/validaciones";

export default function PaginaConfirmarRecuperacion() {
  const router = useRouter();
  const [sesionLista, setSesionLista] = useState(false);
  const [tokenInvalido, setTokenInvalido] = useState(false);
  const [pass, setPass] = useState("");
  const [conf, setConf] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Al cargar: tomamos los tokens que Supabase deposita en el hash
  // (#access_token=...&refresh_token=...&type=recovery) y los aplicamos
  // a la sesión del navegador.
  useEffect(() => {
    const aplicarTokens = async () => {
      if (typeof window === "undefined") return;
      const hash = window.location.hash.replace(/^#/, "");
      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const type = params.get("type");
      if (!access_token || !refresh_token || type !== "recovery") {
        setTokenInvalido(true);
        return;
      }
      const supabase = crearClienteNavegador();
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (error) {
        setTokenInvalido(true);
        return;
      }
      // Limpiamos el hash de la URL para no dejar tokens expuestos.
      window.history.replaceState({}, "", "/recuperar/confirmar");
      setSesionLista(true);
    };
    void aplicarTokens();
  }, []);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errPass = validarPassword(pass);
    if (errPass) return setError(errPass);
    if (pass !== conf) return setError("Las contraseñas no coinciden.");

    setEnviando(true);
    const supabase = crearClienteNavegador();
    const { error: updErr } = await supabase.auth.updateUser({ password: pass });
    setEnviando(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    router.push("/inicio");
  };

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-[18px] border border-rule bg-card p-8 shadow-[var(--shadow-2)]">
        <header>
          <p className="font-display italic text-accent text-sm m-0">
            — restablecer contraseña
          </p>
          <h1 className="font-display font-medium text-3xl tracking-tight m-0 mt-1">
            Crea tu nueva contraseña.
          </h1>
        </header>

        {tokenInvalido && (
          <Alert variant="err" titulo="Enlace inválido o caducado">
            Vuelve a pedir un enlace nuevo desde la pantalla de recuperación.
          </Alert>
        )}

        {!tokenInvalido && !sesionLista && (
          <p className="text-sm text-mute">Validando el enlace…</p>
        )}

        {sesionLista && (
          <form onSubmit={enviar} className="flex flex-col gap-5">
            <FormField
              label="Nueva contraseña"
              htmlFor="pass"
              hint="Mínimo 8 caracteres."
            >
              <PasswordInput
                id="pass"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </FormField>

            <FormField label="Confirmar contraseña" htmlFor="conf">
              <PasswordInput
                id="conf"
                value={conf}
                onChange={(e) => setConf(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                error={conf.length > 0 && conf !== pass}
              />
            </FormField>

            {error && <Alert variant="err">{error}</Alert>}

            <Button type="submit" variant="accent" size="lg" loading={enviando}>
              {enviando ? "Guardando…" : "Actualizar contraseña"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Paso 2: Probar visualmente**

```bash
cd web && npm run dev
```

Solicitar recuperación desde `/recuperar`, abrir el enlace del email, llegar a `/recuperar/confirmar#access_token=...`. Esperado: "Validando…" → formulario aparece → poner contraseña nueva → redirige a `/inicio` ya autenticado.

- [ ] **Paso 3: Commit**

```bash
git add "web/src/app/(auth)/recuperar/confirmar/page.tsx"
git commit -m "B-17: pantalla /recuperar/confirmar con setSession + updateUser"
```

---

## Tarea 18 — Componente `AvatarUpload`

**Files:**
- Create: `web/src/components/ui/AvatarUpload.tsx`

**Steps:**

- [ ] **Paso 1: Crear el componente**

```tsx
"use client";

import { useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { Button } from "./Button";

interface Props {
  nombreCompleto: string | null;
  nombreUsuario: string;
  avatarUrl: string | null;
  onSubidoCorrecto: (urlNueva: string) => void;
  onQuitado: () => void;
  onError: (mensaje: string) => void;
}

const TAMANO_MAX = 2 * 1024 * 1024; // 2 MB
const TIPOS_OK = ["image/jpeg", "image/png", "image/webp"];
const LADO_DESTINO = 256;

export function AvatarUpload({
  nombreCompleto,
  nombreUsuario,
  avatarUrl,
  onSubidoCorrecto,
  onQuitado,
  onError,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);

  const elegir = () => inputRef.current?.click();

  const procesar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichero = e.target.files?.[0];
    e.target.value = "";
    if (!fichero) return;
    if (!TIPOS_OK.includes(fichero.type)) {
      return onError("El formato debe ser JPG, PNG o WEBP.");
    }
    if (fichero.size > TAMANO_MAX) {
      return onError("La imagen no puede pasar de 2 MB.");
    }

    setSubiendo(true);
    try {
      const blob = await recortarCuadradoAWebp(fichero);
      const fd = new FormData();
      fd.append("avatar", blob, "avatar.webp");
      const res = await fetch("/api/perfil/avatar", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "No se pudo subir el avatar.");
      }
      onSubidoCorrecto(data.url);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSubiendo(false);
    }
  };

  const quitar = async () => {
    setSubiendo(true);
    try {
      const res = await fetch("/api/perfil/avatar", { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "No se pudo quitar el avatar.");
      }
      onQuitado();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <Avatar
          nombreCompleto={nombreCompleto}
          nombreUsuario={nombreUsuario}
          avatarUrl={avatarUrl}
          size="xl"
        />
        {subiendo && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-ink/60">
            <span className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Button type="button" variant="primary" size="sm" onClick={elegir} disabled={subiendo}>
          {avatarUrl ? "Cambiar foto" : "Subir foto"}
        </Button>
        {avatarUrl && (
          <Button type="button" variant="ghost" size="sm" onClick={quitar} disabled={subiendo}>
            Quitar foto
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={procesar}
        />
        <p className="text-xs text-mute">JPG, PNG o WEBP. Máximo 2 MB.</p>
      </div>
    </div>
  );
}

// Recorta la imagen al cuadrado centrado y la exporta como WEBP 256×256.
async function recortarCuadradoAWebp(fichero: File): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("No se pudo leer el fichero."));
    fr.readAsDataURL(fichero);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Imagen no válida."));
    i.src = dataUrl;
  });

  const lado = Math.min(img.width, img.height);
  const sx = (img.width - lado) / 2;
  const sy = (img.height - lado) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = LADO_DESTINO;
  canvas.height = LADO_DESTINO;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible.");
  ctx.drawImage(img, sx, sy, lado, lado, 0, 0, LADO_DESTINO, LADO_DESTINO);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Error al codificar la imagen."))),
      "image/webp",
      0.9,
    );
  });
}
```

- [ ] **Paso 2: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add web/src/components/ui/AvatarUpload.tsx
git commit -m "B-18: componente AvatarUpload con recorte cuadrado en canvas"
```

---

## Tarea 19 — Route handler `POST/DELETE /api/perfil/avatar`

**Files:**
- Create: `web/src/app/api/perfil/avatar/route.ts`

**Steps:**

- [ ] **Paso 1: Crear el fichero**

```ts
import { NextResponse } from "next/server";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

const TAMANO_MAX = 2 * 1024 * 1024; // 2 MB (mismo límite que el cliente)

export async function POST(request: Request) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const form = await request.formData();
  const fichero = form.get("avatar");
  if (!(fichero instanceof File)) {
    return NextResponse.json({ error: "Fichero ausente." }, { status: 400 });
  }
  if (fichero.size > TAMANO_MAX) {
    return NextResponse.json(
      { error: "La imagen pasa de 2 MB." },
      { status: 400 },
    );
  }
  if (fichero.type !== "image/webp") {
    return NextResponse.json(
      { error: "El servidor solo acepta image/webp." },
      { status: 400 },
    );
  }

  const admin = crearClienteAdmin();
  const ruta = `${user.id}/avatar.webp`;
  const buffer = Buffer.from(await fichero.arrayBuffer());

  const { error: errSubida } = await admin.storage
    .from("avatars")
    .upload(ruta, buffer, {
      contentType: "image/webp",
      upsert: true,
    });
  if (errSubida) {
    return NextResponse.json({ error: errSubida.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from("avatars").getPublicUrl(ruta);
  // Añadimos un timestamp como query param para invalidar la caché del navegador.
  const url = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: errUpdate } = await admin
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", user.id);
  if (errUpdate) {
    return NextResponse.json({ error: errUpdate.message }, { status: 500 });
  }

  return NextResponse.json({ url });
}

export async function DELETE() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const admin = crearClienteAdmin();
  const ruta = `${user.id}/avatar.webp`;

  await admin.storage.from("avatars").remove([ruta]);
  await admin.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Paso 2: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add "web/src/app/api/perfil/avatar/route.ts"
git commit -m "B-19: route handler POST/DELETE /api/perfil/avatar"
```

---

## Tarea 20 — Server actions de perfil: `actualizarPerfil` y `cambiarContrasena`

**Files:**
- Create: `web/src/app/(app)/perfil/acciones.ts`

**Steps:**

- [ ] **Paso 1: Crear el fichero**

```ts
"use server";

import { revalidatePath } from "next/cache";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import { validarPassword } from "@/lib/auth/validaciones";

export type Resultado =
  | { ok: string }
  | { error: string; campo?: string }
  | undefined;

export async function actualizarPerfil(
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const nombreCompleto = String(datos.get("nombre_completo") ?? "").trim();
  if (nombreCompleto.length > 80) {
    return { error: "Máximo 80 caracteres.", campo: "nombre_completo" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ nombre_completo: nombreCompleto || null })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/perfil");
  return { ok: "Perfil actualizado." };
}

export async function cambiarContrasena(
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: "Sesión expirada." };

  const actual = String(datos.get("actual") ?? "");
  const nueva = String(datos.get("nueva") ?? "");
  const confirmar = String(datos.get("confirmar") ?? "");

  const errPass = validarPassword(nueva);
  if (errPass) return { error: errPass, campo: "nueva" };
  if (nueva !== confirmar) {
    return { error: "Las contraseñas no coinciden.", campo: "confirmar" };
  }

  // Verificar la contraseña actual reautenticando.
  const { error: errAuth } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: actual,
  });
  if (errAuth) return { error: "La contraseña actual no es correcta.", campo: "actual" };

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return { error: error.message };

  return { ok: "Contraseña actualizada." };
}
```

- [ ] **Paso 2: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add "web/src/app/(app)/perfil/acciones.ts"
git commit -m "B-20: server actions actualizarPerfil + cambiarContrasena"
```

---

## Tarea 21 — Pantalla `/perfil`

**Files:**
- Create: `web/src/app/(app)/perfil/page.tsx`

**Steps:**

- [ ] **Paso 1: Crear el fichero**

```tsx
import { redirect } from "next/navigation";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

import { FormularioPerfil } from "./FormularioPerfil";

export default async function PaginaPerfil() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const { data: perfil } = await admin
    .from("profiles")
    .select("nombre_usuario, nombre_completo, avatar_url")
    .eq("id", user.id)
    .single();

  if (!perfil) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto p-8 flex flex-col gap-10">
      <header>
        <p className="font-display italic text-accent text-sm m-0">— tu cuenta</p>
        <h1 className="font-display font-medium text-4xl tracking-tight m-0 mt-1">
          Perfil.
        </h1>
      </header>

      <FormularioPerfil
        email={user.email ?? ""}
        nombreUsuario={perfil.nombre_usuario}
        nombreCompleto={perfil.nombre_completo}
        avatarUrl={perfil.avatar_url}
      />
    </div>
  );
}
```

- [ ] **Paso 2: Crear el formulario cliente — `web/src/app/(app)/perfil/FormularioPerfil.tsx`**

```tsx
"use client";

import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { AvatarUpload } from "@/components/ui/AvatarUpload";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useToast } from "@/components/ui/Toast";

import { actualizarPerfil, cambiarContrasena } from "./acciones";

interface Props {
  email: string;
  nombreUsuario: string;
  nombreCompleto: string | null;
  avatarUrl: string | null;
}

export function FormularioPerfil({
  email,
  nombreUsuario,
  nombreCompleto,
  avatarUrl: avatarUrlInicial,
}: Props) {
  const { mostrar } = useToast();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(avatarUrlInicial);

  const [estadoPerfil, accionPerfil, pendientePerfil] = useActionState(
    actualizarPerfil,
    undefined,
  );
  const [estadoPass, accionPass, pendientePass] = useActionState(
    cambiarContrasena,
    undefined,
  );

  // Mostrar feedback de las actions vía toast.
  if (estadoPerfil && "ok" in estadoPerfil) {
    mostrar({ variant: "ok", titulo: estadoPerfil.ok });
  }
  if (estadoPass && "ok" in estadoPass) {
    mostrar({ variant: "ok", titulo: estadoPass.ok });
  }

  const errCampo = (e: typeof estadoPass, c: string) =>
    e && "error" in e && e.campo === c ? e.error : undefined;
  const errGen = (e: typeof estadoPass) =>
    e && "error" in e && !e.campo ? e.error : undefined;

  return (
    <div className="flex flex-col gap-12">
      {/* Identidad */}
      <section className="flex flex-col gap-6 rounded-[18px] border border-rule bg-card p-7">
        <h2 className="font-display font-medium text-xl tracking-tight m-0">
          Identidad
        </h2>

        <AvatarUpload
          nombreCompleto={nombreCompleto}
          nombreUsuario={nombreUsuario}
          avatarUrl={avatarUrl}
          onSubidoCorrecto={(u) => {
            setAvatarUrl(u);
            mostrar({ variant: "ok", titulo: "Foto actualizada." });
          }}
          onQuitado={() => {
            setAvatarUrl(null);
            mostrar({ variant: "ok", titulo: "Foto eliminada." });
          }}
          onError={(m) => mostrar({ variant: "err", titulo: m })}
        />

        <form action={accionPerfil} className="flex flex-col gap-5">
          <FormField label="Nombre de usuario">
            <Input value={nombreUsuario} disabled />
          </FormField>

          <FormField label="Email">
            <Input value={email} disabled type="email" />
          </FormField>

          <FormField
            label="Nombre completo"
            htmlFor="nombre_completo"
            error={errCampo(estadoPerfil, "nombre_completo")}
          >
            <Input
              id="nombre_completo"
              name="nombre_completo"
              defaultValue={nombreCompleto ?? ""}
              maxLength={80}
            />
          </FormField>

          {errGen(estadoPerfil) && <Alert variant="err">{errGen(estadoPerfil)}</Alert>}

          <div>
            <Button type="submit" variant="accent" size="md" loading={pendientePerfil}>
              {pendientePerfil ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </section>

      {/* Seguridad */}
      <section className="flex flex-col gap-6 rounded-[18px] border border-rule bg-card p-7">
        <h2 className="font-display font-medium text-xl tracking-tight m-0">
          Cambiar contraseña
        </h2>

        <form action={accionPass} className="flex flex-col gap-5">
          <FormField label="Contraseña actual" htmlFor="actual" error={errCampo(estadoPass, "actual")}>
            <PasswordInput
              id="actual"
              name="actual"
              required
              autoComplete="current-password"
              error={!!errCampo(estadoPass, "actual")}
            />
          </FormField>

          <FormField
            label="Nueva contraseña"
            htmlFor="nueva"
            hint="Mínimo 8 caracteres."
            error={errCampo(estadoPass, "nueva")}
          >
            <PasswordInput
              id="nueva"
              name="nueva"
              required
              minLength={8}
              autoComplete="new-password"
              error={!!errCampo(estadoPass, "nueva")}
            />
          </FormField>

          <FormField
            label="Confirmar nueva contraseña"
            htmlFor="confirmar"
            error={errCampo(estadoPass, "confirmar")}
          >
            <PasswordInput
              id="confirmar"
              name="confirmar"
              required
              minLength={8}
              autoComplete="new-password"
              error={!!errCampo(estadoPass, "confirmar")}
            />
          </FormField>

          {errGen(estadoPass) && <Alert variant="err">{errGen(estadoPass)}</Alert>}

          <div>
            <Button type="submit" variant="accent" size="md" loading={pendientePass}>
              {pendientePass ? "Actualizando…" : "Actualizar contraseña"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
```

- [ ] **Paso 3: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Paso 4: Commit**

```bash
git add "web/src/app/(app)/perfil/page.tsx" "web/src/app/(app)/perfil/FormularioPerfil.tsx"
git commit -m "B-21: pantalla /perfil con AvatarUpload y cambio de contrasena"
```

---

## Tarea 22 — Actualizar `(app)/layout.tsx` con `Avatar` real + `ToastProvider`

**Files:**
- Modify: `web/src/app/(app)/layout.tsx`

**Steps:**

- [ ] **Paso 1: Reemplazar el contenido entero de `web/src/app/(app)/layout.tsx`**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";

import { cerrarSesion } from "@/app/(auth)/acciones";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ToastProvider } from "@/components/ui/Toast";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

const enlacesNav = [
  { href: "/mis-documentos", label: "Mis documentos" },
  { href: "/explorar", label: "Explorar" },
  { href: "/compartidos", label: "Compartidos" },
  { href: "/usuarios", label: "Usuarios" },
  { href: "/carpetas", label: "Carpetas" },
  { href: "/organizaciones", label: "Organizaciones" },
];

export default async function LayoutApp({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const { data: perfil } = await admin
    .from("profiles")
    .select("nombre_usuario, nombre_completo, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <ToastProvider>
      <div className="flex min-h-full flex-col bg-paper">
        <header className="flex items-center gap-5 border-b border-rule bg-card px-6 py-3">
          <Link
            href="/inicio"
            className="font-display font-medium text-lg tracking-tight"
          >
            Dr<em className="italic text-accent">es</em>.
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {enlacesNav.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                className="text-mute hover:text-ink"
              >
                {e.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/perfil"
              className="flex items-center gap-2 hover:opacity-80"
            >
              <Avatar
                nombreCompleto={perfil?.nombre_completo ?? null}
                nombreUsuario={perfil?.nombre_usuario ?? user.email ?? ""}
                avatarUrl={perfil?.avatar_url ?? null}
                size="md"
              />
              <span className="text-sm font-medium">
                {perfil?.nombre_usuario ?? user.email}
              </span>
            </Link>
            <form action={cerrarSesion}>
              <Button type="submit" variant="ghost" size="sm">
                Cerrar sesión
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </ToastProvider>
  );
}
```

- [ ] **Paso 2: Probar visualmente**

```bash
cd web && npm run dev
```

Esperado: topbar con marca `Dres.`, navegación, avatar real (iniciales o foto si subiste una), botón "Cerrar sesión" ghost. Click en el avatar lleva a `/perfil`.

- [ ] **Paso 3: Commit**

```bash
git add "web/src/app/(app)/layout.tsx"
git commit -m "B-22: topbar con Avatar real y ToastProvider en zona autenticada"
```

---

## Tarea 23 — Landing pública (`/`) rediseñada

**Files:**
- Modify: `web/src/app/page.tsx`

**Steps:**

- [ ] **Paso 1: Reemplazar el contenido entero de `web/src/app/page.tsx`**

```tsx
import Link from "next/link";

import { Button } from "@/components/ui/Button";

export default function PaginaPrincipal() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 p-8 text-center">
      <header className="max-w-2xl flex flex-col gap-4">
        <p className="font-display italic text-accent text-base m-0">
          — una forma más serena de archivar.
        </p>
        <h1 className="font-display font-medium text-5xl sm:text-6xl tracking-[-0.025em] leading-[1.05] m-0">
          Tus documentos, <em className="italic text-accent">protegidos</em> sin que
          tengas que pensarlo.
        </h1>
        <p className="text-base text-mute leading-relaxed max-w-md mx-auto">
          Sube cualquier archivo. Una IA decide si puede ver la luz o no. Tú revisas,
          lo cambias si hace falta, y sigues con tu día.
        </p>
      </header>
      <div className="flex gap-3">
        <Link href="/registro">
          <Button variant="accent" size="lg">
            Crear cuenta
          </Button>
        </Link>
        <Link href="/login">
          <Button variant="ghost" size="lg">
            Iniciar sesión
          </Button>
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Paso 2: Probar visualmente**

```bash
cd web && npm run dev
```

Abrir `http://localhost:3000/`. Esperado: landing con tipografía Fraunces, eyebrow italic accent, dos CTAs principal/ghost del sistema.

- [ ] **Paso 3: Commit**

```bash
git add web/src/app/page.tsx
git commit -m "B-23: landing publica rediseniada con sistema Esmeralda biblioteca"
```

---

## Tarea 24 — Smoke test end-to-end manual

**Files:** Ninguno.

**Steps:**

- [ ] **Paso 1: Build de producción local**

```bash
cd web && npm run build
```

Esperado: build limpio, sin errores de tipo ni de import. Listar las rutas y comprobar que aparecen `/recuperar`, `/recuperar/confirmar`, `/perfil`, `/api/perfil/avatar`.

- [ ] **Paso 2: Tests unitarios verdes**

```bash
cd web && npm test
```

Esperado: los 14 tests de utilidades pasan.

- [ ] **Paso 3: Test manual del flujo completo**

```bash
cd web && npm run dev
```

Ir paso a paso:

1. `/` — landing carga con tipografía Fraunces; click "Crear cuenta".
2. `/registro` — formulario nuevo. Probar:
   - Username `ab` (2 chars) → error inline "al menos 3".
   - Username con espacio → error "letras, números, punto, guion".
   - Username válido pero ya usado (registra una vez, intenta de nuevo) → error "ya está en uso".
   - Password de 7 chars → error "al menos 8".
   - Password ≠ confirmación → mensaje en vivo + botón disabled.
   - Datos correctos → redirige a `/inicio`.
3. Cerrar sesión desde la topbar.
4. `/login` — entrar con credenciales malas → Alert err. Credenciales buenas → `/inicio`.
5. Cerrar sesión. `/login` → click "¿Olvidaste tu contraseña?" → `/recuperar` → enviar email → mensaje "revisa tu bandeja".
6. Abrir el email, click el enlace → `/recuperar/confirmar` con tokens en hash → "Validando…" → form → nueva contraseña → redirige a `/inicio`.
7. `/perfil` — verifica que muestra username/email correctos, nombre completo editable.
8. **Avatar:** subir una imagen JPG. Esperado: aparece la foto en `/perfil` y en la topbar. Quitar foto → vuelve a iniciales.
9. **Cambiar contraseña:** introducir actual incorrecta → error "no es correcta". Correcta + nueva válida + confirmación → toast "Contraseña actualizada".
10. Logout, login con la nueva contraseña → entra.
11. Cambiar el tema del navegador (dev tools → Rendering → Emulate CSS prefers-color-scheme: dark) y verificar que toda la app responde sin cambiar nada del código.

- [ ] **Paso 4: Si todo pasa, commit final de cierre del sub-proyecto B**

No hay cambios pendientes; este commit cierra el sub-proyecto B con la entrada correspondiente en `implementation-notes.md`. **Antes de commitear: actualizar la bitácora** con la entrada del sub-proyecto B siguiendo el formato establecido (Pedido / Decidido por Claude / Cambios / Compromisos / A revisar).

```bash
git add implementation-notes.md
git commit -m "B-24: cierre sub-proyecto B (auth + perfil) en bitacora"
```

---

## Self-review (cobertura de la spec)

| Requisito de la spec | Tarea(s) que lo cubre |
|---|---|
| Pantalla /registro con username + confirm | T13, T14 |
| Pantalla /login | T15 |
| Pantalla /recuperar | T13 (action), T16 |
| Pantalla /recuperar/confirmar | T17 |
| Pantalla /perfil | T20, T21 |
| Validación username 3-32 + regex | T4 |
| Validación password min 8 | T4 |
| Validación email | T4 |
| Chequeo unicidad username | T13 |
| Sin enumeration en recuperar | T13 |
| Avatar iniciales generadas | T4 (calcularIniciales), T8 (Avatar) |
| Avatar upload + recorte canvas | T18 |
| Avatar bucket + RLS | T12 |
| Avatar route handler | T19 |
| Trigger sin sufijo aleatorio | T12 |
| Verificación contraseña actual | T20 |
| Tokens del sistema en globals.css | T3 |
| Fuentes via next/font/google | T2 |
| Componentes ui/ lote 1 (Button, Input, ...) | T5–T11 |
| Toasts con provider | T9, T22 |
| Topbar con Avatar real | T22 |
| Landing pública rediseñada | T23 |
| Migración aplicada + redirect URL en panel | T12 |

Sin huecos detectados.
