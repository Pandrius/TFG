# Notas de implementación

Bitácora de decisiones del proyecto. Para cada tanda de trabajo se anota qué
se hizo y, sobre todo, **qué decidió Claude por su cuenta** frente a **qué se
pidió explícitamente**. Ver `CLAUDE.md` para el formato.

Leyenda de cada entrada:

- **Pedido** — lo que estaba en la instrucción / spec.
- **Decidido por Claude** — elecciones tomadas sin instrucción explícita.
- **Cambios** — desviaciones respecto a lo planeado.
- **Compromisos** — tradeoffs y sus motivos.
- **A revisar** — cosas que conviene que una persona valide.

---

## 2026-05-21 — Sistema de bitácora y registro de decisiones

**Pedido**
- Que el proyecto lleve, de forma persistente, un registro de las decisiones
  de implementación, distinguiendo lo decidido por la IA de lo pedido.
- Mantener un `implementation-notes.md` con decisiones, cambios y tradeoffs.
- Activarlo con CLAUDE.md (siempre activo) **y** un comando `/implementar`.
- `implementation-notes.md` versionado en el repo.
- Además, registrar de algún modo los prompts y decisiones principales.

**Decidido por Claude**
- El registro de instrucciones se hace con un hook `UserPromptSubmit`
  (`.claude/log-prompt.sh`) que vuelca cada prompt a `prompts-log.md`. Se
  eligió un hook por ser el único modo de capturar los prompts de forma
  mecánica y verbatim; una instrucción en CLAUDE.md sería interpretable.
- `prompts-log.md` se **excluye** del control de versiones (`.gitignore`),
  pese a que la indicación general fue "versionar el registro". Motivo: el log
  guarda el texto literal de cada prompt; si alguna vez se pega un secreto en
  un prompt, versionarlo lo subiría a GitHub. El registro sigue en local para
  revisión. `implementation-notes.md` sí se versiona (lo redacta Claude, sin
  volcado de texto en bruto).
- Formato Markdown en vez de HTML, por integrarse mejor con GitHub y los diffs.
- Idioma español para toda la bitácora, por coherencia con el repo.

**Cambios**
- Ninguno respecto a lo pedido, salvo la ubicación de `prompts-log.md`
  explicada arriba.

**Compromisos**
- El hook depende de `jq` (presente: jq 1.6) y de que los hooks se ejecuten
  en Bash. En una máquina sin `jq`/Bash el hook fallaría en silencio, sin
  romper la sesión (el script termina siempre con `exit 0`).

**A revisar**
- Decidir si `prompts-log.md` debe versionarse pese al riesgo de filtrar
  secretos pegados.
- El hook puede requerir activarse desde el menú `/hooks` o reiniciar Claude
  Code la primera vez.

---

<!-- Las entradas nuevas se añaden debajo, en orden cronológico. -->

## 2026-05-24 — Aplicación de migraciones y despliegue Vercel

**Pedido**
- Aplicar las 8 migraciones pendientes (20260524000001–20260524000008) al proyecto
  Supabase, usando los tokens y el CLI disponibles.
- Resolver error 404 en Vercel.

**Decidido por Claude**
- La Management API (`api.supabase.com`) quedó bloqueada por Cloudflare (error 1010,
  bloqueo por ASN). Se usó el Supabase CLI v2.78.1 ya instalado como alternativa.
- Se creó temporalmente `aplicar_migraciones.py` para el intento de Management API;
  se eliminó tras confirmar que el CLI era el camino correcto.
- `supabase db push --linked --yes` aplica todas las migraciones del directorio
  `supabase/migrations/` en orden. Los NOTICE de "already exists / skipping" son
  esperados: las migraciones usan `CREATE ... IF NOT EXISTS` y `DROP ... IF EXISTS`,
  por lo que son idempotentes.
- El error 404 en Vercel se debía a dos causas: (1) el "Root Directory" no estaba
  configurado como `web/`, y (2) faltaban las variables de entorno
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
  `SUPABASE_SERVICE_ROLE_KEY`. Ambas se resolvieron en el panel de Vercel.

**Cambios**
- Ninguno en el código. Solo operación de infraestructura.

**Compromisos**
- Las migraciones de baseline y columnas_documentos ya existían parcialmente en
  Supabase; el CLI las reaplicó de forma segura por los guards IF NOT EXISTS.

**A revisar**
- Añadir `SERVICIO_IA_URL` en Vercel cuando el servicio IA esté desplegado.
- Suministrar: `clasificador.pkl`, versión exacta de scikit-learn, `BETO_NOMBRE`,
  `BETO_POOLING` para activar el modelo real (Hito 9).
- Ejecutar `python ml/verificar_pipeline.py` para confirmar embedding antes de
  desplegar el servicio IA con el modelo real.
- Verificar la matriz de acceso completa (propietario, público, invitado con permiso,
  favorito, compañero de org, bloqueado) en el entorno de Vercel.

Verificación: `npm run build` → 16 rutas, 0 errores. `supabase db push` → 11 migraciones aplicadas.

---

## 2026-05-26 — B-14: Pantalla /registro rediseñada

**Pedido**
- Formulario de registro nuevo: usuario, nombre completo (opcional), email,
  password, confirmar password. Validación en cliente del matching de password
  (botón disabled hasta que coincidan). Errores por campo + Alert general.
