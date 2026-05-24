-- ============================================================
-- Migración 20260524000004 — Reescritura de RLS en Documentos
-- Sustituye las 3 policies del baseline por 2 más expresivas que
-- incluyen bloqueos, favoritos, permisos y organizaciones.
-- ============================================================

-- Índices para acelerar las policies
CREATE INDEX IF NOT EXISTS documentos_user_id_idx          ON "Documentos" (user_id);
CREATE INDEX IF NOT EXISTS documentos_confidencialidad_idx ON "Documentos" (confidencialidad);

-- Eliminar policies antiguas
DROP POLICY IF EXISTS "Lectura_Publica_Global"    ON "Documentos";
DROP POLICY IF EXISTS "Lectura_Invitados_Privados" ON "Documentos";
DROP POLICY IF EXISTS "Gestion_Propietario"        ON "Documentos";

-- Policy 1: el propietario gestiona todos sus documentos (CRUD completo)
CREATE POLICY "doc_gestion_propietario" ON "Documentos"
    FOR ALL TO authenticated
    USING     (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 2: terceros pueden leer un documento si:
--   - no han sido bloqueados por el propietario, Y
--   - se cumple al menos una de:
--       a) el documento es público (confidencialidad = 0)
--       b) tienen permiso explícito (Permisos)
--       c) el propietario los tiene como favorito
--       d) comparten organización con el documento
CREATE POLICY "doc_lectura_terceros" ON "Documentos"
    FOR SELECT TO authenticated
    USING (
        auth.uid() <> user_id
        AND NOT fn_esta_bloqueado(user_id)
        AND (
            confidencialidad = 0
            OR fn_tiene_permiso(id)
            OR fn_es_favorito(user_id)
            OR fn_comparte_organizacion(id)
        )
    );
