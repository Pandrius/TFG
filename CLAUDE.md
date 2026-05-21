# TFG — Plataforma de clasificación de documentos (públicos / privados)

## Bitácora de decisiones (OBLIGATORIO)

En **cualquier tarea de implementación** en este repositorio, mantén
actualizado el fichero `implementation-notes.md` de la raíz. No es opcional.

Al terminar cada tanda de trabajo, **añade una entrada al final** del fichero
(nunca reescribas las anteriores) con la fecha y estas secciones, separadas
con claridad:

- **Pedido** — lo que se pidió explícitamente en la instrucción / spec.
- **Decidido por Claude** — decisiones tomadas por tu cuenta porque no estaban
  en la instrucción: librerías, nombres, estructura de ficheros, valores por
  defecto, supuestos sobre requisitos ambiguos, etc. Sé explícito y honesto.
- **Cambios** — desviaciones respecto a lo planeado o pedido.
- **Compromisos** — tradeoffs realizados y su motivo.
- **A revisar** — cualquier cosa que una persona deba validar o confirmar.

El objetivo: que al leer `implementation-notes.md` se distinga sin ambigüedad
qué dirigió la persona y qué decidió la IA.

`prompts-log.md` se rellena solo mediante un hook — **no lo edites a mano**.

## Contexto

Plataforma para clasificar documentos como públicos o privados (Trabajo de
Fin de Grado). En el repo ya hay trabajo de datos: dataset de noticias,
embeddings BERT y scripts de preparación. La capa de datos usa Supabase
(credenciales en `.env`, que no se versiona).

## Convenciones

- Idioma de commits, comentarios y bitácora: español.
