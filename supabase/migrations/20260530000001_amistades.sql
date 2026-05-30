-- ============================================================
-- Migracion 20260530000001 - Solicitudes de amistad
-- ============================================================

CREATE TABLE IF NOT EXISTS "amistades" (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitante_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receptor_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    estado         text NOT NULL DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente', 'aceptada', 'rechazada')),
    fecha          timestamptz DEFAULT now(),
    fecha_respuesta timestamptz,
    CHECK (solicitante_id <> receptor_id)
);

ALTER TABLE "amistades" ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS amistades_par_unico_idx
    ON "amistades" (LEAST(solicitante_id, receptor_id), GREATEST(solicitante_id, receptor_id));

CREATE INDEX IF NOT EXISTS amistades_solicitante_idx ON "amistades" (solicitante_id);
CREATE INDEX IF NOT EXISTS amistades_receptor_idx ON "amistades" (receptor_id);
CREATE INDEX IF NOT EXISTS amistades_estado_idx ON "amistades" (estado);

DROP POLICY IF EXISTS "amistades_participantes_lectura" ON "amistades";
CREATE POLICY "amistades_participantes_lectura" ON "amistades"
    FOR SELECT TO authenticated
    USING (solicitante_id = auth.uid() OR receptor_id = auth.uid());

DROP POLICY IF EXISTS "amistades_solicitante_crea" ON "amistades";
CREATE POLICY "amistades_solicitante_crea" ON "amistades"
    FOR INSERT TO authenticated
    WITH CHECK (solicitante_id = auth.uid() AND estado = 'pendiente');

DROP POLICY IF EXISTS "amistades_participantes_actualizan" ON "amistades";
CREATE POLICY "amistades_participantes_actualizan" ON "amistades"
    FOR UPDATE TO authenticated
    USING (solicitante_id = auth.uid() OR receptor_id = auth.uid())
    WITH CHECK (solicitante_id = auth.uid() OR receptor_id = auth.uid());

DROP POLICY IF EXISTS "amistades_participantes_borran" ON "amistades";
CREATE POLICY "amistades_participantes_borran" ON "amistades"
    FOR DELETE TO authenticated
    USING (solicitante_id = auth.uid() OR receptor_id = auth.uid());
