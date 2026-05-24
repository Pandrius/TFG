-- ============================================================
-- Migración 20260524000002 — Tablas de organizaciones
-- Necesarias para fn_comparte_organizacion y fn_es_miembro_org (Hito 4).
-- La UI y las policies completas se finalizan en el Hito 7.
-- ============================================================

CREATE TABLE IF NOT EXISTS "organizaciones" (
    id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre text NOT NULL
);
ALTER TABLE "organizaciones" ENABLE ROW LEVEL SECURITY;

-- ---------- org_miembros ----------
-- rol: 'admin' o 'miembro'
CREATE TABLE IF NOT EXISTS "org_miembros" (
    org_id  uuid NOT NULL REFERENCES "organizaciones"(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
    rol     text NOT NULL DEFAULT 'miembro',
    PRIMARY KEY (org_id, user_id)
);
ALTER TABLE "org_miembros" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS org_miembros_user_idx ON "org_miembros" (user_id);
CREATE INDEX IF NOT EXISTS org_miembros_org_idx  ON "org_miembros" (org_id);

-- ---------- org_documentos ----------
CREATE TABLE IF NOT EXISTS "org_documentos" (
    org_id       uuid NOT NULL REFERENCES "organizaciones"(id) ON DELETE CASCADE,
    documento_id uuid NOT NULL REFERENCES "Documentos"(id)    ON DELETE CASCADE,
    PRIMARY KEY (org_id, documento_id)
);
ALTER TABLE "org_documentos" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS org_documentos_org_idx ON "org_documentos" (org_id);
CREATE INDEX IF NOT EXISTS org_documentos_doc_idx ON "org_documentos" (documento_id);

-- Políticas mínimas para organizaciones: los miembros pueden ver la org.
-- Los admins gestionan miembros y documentos. Se amplían en el Hito 7.
DROP POLICY IF EXISTS "org_lectura_miembros" ON "organizaciones";
CREATE POLICY "org_lectura_miembros" ON "organizaciones" FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "org_miembros"
        WHERE org_miembros.org_id  = organizaciones.id
          AND org_miembros.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "org_miembros_lectura" ON "org_miembros";
CREATE POLICY "org_miembros_lectura" ON "org_miembros" FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM "org_miembros" om2
        WHERE om2.org_id = org_miembros.org_id
          AND om2.user_id = auth.uid()
          AND om2.rol = 'admin'
    ));

DROP POLICY IF EXISTS "org_documentos_lectura" ON "org_documentos";
CREATE POLICY "org_documentos_lectura" ON "org_documentos" FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "org_miembros"
        WHERE org_miembros.org_id  = org_documentos.org_id
          AND org_miembros.user_id = auth.uid()
    ));
