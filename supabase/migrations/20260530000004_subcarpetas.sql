-- ============================================================
-- Migracion 20260530000004 - Subcarpetas
-- ============================================================

ALTER TABLE "carpetas"
    ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES "carpetas"(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS carpetas_parent_id_idx ON "carpetas" (parent_id);

