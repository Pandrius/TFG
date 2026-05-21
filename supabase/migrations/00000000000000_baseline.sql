-- ============================================================
-- Migración 00000000000000 — Baseline
-- Documenta el esquema creado manualmente en Supabase (objetivo O1)
-- para que el historial sea reproducible desde cero. Es una
-- reconstrucción a partir de la inspección del proyecto; los valores
-- por defecto exactos del esquema original creado a mano pueden variar.
-- Idempotente: seguro de re-ejecutar sobre el proyecto actual.
-- ============================================================

-- ---------- Tabla Documentos ----------
CREATE TABLE IF NOT EXISTS "Documentos" (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre           text,
    url              text,              -- nombre del objeto en el bucket
    user_id          uuid,              -- propietario (auth.users.id)
    fecha            timestamptz DEFAULT now(),
    fecha_ult_mod    timestamptz DEFAULT now(),
    confidencialidad smallint           -- 0 = público, 1 = confidencial
);
ALTER TABLE "Documentos" ENABLE ROW LEVEL SECURITY;

-- ---------- Tabla Permisos ----------
-- Permisos de acceso documento-a-documento (invitar a un usuario concreto).
CREATE TABLE IF NOT EXISTS "Permisos" (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id  uuid NOT NULL REFERENCES "Documentos"(id) ON DELETE CASCADE,
    inv_user_id   uuid,                 -- usuario invitado (auth.users.id)
    fecha_permiso timestamptz DEFAULT now()
);
ALTER TABLE "Permisos" ENABLE ROW LEVEL SECURITY;

-- ---------- Políticas RLS de Documentos ----------
DROP POLICY IF EXISTS "Lectura_Publica_Global" ON "Documentos";
CREATE POLICY "Lectura_Publica_Global" ON "Documentos"
    FOR SELECT TO authenticated
    USING (confidencialidad = 0);

DROP POLICY IF EXISTS "Lectura_Invitados_Privados" ON "Documentos";
CREATE POLICY "Lectura_Invitados_Privados" ON "Documentos"
    FOR SELECT TO authenticated
    USING (confidencialidad = 1 AND id IN (
        SELECT documento_id FROM "Permisos" WHERE inv_user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Gestion_Propietario" ON "Documentos";
CREATE POLICY "Gestion_Propietario" ON "Documentos"
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ---------- Políticas RLS de Permisos ----------
DROP POLICY IF EXISTS "Gestion_Permisos_Dueno" ON "Permisos";
CREATE POLICY "Gestion_Permisos_Dueno" ON "Permisos"
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "Documentos"
        WHERE "Documentos".id = "Permisos".documento_id
          AND "Documentos".user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Lectura_Propia_Invitados" ON "Permisos";
CREATE POLICY "Lectura_Propia_Invitados" ON "Permisos"
    FOR SELECT TO authenticated
    USING (inv_user_id = auth.uid());

-- ---------- Almacenamiento ----------
-- Bucket privado de documentos.
INSERT INTO storage.buckets (id, name, public)
VALUES ('almacen_documentos', 'almacen_documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Nota: las políticas RLS del bucket (sobre storage.objects) ya existen en el
-- proyecto. Se REESCRIBEN en el Hito 4 (migración *_rls_storage.sql) para
-- reflejar el modelo de acceso completo (favoritos, bloqueos, organizaciones).
