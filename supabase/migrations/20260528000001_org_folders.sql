-- ============================================================
-- Migración 20260528000001 — Carpetas y Subidas en Organizaciones
-- ============================================================

-- 1. Añadir columna para vincular carpetas a organizaciones
ALTER TABLE "carpetas"
    ADD COLUMN IF NOT EXISTS "org_id" uuid REFERENCES "organizaciones"(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS carpetas_org_id_idx ON "carpetas" (org_id);

-- 2. Actualizar políticas de RLS para carpetas de organizaciones
DROP POLICY IF EXISTS "carpetas_miembros_org" ON "carpetas";
CREATE POLICY "carpetas_miembros_org" ON "carpetas" FOR ALL TO authenticated
    USING (
        org_id IS NULL AND user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM "org_miembros"
            WHERE org_miembros.org_id = carpetas.org_id
              AND org_miembros.user_id = auth.uid()
        )
    )
    WITH CHECK (
        org_id IS NULL AND user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM "org_miembros"
            WHERE org_miembros.org_id = carpetas.org_id
              AND org_miembros.user_id = auth.uid()
        )
    );

-- 3. Documentos: Permitir subidas directas a organizaciones
-- Ya existe org_documentos, pero para subidas nuevas facilitamos que un documento
-- pueda nacer vinculado a una org o carpeta de org.