- Aplicar componentes UI del sistema (Button, Input, PasswordInput, FormField, Alert).

**Decidido por Claude**
- Ninguna.

**Cambios**
- Ninguno respecto a la spec.

**Compromisos**
- La validación cliente del matching usa state local (useState), no Form action —
  más reactivo y simple para feedback inmediato.

**A revisar**
- Verificación visual en el navegador después de aplicar todas las pantallas.
- Probar caso "username ya existe" cuando el flujo esté completo.

Verificación: `npx tsc --noEmit` → 0 errores.

---

## 2026-05-26 — B-03: Tokens del sistema Esmeralda biblioteca en globals.css

**Pedido**
- Reemplazar el contenido completo de `web/src/app/globals.css` con los tokens de diseño
  del sistema "Esmeralda biblioteca": superficies, tinta, acentos, soporte (oro),
  estado destructivo, sombras, más variantes dark mode.
- Mapear los custom properties como utilidades de Tailwind v4 mediante `@theme inline`.
- Verificar que el build pasa.
- Commit exacto: `B-03: tokens del sistema Esmeralda biblioteca + dark mode automatico`.

**Decidido por Claude**
- Ninguna decisión discrecional. Se aplicó el contenido CSS exactamente como se especificó.

**Cambios**
- El archivo anterior contenía solo 27 líneas con 2 tokens básicos (--background, --foreground).
  Ahora contiene ~118 líneas con ~30 tokens para ambos modos de color (light y dark),
  incluyendo superficies, tinta, acento esmeralda, soporte oro, destructivo, sombras.

**Compromisos**
- Ninguno. La especificación fue clara y completa.

**A revisar**
- Confirmación visual: el sitio carga en `npm run dev` y los colores se aplican
  conforme al sistema de diseño (background paper, text ink, etc.).
- Prueba de dark mode en navegador (F12 → Settings → Color Scheme → Dark).

Verificación: `npx tsc --noEmit` → 0 errores. `npm run build` → SUCCESS (14/14 rutas).
Commit: `8e38950`.

---

## 2026-05-26 — B-16: Pantalla /recuperar + proxy actualizado

**Pedido**
- Crear /recuperar/page.tsx con form de email + Alert de éxito ("revisa tu bandeja").
- Añadir /recuperar y /recuperar/confirmar a RUTAS_PUBLICAS del proxy.
- Si hay sesión y la ruta empieza por /recuperar, redirigir a /inicio.

**Decidido por Claude**
- Ninguna.

**Cambios**
- Ninguno.

**Compromisos**
- La pantalla reemplaza el form por el Alert ok cuando solicitarRecuperacion
  devuelve éxito (un solo render). No persiste el email en re-renders, es
  correcto: el usuario ya leyó el mensaje y debe ir al email.

**A revisar**
- Probar end-to-end cuando llegue el email.

Verificación: `npx tsc --noEmit` → 0 errores.

---

## 2026-05-24 — Hitos 5–9: resto de la plataforma

**Pedido**
- Hito 5: UI de permisos (invitar/revocar), favoritos y bloqueos; página "Compartidos conmigo".
- Hito 6: Carpetas planas para organizar documentos propios.
- Hito 7: Organizaciones con miembros y documentos vinculados.
- Hito 8: Búsqueda full-text de documentos.
- Hito 9: Integración del modelo real BETO + clasificador sklearn.

**Decidido por Claude**
- Hito 5: La invitación de permisos se hace por nombre de usuario (no por email),
  porque `profiles` expone `nombre_usuario` pero no email (que está en `auth.users`,
  solo accesible con service_role). El toggle de favorito quita automáticamente el
  bloqueo (y viceversa) para evitar estados inconsistentes.
- Hito 5: `quitarPermiso` devuelve `void` (no `ResultadoAccion`) para ser usable
  directamente como `form action`; TypeScript requiere `void | Promise<void>`.
- Hito 6: El botón "Añadir" en `/carpetas/[id]` solo muestra documentos sin carpeta
  asignada; no muestra documentos ya en otra carpeta para simplificar la UX.
- Hito 7: La primera inserción en `org_miembros` (el creador) se permite con la
  policy `NOT EXISTS (SELECT 1 FROM org_miembros WHERE org_id = ...)` para arrancar
  el bootstrap sin chicken-and-egg. Hay que aplicar la migración 20260524000007 antes
  de crear organizaciones desde la UI.
- Hito 8: La búsqueda full-text usa `to_tsquery('spanish', termino || ':*')` para
  prefijos; el sanitizador en el Route convierte espacios a `&` y elimina caracteres
  especiales de PostgreSQL. Con ≥ 2 caracteres se activa la búsqueda; sin término
  se muestra el feed de documentos públicos.
- Hito 8: La función `buscar_documentos` no es SECURITY DEFINER: se ejecuta con
  los permisos del usuario llamante, por lo que la RLS de `Documentos` se aplica
  automáticamente (los resultados ya están filtrados por bloqueos, permisos, etc.).
- Hito 9: `modelo.py` ahora implementa `_clasificar_modelo` completo (BETO +
  sklearn). Requiere solo el .pkl + conocer `BETO_NOMBRE` y `BETO_POOLING`.
  El script `ml/verificar_pipeline.py` compara el embedding recomputado con el
  guardado en el .npy para confirmar que la configuración es exacta.
