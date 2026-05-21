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
