-- ============================================================
-- Migracion 20260530000005 - Remitente de documentos compartidos
-- ============================================================

ALTER TABLE "Permisos"
    ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS permisos_sender_id_idx ON "Permisos" (sender_id);