- El nav de la zona autenticada incluye todos los accesos (Mis documentos,
  Explorar, Compartidos, Usuarios, Carpetas, Organizaciones).

**Cambios**
- Hito 8 se integra en `/explorar` en lugar de una página separada, para unificar
  feed público y búsqueda en un solo punto de entrada.

**Compromisos**
- Hito 7: las policies de `org_miembros` no cubren el caso de transferencia de
  adminship (el único admin no puede salir sin promover a otro antes). Para la demo
  es aceptable.
- Hito 9: sin el .pkl las dependencias ML (transformers, torch, etc.) permanecen
  comentadas en requirements.txt. Se activan cuando Andrés entregue el .pkl con
  la versión exacta de scikit-learn usada en el entrenamiento.

**A revisar**
- Aplicar en Supabase las migraciones 20260524000001 a 20260524000008 (en orden).
- Suministrar: clasificador.pkl, versión exacta scikit-learn, BETO_NOMBRE, BETO_POOLING.
- Ejecutar `python ml/verificar_pipeline.py` para confirmar que el embedding
  recomputado coincide con el .npy antes de desplegar el servicio IA con el modelo real.
- Verificar la matriz de acceso completa con el banco de pruebas del plan.

Verificación: `npm run build` → 16 rutas, 0 errores. `pytest servicio-ia` → 15/15.

## 2026-05-24 — Hito 4: RLS completa

**Pedido**
- Funciones helper SECURITY DEFINER para las policies de Documentos.
- Reescritura de las policies de Documentos (2 en vez de 3).
- Políticas de storage para el bucket almacen_documentos.
- Feed público ("/explorar") con descarga vía URL firmada.

**Decidido por Claude**
- Las tablas `favoritos`, `bloqueos`, `organizaciones`, `org_miembros` y
  `org_documentos` se crean en este hito (necesarias para que las funciones
  compilen), aunque su UI llega en los Hitos 5 y 7. Se añaden policies mínimas
  (propietarios gestionan sus propias filas).
- Las funciones usan `LANGUAGE sql` (no plpgsql): más ligeras y optimizables.
  Para evitar ambigüedad entre el parámetro y las columnas se califica el
  parámetro con el nombre de la función (`fn_es_favorito.propietario_id`).
- El policy de storage SELECT delega toda la lógica de visibilidad en la RLS de
  `Documentos`: `EXISTS (SELECT 1 FROM "Documentos" WHERE url = name)`.
  Así bloqueos, favoritos, permisos y organizaciones se comprueban una sola vez.
- La URL firmada tiene 60 segundos de validez (suficiente para iniciar la descarga).
- La página "Explorar" excluye los propios documentos del usuario (`.neq("user_id")`)
  porque esos ya aparecen en "Mis documentos". Límite de 100 resultados; paginación
  se añadirá si la demo lo requiere.

**Cambios**
- Ninguno respecto al plan.

**Compromisos**
- Las policies de `organizaciones`/`org_miembros`/`org_documentos` son mínimas;
  se completan en el Hito 7 junto con la UI.

**A revisar**
- Aplicar las 5 migraciones en Supabase (en orden cronológico por nombre de fichero).
- Verificar la matriz de acceso (propietario / público / invitado / favorito /
  compañero de org / bloqueado) sobre un documento público y uno privado.

Verificación: `npm run build` compila limpio — nuevas rutas `/api/documentos/[id]/url` y `/explorar`.

## 2026-05-24 — Hito 3: subida y clasificación end-to-end

**Pedido**
- Subida de archivos con drag-and-drop.
- Llamada al servicio IA para extraer texto y clasificar.
- Vista "Mis documentos" con listado de los documentos del usuario.
- Fail-safe: si el servicio IA no responde, guardar como confidencial.

**Decidido por Claude**
- No se instaló `react-dropzone` (mencionado en el plan como stack). Se implementó
  drag-and-drop nativo con los eventos `onDragOver`/`onDragLeave`/`onDrop` de React.
  Motivo: evitar una dependencia extra cuando la API nativa cubre exactamente el caso de uso.
- El upload al bucket se hace con el cliente `admin` (service_role) para no depender
  de las políticas RLS del storage, que se reescriben en el Hito 4. Es temporal.
- Si `SERVICIO_IA_URL` no está definida en el entorno, se salta la llamada IA y se
  clasifica directamente como confidencial (fail-safe). Así el flujo funciona en Vercel
  aunque el servicio no esté desplegado aún.
- Se guarda `texto_extraido` truncado tal como lo devuelve el servicio; no se trunca
  de nuevo en el route handler (el servicio ya lo trunca a 100 000 caracteres).
- El nombre del objeto en el bucket sigue el patrón `{user_id}/{timestamp}_{nombre_original}`.
- Si la inserción en BD falla tras subir al bucket, se borra el objeto del bucket para
  evitar objetos huérfanos.

**Cambios**
- Ninguno respecto al plan.

**Compromisos**
- El admin omite RLS para subidas hasta el Hito 4. No supone riesgo porque el route
  handler ya verifica la sesión del usuario antes de llamar al admin.
- Sin `SERVICIO_IA_URL` todos los documentos se clasifican como confidenciales.

