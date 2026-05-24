-- ============================================================
-- Migración 20260524000006 — Carpetas (planas, sin anidamiento)
-- ============================================================

CREATE TABLE IF NOT EXISTS "carpetas" (
    id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre  text NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE "carpetas" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS carpetas_user_id_idx ON "carpetas" (user_id);

DROP POLICY IF EXISTS "carpetas_propietario" ON "carpetas";
CREATE POLICY "carpetas_propietario" ON "carpetas" FOR ALL TO authenticated
    USING     (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Columna en Documentos para asignar una carpeta (nullable: sin carpeta = null)
ALTER TABLE "Documentos"
    ADD COLUMN IF NOT EXISTS carpeta_id uuid REFERENCES "carpetas"(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS documentos_carpeta_id_idx ON "Documentos" (carpeta_id);
