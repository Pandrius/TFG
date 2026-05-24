-- ============================================================
-- Migración 20260524000008 — Búsqueda de texto completo
-- Columna tsvector + índice GIN + trigger de mantenimiento automático
-- + función RPC buscar_documentos respetando la RLS del usuario.
-- ============================================================

-- Columna tsvector
ALTER TABLE "Documentos"
    ADD COLUMN IF NOT EXISTS busqueda_tsv tsvector;

-- Índice GIN para búsquedas rápidas
CREATE INDEX IF NOT EXISTS documentos_busqueda_gin ON "Documentos" USING GIN (busqueda_tsv);

-- Función que rellena el tsvector a partir de nombre + texto_extraido
CREATE OR REPLACE FUNCTION fn_actualizar_busqueda_tsv()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.busqueda_tsv :=
        setweight(to_tsvector('spanish', coalesce(NEW.nombre, '')), 'A') ||
        setweight(to_tsvector('spanish', coalesce(left(NEW.texto_extraido, 50000), '')), 'B');
    RETURN NEW;
END;
$$;

-- Trigger que mantiene el tsvector actualizado en INSERT y UPDATE
DROP TRIGGER IF EXISTS tg_busqueda_tsv ON "Documentos";
CREATE TRIGGER tg_busqueda_tsv
    BEFORE INSERT OR UPDATE OF nombre, texto_extraido
    ON "Documentos"
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_busqueda_tsv();

-- Rellenar filas existentes
UPDATE "Documentos"
SET busqueda_tsv =
    setweight(to_tsvector('spanish', coalesce(nombre, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(left(texto_extraido, 50000), '')), 'B');

-- RPC: buscar_documentos(termino text)
-- Devuelve los documentos visibles para el usuario que contienen el término.
-- La visibilidad la garantiza la RLS de Documentos (se ejecuta con los permisos
-- del usuario llamante porque la función NO es SECURITY DEFINER).
CREATE OR REPLACE FUNCTION buscar_documentos(termino text)
RETURNS TABLE (
    id               uuid,
    nombre           text,
    tipo_archivo     text,
    confidencialidad smallint,
    tamano_bytes     bigint,
    fecha            timestamptz,
    user_id          uuid,
    rank             real
)
LANGUAGE sql STABLE
AS $$
    SELECT
        d.id,
        d.nombre,
        d.tipo_archivo,
        d.confidencialidad,
        d.tamano_bytes,
        d.fecha,
        d.user_id,
        ts_rank(d.busqueda_tsv, query) AS rank
    FROM "Documentos" d,
         to_tsquery('spanish', termino || ':*') AS query
    WHERE d.busqueda_tsv @@ query
    ORDER BY rank DESC, d.fecha DESC
    LIMIT 50;
$$;