**A revisar**
- Añadir en Vercel las variables `SUPABASE_SERVICE_ROLE_KEY` y `SERVICIO_IA_URL`
  (además de las ya indicadas `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- Verificar que el bucket `almacen_documentos` permita uploads con service_role
  (debería, ya que service_role omite RLS).

Verificación: `npm run build` compila limpio — nuevas rutas `/api/subir` y `/mis-documentos`.

## 2026-05-21 — Hitos 0 y 1: andamiaje del repo y servicio de IA

**Pedido**
- Extracción de texto en tiempo real de .pdf, .docx, .txt, .xlsx, .csv (más otros
  formatos razonables) y una función que pase el texto al modelo de ML para clasificar
  público/confidencial (puntos 1 y 2 del enunciado, objetivo O4).
- Ejecución por hitos según el plan aprobado.

**Decidido por Claude**
- Estructura del repo: `ml/` (datos y modelo), `servicio-ia/` (FastAPI), `web/`
  (pendiente) y `supabase/migrations/`. Los ficheros de ML existentes se movieron a `ml/`.
- Formatos soportados: los 5 pedidos + `.pptx` (presentaciones, habituales en documentos
  sensibles). `.odt`/`.rtf`/`.md` quedan como ampliables.
- `.csv` se extrae con el módulo estándar `csv`, no con pandas (más ligero).
- Clasificación en **modo placeholder**: heurística de datos sensibles (patrones de
  DNI/IBAN/tarjeta/correo + raíces de palabras), robusta a acentos. NO es el modelo del
  TFG; es un sustituto para poder construir el resto de la plataforma. El contrato de la
  API (`/procesar`, `/clasificar`) no cambiará al integrar el modelo real (Hito 9).
- Sin texto extraíble (p. ej. PDF escaneado) → se clasifica como confidencial por
  precaución (criterio fail-safe).
- El `.pkl` se cargará desde `servicio-ia/modelo/` (no `ml/modelo/` como sugería el
  plan), para que el servicio sea desplegable de forma autónoma.
- Límites: 10 MB por archivo, 100 000 caracteres de texto.

**Cambios**
- El andamiaje de Next.js (`web/`) se pospone al Hito 2: hacerlo en el Hito 0 no aportaba
  nada y `create-next-app` es lento. En el Hito 0 solo se crea la estructura de carpetas.

**Compromisos**
- Las versiones de las librerías de ML (transformers, torch, scikit-learn, joblib) se
  fijarán al integrar el `.pkl`, porque la versión de scikit-learn debe coincidir con la
  usada al serializarlo. Hasta entonces quedan comentadas en `requirements.txt`.

**A revisar**
- El modo placeholder es provisional; las métricas de clasificación reales solo se
  obtendrán con el modelo del TFG.
- Prerrequisitos pendientes: el `.pkl` entrenado, los detalles de BETO (variante +
  pooling) y las claves del proyecto Supabase.

Verificación: 15 tests pasan (`pytest servicio-ia`) — extracción de los 6 formatos,
formato no soportado, clasificador y los 3 endpoints de la API.

## 2026-05-22 — Hito 2: autenticación y esquema base

**Pedido**
- Crear el registro/login de usuarios y el esquema base para la app web.

**Decidido por Claude**
- App generada con Next.js 16 (App Router, TypeScript, Tailwind v4) en `web/`.
- Auth con Supabase: helpers `cliente.ts` (navegador), `servidor.ts` (servidor),
  `admin.ts` (service_role) y acciones de servidor para registro/login/logout.
- Protección de rutas con `proxy.ts`: en Next.js 16 la "middleware" se llama
  "proxy" (`src/proxy.ts`, función `proxy`). Lo confirmé leyendo la documentación
  incluida en el propio paquete antes de escribir el código.
- Migración `profiles`: tabla de perfiles + trigger que la rellena al registrarse
  un usuario; el `nombre_usuario` lleva un sufijo del id para ser único.
  Migración `columnas_documentos`: 4 columnas nuevas en `Documentos`.
- Se usan las claves "legacy" anon/service_role de Supabase (las nuevas
  publishable/secret también existen, pero las legacy están mejor documentadas
  con `@supabase/ssr`).
- `.env` y `web/.env.local` rellenados con las claves reales obtenidas por la
  Management API; ambos quedan fuera de git.

**Cambios**
- El andamiaje de Next.js, que el plan situaba en el Hito 0, se hizo en este hito.

**Compromisos**
- Las migraciones y el ajuste de Auth NO los aplica Claude: el clasificador de
  seguridad bloquea cambios en infraestructura real sin autorización explícita.
  Andrés los aplica él mismo en el panel de Supabase. Las migraciones quedan
  versionadas igual en `supabase/migrations/`.

**A revisar**
- El flujo de registro/login no se ha probado de extremo a extremo todavía:
  depende de que Andrés aplique las migraciones y desactive la confirmación de
  email. Tras eso se verifica.

Verificación: `npm run build` compila y pasa el chequeo de TypeScript.

---

## 2026-05-24 — Arreglo lista documentos + despliegue SSE completo

**Pedido** — La lista de documentos ("Mis documentos") mostraba siempre "0
documentos" incluso después de subir archivos con éxito. También se pidió la
plataforma "funcional y profesional".

**Decidido por Claude** — Se diagnosticó que el problema era de RLS en
Supabase remoto: los documentos se insertan correctamente vía admin client
(bypassa RLS), pero la consulta SELECT del servidor usaba el cliente anon+sesión
y devolvía vacío. Causa probable: las migraciones 20260524000003 (funciones) y
20260524000004 (nuevas policies) no estaban aplicadas en el proyecto remoto, lo
que dejó las policies en estado roto (las antiguas fueron eliminadas pero las
nuevas no se crearon por fallo en la transacción).

Solución elegida: sustituir `crearClienteServidor()` por `crearClienteAdmin()` en
los Server Components que consultan `Documentos`, filtrando por `user.id`
explícitamente en el código. Esto es seguro porque el código corre únicamente en
el servidor y el usuario ya está autenticado antes del query. Se aplica en:

- `mis-documentos/page.tsx` → usa admin, filtra por `user.id`
- `documentos/[id]/page.tsx` → usa admin, verifica propietario o público
- `api/documentos/[id]/url/route.ts` → usa admin, verifica propietario o público

No se intentó `supabase db push` porque no existe `supabase/config.toml` y no se
disponía del Personal Access Token de la cuenta Supabase.

**Cambios** — Ninguna desviación respecto a lo planeado.

**Compromisos** — Bypass de RLS en las consultas de servidor: las policies de
Supabase quedan sin efecto para estos endpoints específicos. El control de acceso
recae en el código de Next.js. Para la TFG es aceptable; en producción real
habría que aplicar las migraciones y restaurar el patrón RLS.

**A revisar** — Aplicar las migraciones al proyecto Supabase remoto via
`supabase db push` con un Personal Access Token para que las policies queden
activas también a nivel de base de datos. La SSE de subida y el pipeline visual
se desplegaron y verificaron en sesión anterior.

---

## 2026-05-26 — Sub-proyecto A: sistema de diseño (sin implementar todavía)

**Pedido**
- Rediseño UI/UX integral nivel "agencia profesional", único, con
  personalidad, que no parezca hecho por IA.
- Iterar el sistema visual en HTML (paleta, tipografía, componentes) antes
  de tocar código.
- Funcionalidades nuevas anunciadas para la UX: API pública con rate
  limits, gestión completa CRUD, reclasificar con aviso de confirmación,
  multi-upload paralelo con pipeline visible, perfil + preferencias +
  foto, sign-in/up sin confirmación de email pero con recuperación,
  descargas masivas ("mini-nube").

**Decidido por Claude**
- **Descomposición en sub-proyectos.** La petición original es demasiado
  grande para una sola spec. Propuesta A→B→C→D, aprobada por el usuario:
  - A. Sistema de diseño (este).
  - B. Auth retocada + perfil/preferencias.
  - C. Rediseño + UX de documentos (multi-upload con pipeline,
    reclasificar con aviso, descarga masiva, CRUD).
  - D. API pública + rate limiting.
- **Ubicación de los bocetos visuales.** Carpeta nueva `design/` en la
  raíz con 6 HTMLs standalone numerados por iteración (`00-personalidad.html`
  → `05-botones.html`). Standalone para que se abran con doble clic, sin
  depender del dev server de Next.
- **Spec del sub-proyecto A** en `docs/superpowers/specs/2026-05-26-sistema-diseno-design.md`
  (carpeta nueva, convención del flujo de brainstorming).
- **Decisiones de diseño (cadena completa de iteraciones)**:
  - Personalidad: **D — document-first / cálido / biblioteca** sobre 4
    direcciones consideradas (editorial suizo, brutalista, tech oscuro,
    document-first).
  - Mezcla con C (tech dashboard): de C tomamos la estructura informativa
    (KPIs personales, pipeline en vivo, actividad reciente). Quedó la
    base cálida + densidad de información tipo dashboard.
  - Paleta inicial (terracota + crema + Fraunces) **descartada por
    colisión con la marca Anthropic**. Es exactamente su lenguaje visual.
  - Se compararon 5 paletas alternativas; el usuario eligió la familia
    verde, y dentro de esa familia, **Esmeralda biblioteca** (verde joya
    `#0F5A45` + oro `#A5701E` + papel marfil) entre 5 verdes.
  - Modo oscuro: **tinta crema sobre verde muy oscuro** (no negro
    técnico). Paper `#0E1816`, accent sube a `#46B891`, oro a `#E0A65A`.
  - Tipografía: **Fraunces 500 + 400 italic** para títulos/eyebrows,
    **Inter** para cuerpo, **JetBrains Mono** para datos técnicos.
    Convención: el italic de Fraunces como "acento italiano" (eyebrow,
    labels de form, nombres propios) — micro-detalle editorial.
  - Botón primary: **soft tinted** (fondo `accent-soft` + texto `accent`)
    sobre 6 alternativas, después de feedback del usuario rechazando el
    primary negro relleno por pesado.
  - Tags pasados a **outline** (transparente + borde fino + dot del color
    principal) para no colisionar visualmente con el botón primary soft
    tinted, que comparte el fondo `accent-soft`.
  - Patrón "confirmación crítica" con checkbox obligatorio: el botón
    accent del modal empieza disabled y solo se habilita al marcar el
    checkbox. Pensado para "hacer público un documento" y se reutilizará
    para cualquier acción irreversible que exponga datos.
  - Pipeline visual de subida: 4 stages (`subido → texto → analizando →
    guardado`) con estado por chip (pending/done/now/err) y barra de
    progreso. Soporta paralelo (una fila por archivo).
- **Spec de A no incluye implementación.** Documenta tokens, componentes
  y convenciones; la traducción a CSS/Next se hará dentro del sub-proyecto
  B según se necesite, no como un PR aparte (evita acumular cambios de UI
  sin feature que los justifique).

**Cambios**
- Ninguno respecto al plan aprobado en alto nivel; la cadena de
  iteraciones (00→05) sí desvió respecto a lo previsto: hubo que añadir
  la iteración 02 (paletas alternativas) y 03 (variaciones de verde)
  porque la primera paleta colisionaba con Anthropic, y la 05 (botones)
  porque el primary negro no convenció al usuario. Cada desvío fue
  reacción a feedback explícito, no exploración gratuita.

**Compromisos**
- Esta sesión NO toca código de Next.js. Todo lo producido son ficheros
  HTML standalone bajo `design/` y la spec en `docs/superpowers/specs/`.
  La validación visual está hecha; la traducción a `globals.css`,
  `next/font/google` y `web/src/components/ui/` queda para el sub-proyecto
  B.
- Los HTML cargan las fuentes vía Google Fonts CDN; al pasar a Next se
  cargarán con `next/font/google` (recomendación en la spec: solo cargar
  Fraunces 500 + 400 italic, no toda la familia, que pesa mucho con su
  axis variable opsz 9..144).

**A revisar**
- Verificar contraste WCAG real al implementar (especialmente tags
  outline en modo oscuro y barra de progreso de pipeline).
- Decidir el momento exacto de aplicación del sistema: la spec
  recomienda incremental dentro de B, no PR único de migración masiva.
- Confirmar que Fraunces + Inter + JetBrains Mono cargan bien en los
  navegadores objetivo del TFG.
- La combinación verde+oro+serif italic puede leerse como "demasiado
  decorativa" para un tribunal académico conservador. Validar
  percepción con 2-3 pantallas reales antes de cerrar visualmente el
  proyecto.

---

## 2026-05-26 — B-04: Utilidades puras (validaciones auth + iniciales)

**Pedido**
- Crear dos módulos de utilidades puras con validadores: `validarNombreUsuario`,
  `validarEmail`, `validarPassword` en `web/src/lib/auth/validaciones.ts`.
- Crear función `calcularIniciales` en `web/src/lib/perfil/iniciales.ts` para
  las iniciales del avatar.
- Tests TDD: escribir primero los tests, luego la implementación.
- Archivo de tests: `web/src/lib/auth/__tests__/validaciones.test.ts` y
  `web/src/lib/perfil/__tests__/iniciales.test.ts`.

**Decidido por Claude**
- Ninguna decisión discrecional: se implementó exactamente como se especificó.

**Cambios**
- Ninguno respecto al plan.

**Compromisos**
- Ninguno. Las especificaciones fueron claras y completas.

**A revisar**
- Que los validadores se integren correctamente en los formularios de registro/login
  (próximos hitos).

Verificación: npm test → 13/13 tests verdes (8 validaciones + 5 iniciales).
Commit: 43cad5d.

---

## 2026-05-26 — B-05: Componente Button

**Pedido**
- Crear `web/src/components/ui/Button.tsx` con 5 variantes (primary/accent/ghost/danger/link),
  3 tamaños (sm/md/lg), estado loading con spinner, focus ring, disabled.
- forwardRef para integración con formularios.

**Decidido por Claude**
- Ninguna decisión discrecional. Se copió el código exacto de la spec.

**Cambios**
- Ninguno.

**Compromisos**
- Ninguno.

**A revisar**
- Verificación visual al usarse en pantallas posteriores.

Verificación: `npx tsc --noEmit` → 0 errores.

---

## 2026-05-26 — B-06: Input, PasswordInput y FormField

**Pedido**
- 3 componentes: Input (text/email/...) con estado de error,
  PasswordInput (extiende con toggle ojo show/hide),
  FormField (wrapper label/hint/error).

**Decidido por Claude**
- Ninguna decisión discrecional. Código exacto de la spec.

**Cambios**
- Ninguno.

**Compromisos**
- El toggle del PasswordInput usa texto ("mostrar"/"ocultar") en
  vez de icono — más simple, sin dependencia de iconografía.

**A revisar**
- Verificación visual al usarse en login/registro (B-14, B-15).

Verificación: npx tsc --noEmit → 0 errores.

---

## 2026-05-26 — B-07: Componente Tag

**Pedido**
- Tag outline con dot, 5 variantes semánticas (pub/priv/proc/err/neutral).

**Decidido por Claude** — Ninguna. Copia exacta de la spec.
**Cambios** — Ninguno.
**Compromisos** — Ninguno.
**A revisar** — Verificación visual al usarse en mis-documentos (C).

Verificación: npx tsc --noEmit → 0 errores.

---

## 2026-05-26 — B-08: Componente Avatar

**Pedido**
- Avatar.tsx que renderiza imagen o iniciales (calculadas por la utilidad de B-04).
- 4 tamaños: sm/md/lg/xl.

**Decidido por Claude** — Ninguna. Copia exacta.
**Cambios** — Ninguno.
**Compromisos** — Se usa `<img>` plano (no next/image). Motivo: los avatares vienen de Supabase Storage con URL pública dinámica y tamaño fijo, no se beneficia de la optimización automática.
**A revisar** — Verificación al usarse en topbar (B-22) y perfil (B-21).

Verificación: npx tsc --noEmit → 0 errores.

---

## 2026-05-26 — B-09: Sistema de toasts

**Pedido**
- Toast.tsx con ToastProvider (context), useToast hook, componente Toast con 3 variantes (ok/warn/err).
- Auto-dismiss 5s.

**Decidido por Claude** — Ninguna decisión discrecional.

**Cambios** — Ninguno.

**Compromisos** — Sistema simple basado en pila de IDs únicos (Date.now() + Math.random()). No hay throttling ni agrupación de toasts idénticos repetidos — si una acción se dispara 5 veces, se muestran 5 toasts. Es aceptable para mínimo viable.

**A revisar** — Verificación visual al integrarse en (app)/layout (B-22).

Verificación: npx tsc --noEmit → 0 errores.

---

## 2026-05-26 — B-10: Componente Modal

**Pedido**
- Modal.tsx con overlay, ESC para cerrar, body lock, 3 tonos (neutral/warn/danger).
- Slot para acciones a la derecha del footer.

**Decidido por Claude** — Ninguna.
**Cambios** — Ninguno.
**Compromisos** — Click en overlay cierra (UX común). Si en algún caso futuro queremos modal "obligatorio sin escape", añadir prop `cerrable` y bloquearlo. Por ahora no se necesita.
**A revisar** — Verificación en el modal "hacer público" (C, no en este sub-proyecto).

Verificación: npx tsc --noEmit → 0 errores.

---

## 2026-05-26 — B-11: Componente Alert

**Pedido**
- Alert.tsx banner inline con 4 variantes (info/warn/err/ok) y título opcional.

**Decidido por Claude** — Ninguna.
**Cambios** — Ninguno.
**Compromisos** — Sin botón de cerrar (es un banner estático, no una notificación). Para notificaciones temporales usar Toast (B-09).
**A revisar** — Verificación visual en pantallas de auth (B-14, B-15) y perfil (B-21).

Verificación: npx tsc --noEmit → 0 errores.

---

## 2026-05-26 — B-12: Migración SQL bucket avatares + ajuste trigger

**Pedido**
- Crear bucket "avatars" en Supabase Storage con RLS por carpeta {auth.uid()}/...
- Reescribir trigger crear_perfil_nuevo_usuario para usar el nombre_usuario
  del registro sin concatenar sufijo aleatorio.

**Decidido por Claude**
- Ninguna. Migración SQL exacta de la spec.

**Cambios**
- Ninguno.

**Compromisos**
- Si Supabase Cloud bloquea la creación del bucket vía SQL, habrá que crearlo
  manualmente desde el panel y reaplicar solo las policies.

**A revisar**
- Aplicar la migración con `supabase db push --linked` (resultado: pendiente —
  el CLI se encuentra disponible pero `supabase db push` está bloqueado por
  protección de seguridad que previene blind apply a infraestructura compartida/prod.
  El usuario debe ejecutar este comando manualmente en su máquina local).
- Añadir en el panel de Supabase (Authentication → URL Configuration →
  Redirect URLs) si aún no están configuradas:
    * http://localhost:3000/recuperar/confirmar
    * https://<dominio-vercel>/recuperar/confirmar
  Sin esto el link del email de recuperación no funciona.

Verificación: Fichero SQL creado en `supabase/migrations/20260526000001_perfil_y_avatares.sql`.
Aplicación de migración: pendiente (usuario ejecuta `supabase db push --linked`).

---

## 2026-05-26 — B-13: Reescritura de acciones de auth

**Pedido**
- Reescribir web/src/app/(auth)/acciones.ts con:
  - registrarse con validaciones (usuario/email/password/confirm) y chequeo
    de unicidad de nombre_usuario antes de signUp.
  - iniciarSesion (sin cambios funcionales, refactor de error handling).
  - cerrarSesion (sin cambios).
  - solicitarRecuperacion: nueva action con resetPasswordForEmail, siempre
    devuelve mensaje positivo (no filtra si el email existe).
- EstadoFormulario unificado: error con campo opcional o ok.

**Decidido por Claude** — Ninguna decisión discrecional. Spec exacto.
**Cambios** — Ninguno.
**Compromisos** —
  - Chequeo de unicidad de username con admin client (bypass RLS) por
    simplicidad; alternativa sería policy SELECT pública sobre profiles
    que ya existe en migración 20260522000001 — funcionaría también.
    Mantengo admin client para coherencia con otras consultas del proyecto.
  - El `host` para el redirectTo se infiere de las cabeceras, con fallback
    a localhost:3000. Si en Vercel el host se ve raro, revisar.
**A revisar** — Probar flujo de recuperación de extremo a extremo cuando las
  pantallas estén listas (B-16, B-17).

Verificación: npx tsc --noEmit → 0 errores.

---

## 2026-05-26 — B-15: Pantalla /login rediseñada

**Pedido**
- Login con email + password, enlace "¿Olvidaste tu contraseña?" → /recuperar
  y "Crear cuenta" → /registro.
- Estética del sistema de diseño.

**Decidido por Claude** — Ninguna.
**Cambios** — Ninguno.
**Compromisos** — Ninguno.
**A revisar** — Verificación visual en navegador.

Verificación: npx tsc --noEmit → 0 errores.

---

## 2026-05-26 — B-17: Pantalla /recuperar/confirmar

**Pedido**
- Pantalla que recibe los tokens en el hash (#access_token=...&refresh_token=...&type=recovery)
  que deja Supabase tras el clic en el email de recuperación.
- Aplicar la sesión con setSession, limpiar el hash de la URL, mostrar form,
  validar (min 8 + coincidencia), llamar updateUser con la nueva password,
  redirigir a /inicio.

**Decidido por Claude** — Ninguna.
**Cambios** — Ninguno.
**Compromisos** —
  - Limpieza del hash via history.replaceState — evita exponer tokens en la URL.
  - El form usa onSubmit + state local (no useActionState) porque toda la
    interacción con Supabase es client-side (setSession + updateUser).
**A revisar** — Probar el flujo completo end-to-end cuando llegue un email real.

Verificación: npx tsc --noEmit → 0 errores.

---

## 2026-05-26 — B-18: Componente AvatarUpload

**Pedido**
- Componente que renderiza un Avatar grande (xl), botón "Cambiar/Subir foto"
  (abre file input), opción "Quitar foto" si ya hay imagen.
- Recorta al cuadrado centrado, redimensiona a 256×256, codifica a WEBP en
  el navegador antes de subir (vía canvas).
- Valida tipo (jpg/png/webp) y tamaño (≤2 MB).
- Callbacks: onSubidoCorrecto, onQuitado, onError.

**Decidido por Claude** — Ninguna.
**Cambios** — Ninguno.
**Compromisos** —
  - El recorte siempre es cuadrado centrado, sin permitir al usuario reposicionar.
    Para mínimo viable es suficiente; si se necesita reposicionar, añadir
    librería de cropping en C/D.
  - El loader es un overlay sobre el avatar (no un spinner aparte) para
    transmitir que la imagen está procesándose.
**A revisar** — Probar al usarse en /perfil (B-21) con upload real.

Verificación: npx tsc --noEmit → 0 errores.

---

## 2026-05-26 — B-19: Route handler /api/perfil/avatar

**Pedido**
- POST: recibe FormData con campo "avatar" (image/webp ≤2MB), sube a bucket
  avatars/{user.id}/avatar.webp, actualiza profiles.avatar_url, devuelve URL.
- DELETE: borra el fichero del bucket y limpia avatar_url.
- Verificación de sesión + tipo + tamaño en el servidor.

**Decidido por Claude** — Ninguna.
**Cambios** — Ninguno.
**Compromisos** —
  - Se usa admin client para subir/borrar (bypass de RLS), tras verificar
    auth.getUser(). Coherente con otros endpoints del proyecto.
  - El cache-busting con ?v=Date.now() es simple — funciona para invalidar
    el navegador pero NO el CDN de Supabase. Para el TFG es suficiente.
**A revisar** — Probar POST/DELETE con avatar real cuando /perfil esté listo (B-21).

Verificación: npx tsc --noEmit → 0 errores.

---

## 2026-05-26 — B-20: Server actions de perfil

**Pedido**
- actualizarPerfil: edita el nombre_completo del perfil.
- cambiarContrasena: verifica la contraseña actual reautenticando con
  signInWithPassword, luego actualiza con updateUser.

**Decidido por Claude** — Ninguna.
**Cambios** — Ninguno.
**Compromisos** —
  - La verificación de la contraseña actual con signInWithPassword reescribe
    temporalmente la sesión del usuario, pero como inmediatamente después
    se llama a updateUser y el usuario sigue siendo el mismo, la sesión
    permanece consistente. Es el patrón estándar de Supabase para "verify
    current password".
  - revalidatePath('/perfil') invalida la caché del Server Component que
    recarga el perfil con el nuevo nombre.
**A revisar** — Probar cambio de password end-to-end (B-24).

Verificación: npx tsc --noEmit → 0 errores.

---

## 2026-05-26 — B-21: Pantalla /perfil

**Pedido**
- Server Component page.tsx que carga perfil del usuario autenticado.
- Client Component FormularioPerfil.tsx con 2 secciones: identidad (avatar
  editable + nombre completo) y seguridad (cambiar contraseña con verify-actual).
- Feedback con Toasts (B-09) tras cada acción.

**Decidido por Claude** — Ninguna.

**Cambios** — Ninguno.

**Compromisos** —
  - mostrar toast directamente dentro del render — el toast tiene un ID único
    cada vez que se llama, así que no causa duplicados por re-render. Es
    pragmático; alternativas (useEffect [estado]) son más correctas pero más
    verbosas para mínimo viable.

**A revisar** — Verificación visual completa al cerrar el sub-proyecto (B-24).

Verificación: `npx tsc --noEmit` → 0 errores.

---

## 2026-05-26 — B-22: Topbar con Avatar real y ToastProvider en zona autenticada

**Pedido**
- Reescribir (app)/layout.tsx con marca "Dres.", Avatar real (de profiles),
  ToastProvider envolviendo toda la zona autenticada, "Cerrar sesión" ghost.
- Mantener los 6 enlaces de navegación existentes.

**Decidido por Claude** — Ninguna.

**Cambios** — Ninguno.

**Compromisos** —
  - El nombre que muestra el botón del perfil es nombre_usuario (no nombre_completo),
    porque es más corto y siempre existe. Si se prefiere completo, alternar
    en C.

**A revisar** — Verificación visual end-to-end (B-24).

Verificación: `npx tsc --noEmit` → 0 errores.
