# Auth + perfil — DRES

**Sub-proyecto B** de la mejora UI/UX integral.
Fecha de cierre: 2026-05-26.
Estado: spec aprobada visualmente; pendiente plan de implementación.

## Resumen

Rediseño del flujo de autenticación y primera versión funcional del
perfil de usuario, aplicando el sistema de diseño cerrado en el
sub-proyecto A (Esmeralda biblioteca). Scope: **mínimo viable** — solo
identidad básica, sin preferencias persistidas.

Incluye 3 pantallas nuevas (recuperación, confirmación, perfil), 2
rediseñadas (registro, login), 1 migración nueva (bucket de avatares +
ajuste al trigger), y un primer lote de componentes UI base que servirán
también a los sub-proyectos C y D.

## Decisiones tomadas

| Pregunta | Decisión |
|---|---|
| Scope del perfil | **Mínimo viable**: identidad + password. Sin preferencias guardadas. Tema visual = `prefers-color-scheme` del navegador, sin toggle. |
| Avatar | **Iniciales generadas + subida opcional**. Sin foto → iniciales sobre fondo `accent-soft` (componente del sistema A). Con foto → imagen circular recortada en cliente. |
| Campos editables tras registro | **Solo nombre completo, foto y contraseña**. Username y email se fijan al registrarse. Si alguien necesita cambiar el email es un caso de soporte. |
| Método de login | **Solo email**. No habilitamos login por username — añade complejidad sin valor para mínimo viable. |
| Política de contraseña | **8 caracteres mínimo, sin obligar mayúscula/número**. Sube desde los 6 actuales; no penalizamos con reglas adicionales (UX peor, beneficio dudoso). |
| Formato de username | **3–32 caracteres**, letras, números, punto y guion bajo. Único en la tabla `profiles`. |
| Recuperación de contraseña | **Flujo built-in de Supabase**: `resetPasswordForEmail` envía link → pantalla custom para nueva contraseña. |
| Cuándo aplicar el sistema de diseño A | **Primer commit de B**, no PR separado. Aplicar tokens + crear componentes base aquí evita un PR de "migración masiva" sin feature que lo justifique. |

## Pantallas

### `/registro` (rediseñada)

**Campos** (en orden):
1. Nombre de usuario · text · `required` · 3–32, `^[a-zA-Z0-9._]+$` · valida unicidad en servidor antes de signUp.
2. Nombre completo · text · opcional · max 80 chars.
3. Email · email · `required` · valida formato.
4. Contraseña · password · `required` · min 8.
5. Confirmar contraseña · password · `required` · debe coincidir con la anterior (validación cliente).

**Comportamiento**:
- Validación cliente: confirma matching de password antes de enviar.
- Server action `registrarse` reescrita: chequea unicidad de username
  contra `profiles` (con admin client, single query), llama a `signUp`
  con `options.data.nombre_usuario` y `nombre_completo`. El trigger
  ajustado (ver más abajo) usa el username del metadata sin sufijo.
- Sin confirmación de email → `redirect("/inicio")` al success.
- Errores con `Toast` (err) en lugar de párrafo rojo inline. Errores de
  campo concreto (username ya existe, formato inválido) en `.err`
  debajo del input.

### `/login` (rediseñada)

**Campos**:
1. Email · email · `required`.
2. Contraseña · password · `required`.

**Comportamiento**:
- Enlace inline "¿Olvidaste tu contraseña?" → `/recuperar`.
- Enlace inferior "¿No tienes cuenta? Regístrate" → `/registro`.
- Error de credenciales → `Toast` (err) "Email o contraseña
  incorrectos".

### `/recuperar` (nueva)

**Campos**:
1. Email · email · `required`.

**Comportamiento**:
- Server action llama a `supabase.auth.resetPasswordForEmail(email,
  { redirectTo: "<origen>/recuperar/confirmar" })`.
