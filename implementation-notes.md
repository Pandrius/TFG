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
