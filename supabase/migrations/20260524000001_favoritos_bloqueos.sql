-- ============================================================
-- Migración 20260524000001 — Tablas favoritos y bloqueos
-- Necesarias para las funciones helper de RLS (Hito 4).
-- La UI y las policies propias de estas tablas se completan en el Hito 5.
-- ============================================================

-- ---------- favoritos ----------
-- propietario_id añade a favorito_id como favorito.
-- Efecto RLS: favorito_id puede ver todos los documentos privados de propietario_id.
CREATE TABLE IF NOT EXISTS "favoritos" (
    propietario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    favorito_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (propietario_id, favorito_id)
);
ALTER TABLE "favoritos" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS favoritos_propietario_idx ON "favoritos" (propietario_id);
CREATE INDEX IF NOT EXISTS favoritos_favorito_idx    ON "favoritos" (favorito_id);

-- Políticas mínimas: cada usuario gestiona sus propias filas.
-- Las funciones helper son SECURITY DEFINER y omiten estas policies.
DROP POLICY IF EXISTS "favoritos_propietario" ON "favoritos";
CREATE POLICY "favoritos_propietario" ON "favoritos" FOR ALL TO authenticated
    USING  (propietario_id = auth.uid())
    WITH CHECK (propietario_id = auth.uid());

-- ---------- bloqueos ----------
-- bloqueador_id bloquea a bloqueado_id.
-- Efecto RLS: bloqueado_id no puede ver ningún documento de bloqueador_id.
CREATE TABLE IF NOT EXISTS "bloqueos" (
    bloqueador_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bloqueado_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (bloqueador_id, bloqueado_id)
);
ALTER TABLE "bloqueos" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS bloqueos_bloqueador_idx ON "bloqueos" (bloqueador_id);
CREATE INDEX IF NOT EXISTS bloqueos_bloqueado_idx  ON "bloqueos" (bloqueado_id);

DROP POLICY IF EXISTS "bloqueos_bloqueador" ON "bloqueos";
CREATE POLICY "bloqueos_bloqueador" ON "bloqueos" FOR ALL TO authenticated
    USING  (bloqueador_id = auth.uid())
    WITH CHECK (bloqueador_id = auth.uid());
