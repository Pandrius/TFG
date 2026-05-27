# C.4 — Explorar y usuarios

**Sub-bloque 4 del sub-proyecto C** (rediseño + UX de documentos).
Fecha de cierre: 2026-05-27.
Estado: spec aprobada; pendiente plan de implementación.

## Resumen

Rediseño de `/explorar` y `/usuarios` al sistema Esmeralda Biblioteca.
Ambas pantallas ya funcionan (búsqueda full-text, favoritos, bloqueos).
C.4 es un esfuerzo puramente de UI con dos mejoras menores de UX:
búsqueda reactiva en `/explorar` mediante `<form>` GET sin JS (ya implementada),
y Avatar en `/usuarios`.

## Sin cambios en base de datos

RPC `buscar_documentos`, tabla `profiles`, `favoritos`, `bloqueos` — todo intacto.
No hay migraciones nuevas.

## Pantalla `/explorar`

Ancho `max-w-5xl mx-auto`.

### Cabecera

```
— explorar
Documentos públicos
```

- Eyebrow Fraunces italic accent: `— explorar`
- H1 Fraunces 500 28 px: `Documentos *públicos*` ("públicos" italic accent)
- Subtítulo muted: `Busca entre los documentos que la comunidad ha compartido.`

### Buscador

Formulario `<form method="GET">` con:
- `Input` del sistema (placeholder `Buscar documentos…`, name=`q`, defaultValue=termino).
- `Button variant="primary" size="md"` type=submit: texto `Buscar`.
- Si hay término activo: `Button variant="ghost" size="md"` → `href="/explorar"`: texto `Limpiar`.
- Si hay búsqueda activa, subtítulo cambia a:
  `N resultados para "término"` (muted, caption).

### Feed de documentos (sin búsqueda)

Grid de tarjetas 2 columnas en md, 1 en sm:
`grid grid-cols-1 md:grid-cols-2 gap-4`.

**Tarjeta de documento** (`rounded-[14px] border border-rule bg-paper p-4`):
```
[TYP] Nombre del documento (Fraunces 500, truncate)
      Autor · fecha · KB           (caption mono muted)
                    [Tag pub]  [Descargar →]
```

Detalle:
- Chip de tipo: `w-10 h-12 rounded-[6px] border border-rule bg-card font-display italic text-accent text-[13px]`.
- Nombre: `font-display font-medium text-[15px]` + link `href="/documentos/[id]"` hover underline.
- Subtítulo: `text-mute text-[11px] font-mono`. Autor = `nombre_completo || nombre_usuario || "—"`.
  Si el documento es propio: "Tú".
- `Tag variant="pub"` (siempre público en el feed sin búsqueda).
- `Button variant="ghost" size="sm"` `asChild` → `<a href="/api/documentos/[id]/url">` "Descargar".

### Resultados de búsqueda

Lista vertical en vez de grid (más scannable con texto largo):
`rounded-[14px] border border-rule bg-paper overflow-hidden`

Por fila (igual que TablaDocumentos pero sin acciones de owner):
- Chip tipo + nombre (link) + autor + fecha + KB + Tag pub/priv + Descargar.

### Estado vacío

Componente inline (no hay componente dedicado `Empty` en el sistema todavía;
usar estructura simple):
```jsx
<div className="py-16 text-center">
  <p className="font-display italic text-accent text-lg mb-1">Sin resultados</p>
  <p className="text-mute text-sm">Prueba con otro término de búsqueda.</p>
</div>
```

## Pantalla `/usuarios`

Ancho `max-w-3xl mx-auto`.

### Cabecera

- Eyebrow: `— comunidad`
- H1: `*Usuarios*`
- Subtítulo (si hay búsqueda): `N resultados`.

### Buscador

Formulario GET (igual que Explorar):
- `Input` placeholder `Buscar por nombre o @usuario…`, name=`buscar`.
- `Button primary` "Buscar".
- Limpiar si hay término.

### Resultados de búsqueda

Lista `rounded-[14px] border border-rule bg-paper overflow-hidden`:

Por fila (`grid grid-cols-[36px_1fr_auto_auto]`):
- `Avatar` del sistema (36 px, sin foto → inicial del nombre).
- Nombre + `@username` (muted mono xs).
- `Button variant="ghost" size="sm"` "Favorito" / "Quitar favorito":
  - Activo: fondo `accent-tint` text `accent`.
  - Inactivo: estilo ghost normal.
  - Llama `alternarFavorito` server action (existente).
- `Button variant="ghost" size="sm"` "Bloquear" / "Desbloquear":
  - Activo: fondo `danger-tint` text `danger`.
  - Llama `alternarBloqueo` server action (existente).

> Nota: Los botones de favorito y bloqueo usan `<form action={...}>` con el
> pattern de server actions nativas (sin `useActionState`), igual que el
> código original. Preservar ese patrón para no re-arquitectar.

### Mis favoritos

Sección separada (visible si `favoritosIds.size > 0`):
- Eyebrow caption: `Mis favoritos`
- Lista con mismo estilo, fila simplificada:
  Avatar + nombre + @username + "Quitar favorito" (ghost).

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `(app)/explorar/page.tsx` | Rediseño completo |
| `(app)/usuarios/page.tsx` | Rediseño completo |
| `(app)/usuarios/acciones.ts` | Sin cambios funcionales |

## A revisar (humano)

- **Avatar en usuarios**: el modelo `profiles` no tiene campo de avatar_url expuesto
  directamente. Usar inicial del nombre como fallback (igual que el componente
  `Avatar` del sistema). Si se desea mostrar foto real, necesitaría join con
  Storage bucket `avatares`.
- **Bloqueos ocultos**: un usuario bloqueado no aparece en resultados de búsqueda
  (RLS lo filtra). Confirmar si la UI debe indicar "bloqueado" o simplemente
  no aparece.
- **Paginación en Explorar**: actualmente se muestran los 100 más recientes.
  Para TFG es suficiente, pero anotar para futura mejora.
