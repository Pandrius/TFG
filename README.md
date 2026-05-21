# TFG — Plataforma de gestión documental con clasificación automática

Plataforma que protege automáticamente archivos sensibles: el usuario sube un
documento, el servidor extrae el texto, un modelo de Machine Learning lo clasifica
como **público** o **confidencial**, y Supabase restringe el acceso en consecuencia.

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| `ml/` | Datasets, embeddings y scripts del modelo de clasificación. |
| `servicio-ia/` | Servicio FastAPI: extracción de texto multiformato + clasificación. |
| `web/` | Aplicación web (Next.js). *(pendiente)* |
| `supabase/migrations/` | Migraciones SQL del esquema y las políticas RLS. |

## Documentos del proyecto

- `implementation-notes.md` — bitácora de decisiones de implementación.
- `CLAUDE.md` — convenciones del proyecto.
- `.env.example` — variables de entorno necesarias.

## Puesta en marcha

Cada componente tiene su propio README con instrucciones detalladas. Empezar por
copiar `.env.example` a `.env` y rellenar los valores.
