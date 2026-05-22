-- ============================================================
-- Migración 20260522000002 — Columnas nuevas en Documentos
-- Añade los campos que necesita el procesamiento de IA. Las columnas
-- carpeta_id y busqueda_tsv se añaden en hitos posteriores (6 y 8).
-- ============================================================

ALTER TABLE "Documentos"
    ADD COLUMN IF NOT EXISTS texto_extraido text,
    ADD COLUMN IF NOT EXISTS tipo_archivo   text,
    ADD COLUMN IF NOT EXISTS tamano_bytes   bigint,
    ADD COLUMN IF NOT EXISTS probabilidad   real;

COMMENT ON COLUMN "Documentos".texto_extraido IS 'Texto extraído del documento (para búsqueda).';
COMMENT ON COLUMN "Documentos".tipo_archivo   IS 'Formato del archivo: pdf, docx, txt, csv, xlsx, pptx.';
COMMENT ON COLUMN "Documentos".tamano_bytes   IS 'Tamaño del archivo en bytes.';
COMMENT ON COLUMN "Documentos".probabilidad   IS 'Probabilidad de la clase confidencial dada por el modelo.';
