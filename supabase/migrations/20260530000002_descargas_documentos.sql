-- ============================================================
-- Migracion 20260530000002 - Eventos de descarga de documentos
-- ============================================================

CREATE TABLE IF NOT EXISTS "descargas_documentos" (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id uuid NOT NULL REFERENCES "Documentos"(id) ON DELETE CASCADE,
    user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    fecha        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "descargas_documentos" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS descargas_documentos_doc_idx ON "descargas_documentos" (documento_id);
CREATE INDEX IF NOT EXISTS descargas_documentos_fecha_idx ON "descargas_documentos" (fecha);

DROP POLICY IF EXISTS "descargas_documentos_insert_authenticated" ON "descargas_documentos";
CREATE POLICY "descargas_documentos_insert_authenticated" ON "descargas_documentos"
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "descargas_documentos_select_authenticated" ON "descargas_documentos";
CREATE POLICY "descargas_documentos_select_authenticated" ON "descargas_documentos"
    FOR SELECT TO authenticated
    USING (true);
