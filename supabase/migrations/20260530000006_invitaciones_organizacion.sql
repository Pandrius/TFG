-- ============================================================
-- Migracion 20260530000006 - Invitaciones de organizacion
-- ============================================================

CREATE TABLE IF NOT EXISTS "org_invitaciones" (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      uuid NOT NULL REFERENCES "organizaciones"(id) ON DELETE CASCADE,
    invitado_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invitador_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    estado      text NOT NULL DEFAULT 'pendiente',
    fecha       timestamptz DEFAULT now(),
    fecha_respuesta timestamptz,
    CONSTRAINT org_invitaciones_estado_check
        CHECK (estado IN ('pendiente', 'aceptada', 'rechazada'))
);

ALTER TABLE "org_invitaciones" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS org_invitaciones_invitado_idx ON "org_invitaciones" (invitado_id);
CREATE INDEX IF NOT EXISTS org_invitaciones_org_idx ON "org_invitaciones" (org_id);
CREATE UNIQUE INDEX IF NOT EXISTS org_invitaciones_pendiente_unica_idx
    ON "org_invitaciones" (org_id, invitado_id)
    WHERE estado = 'pendiente';

DROP POLICY IF EXISTS "org_invitaciones_lectura_invitado" ON "org_invitaciones";
CREATE POLICY "org_invitaciones_lectura_invitado" ON "org_invitaciones"
    FOR SELECT TO authenticated
    USING (invitado_id = auth.uid());