- Siempre devuelve mensaje positivo ("Si ese email está registrado, te
  hemos enviado un enlace") — **no confirma si el email existe** para
  evitar enumeration.
- Estado de éxito reemplaza el formulario con un mensaje + enlace
  "Volver al login".

### `/recuperar/confirmar` (nueva)

**Campos**:
1. Nueva contraseña · password · `required` · min 8.
2. Confirmar nueva contraseña · password · `required`.

**Comportamiento**:
- Página llega tras click en el email; Supabase deposita el
  `access_token` y `refresh_token` en el hash de la URL. Un client
  component al montar llama a `supabase.auth.setSession({...})` con los
  tokens, luego llama a `supabase.auth.updateUser({password: nueva})`.
- Éxito → `Toast` (ok) "Contraseña actualizada" + redirect a `/inicio`.
- Token caducado o inválido → error claro + enlace para reenviar.

### `/perfil` (nueva)

**Estructura** (una sola página, dos secciones visuales):

**1. Identidad**
- Avatar (componente `AvatarUpload`):
  - Sin foto subida → iniciales sobre fondo `accent-soft` (44×44 +
    variante grande 96×96 en esta página). Las iniciales se calculan
    así: si hay `nombre_completo`, primera letra del primer y último
    token (`"Andrés García" → "AG"`); si no, primeras dos letras del
    `nombre_usuario` (`"andres.garcia" → "AN"`).
  - Con foto → render de la URL del bucket. Botón "Cambiar" y "Quitar".
- Nombre de usuario (mostrado, no editable). Pequeño botón copiar enlace.
- Email (mostrado, no editable, en `mute`).
- Nombre completo · text editable · max 80 chars.
- Botón "Guardar cambios" (`accent`) que dispara server action.

**2. Seguridad**
- Subsección "Cambiar contraseña":
  - Contraseña actual · password · `required`.
  - Nueva contraseña · password · `required` · min 8.
  - Confirmar nueva contraseña · password · `required`.
  - Botón "Actualizar contraseña" (`accent`).
- Server action: verifica la contraseña actual (re-auth con
  `signInWithPassword` usando el email del usuario), luego
  `updateUser({password})`. Si la actual es incorrecta → `Toast` (err).

**Eliminar cuenta** queda fuera de scope (lo descartamos en "mínimo
viable").

## Cambios en base de datos

### Migración nueva — `supabase/migrations/20260526000001_perfil_y_avatares.sql`

1. **Bucket `avatars`** en Supabase storage:
   - Lectura pública (los avatares se sirven directamente en `<img>`).
   - Escritura: solo el dueño puede subir/borrar dentro de su carpeta
     `{auth.uid()}/*`.
   - Tamaño máximo del fichero: 2 MB (chequeo en cliente; storage no
     impone límite por bucket pero lo respaldamos en el route handler).
2. **Ajuste al trigger `crear_perfil_nuevo_usuario`**:
   - Usar `NEW.raw_user_meta_data->>'nombre_usuario'` directamente sin
     concatenar sufijo aleatorio. La unicidad la garantiza el formulario
     de registro (chequeo previo) + el `UNIQUE NOT NULL` de la columna.
   - Mantener fallback al `split_part(NEW.email, '@', 1)` solo para
     usuarios creados sin metadata (caso edge: creación desde el panel
     admin de Supabase).

### Sin tablas nuevas

`profiles` ya tiene `id`, `nombre_usuario`, `nombre_completo`,
`avatar_url`, `creado_en`. No hace falta tocar el esquema.

## Componentes UI

### Lote 1 — del sistema A (creados en este sub-proyecto, reutilizables)

Bajo `web/src/components/ui/`:

- `Button` — variantes `primary`, `accent`, `ghost`, `danger`, `link`;
  tamaños `sm`, `md`, `lg`; estados normal/hover/focus/disabled/loading.
- `Input` — text/email/password/search; con icono y kbd opcional.
- `PasswordInput` — extiende `Input` con icono ojo para toggle
  show/hide. Estado controlado.
- `FormField` — wrapper que combina label (Fraunces italic), input,
  hint y error con la espacialidad del sistema.
- `Tag` — outline con dot, 5 variantes (pub/priv/proc/err/neutral).
- `Avatar` — iniciales o imagen, 3 tamaños (sm/md/lg).
- `Toast` — 3 variantes (ok/warn/err). Sistema simple basado en una
  pila global con `useToast()` (provider en `layout.tsx`).
- `Modal` — overlay + contenido, soporta `requireConfirmation` (botón
  acción desactivado hasta marcar checkbox).
- `Alert` — banner inline (variante de toast estático, no notifica).

### Lote específico de B

- `AvatarUpload` — `Avatar` extendido con:
  - Botón "Cambiar foto" → file input oculto.
  - Al elegir fichero: cargar en `<canvas>`, recortar al cuadrado
    centrado, redimensionar a 256×256, convertir a `image/webp`,
    subir al bucket vía route `/api/perfil/avatar`.
  - Botón "Quitar foto" → borra fichero del bucket y limpia
    `avatar_url`.
  - Estados: idle, uploading (spinner sobre el avatar), error (toast).

## Server actions y endpoints

Bajo `web/src/app/(auth)/acciones.ts` (reescritas) y
`web/src/app/(app)/perfil/acciones.ts` (nuevas):

- `registrarse(estado, datos)` — valida + chequea unicidad username
  + signUp.
- `iniciarSesion(estado, datos)` — sin cambios funcionales, solo
  refactor de error handling.
- `cerrarSesion()` — sin cambios.
- `solicitarRecuperacion(estado, datos)` — llama
  `resetPasswordForEmail`. Siempre éxito visible.
- `actualizarPerfil(estado, datos)` — actualiza `nombre_completo` en
  `profiles`.
- `cambiarContrasena(estado, datos)` — verifica actual + actualiza.

Route handler nuevo:
- `web/src/app/api/perfil/avatar/route.ts` — `POST` para subir
  (formData con `image/webp`), `DELETE` para quitar. Verifica
  autenticación, sube a `{auth.uid()}/avatar.webp`, actualiza
  `profiles.avatar_url` con la URL pública del bucket.

## Aplicación del sistema de diseño A (primer commit del sub-proyecto B)

Antes de tocar cualquier pantalla:

1. **Configurar fuentes** en `web/src/app/layout.tsx`:
   ```tsx
   import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
   const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
   const fraunces = Fraunces({
     subsets: ["latin"],
     weight: ["400", "500"],
     style: ["normal", "italic"],
     variable: "--font-display",
   });
   const mono = JetBrains_Mono({
     subsets: ["latin"],
     weight: ["400"],
     variable: "--font-mono",
   });
   ```
2. **Reescribir `web/src/app/globals.css`** con las CSS custom
   properties de la spec del sistema. Conservar `@import "tailwindcss"`
   (lo seguimos usando para utilidades).
3. **Crear `web/src/components/ui/`** con el lote 1 listado arriba.
4. Después, ya con la infraestructura lista, migrar `/login` y
   `/registro` y crear `/recuperar`, `/recuperar/confirmar`, `/perfil`.

## Lo que NO va en este sub-proyecto

- Migrar el resto de pantallas existentes al nuevo sistema (mis
  documentos, explorar, carpetas, organizaciones, etc.) — eso va en C.
- Cualquier preferencia persistida (tema, privacidad por defecto al
  subir, notificaciones) — descartado en mínimo viable.
- Edición de username, email o eliminar cuenta — descartado.
- Sesiones activas, login con OAuth, 2FA — fuera de scope.

## A revisar (humano)

- **Bucket de Supabase Storage**: la migración 20260526000001 lo crea
  con SQL; en algunos proyectos Supabase exige crearlo desde el panel
  porque el `storage.buckets` está restringido. Verificar al aplicar
  la migración y, si falla, crearlo desde el panel y dejar solo las
  policies en SQL.
- **Reset password redirect URL**: hay que añadir
  `<origen>/recuperar/confirmar` a la lista de "redirect URLs" del
  proyecto Supabase (panel Auth → URL Configuration), tanto para
  desarrollo como para producción.
- **Email del reset**: por defecto Supabase envía un email plano. Si
  queremos personalizar la plantilla, se hace desde el panel; queda
  fuera de scope inicial.
- **Tema oscuro real**: implementado con `@media (prefers-color-scheme:
  dark)` puro. Cuando lleguemos a un toggle manual (si lo metemos en
  un sub-proyecto futuro), pasaremos a `data-theme` en el `<html>`.

## Fuente de verdad visual

- Componentes y tokens: `design/04-sistema.html`.
- Pantallas de auth: hay que **maquetar** en `design/06-auth.html` antes
  de implementar — login, registro (con confirm password), recuperar,
  perfil. Esto NO está hecho aún. Se hará como **primer paso del plan
  de implementación**, no en este spec.
