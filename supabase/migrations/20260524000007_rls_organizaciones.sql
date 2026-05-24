-- ============================================================
-- Migración 20260524000007 — RLS completa para organizaciones
-- Amplía las policies mínimas del Hito 4.
-- ============================================================

-- organizaciones: cualquier usuario autenticado puede crear su org
DROP POLICY IF EXISTS "org_crear" ON "organizaciones";
CREATE POLICY "org_crear" ON "organizaciones" FOR INSERT TO authenticated
    WITH CHECK (true);

-- El admin puede actualizar/eliminar la org
DROP POLICY IF EXISTS "org_admin_gestiona" ON "organizaciones";
CREATE POLICY "org_admin_gestiona" ON "organizaciones"
    FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "org_miembros"
        WHERE org_miembros.org_id  = organizaciones.id
          AND org_miembros.user_id = auth.uid()
          AND org_miembros.rol     = 'admin'
    ));

DROP POLICY IF EXISTS "org_admin_elimina" ON "organizaciones";
CREATE POLICY "org_admin_elimina" ON "organizaciones"
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "org_miembros"
        WHERE org_miembros.org_id  = organizaciones.id
          AND org_miembros.user_id = auth.uid()
          AND org_miembros.rol     = 'admin'
    ));

-- org_miembros: el admin puede insertar/eliminar miembros; uno mismo puede salir
DROP POLICY IF EXISTS "org_miembros_admin_gestiona" ON "org_miembros";
CREATE POLICY "org_miembros_admin_gestiona" ON "org_miembros"
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM "org_miembros" om2
        WHERE om2.org_id  = org_miembros.org_id
          AND om2.user_id = auth.uid()
          AND om2.rol     = 'admin'
    ) OR (
        -- Primer miembro (creador de la org): la org existe pero no tiene miembros todavía
        NOT EXISTS (SELECT 1 FROM "org_miembros" om3 WHERE om3.org_id = org_miembros.org_id)
        AND org_miembros.user_id = auth.uid()
        AND org_miembros.rol = 'admin'
    ));

DROP POLICY IF EXISTS "org_miembros_salir" ON "org_miembros";
CREATE POLICY "org_miembros_salir" ON "org_miembros"
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM "org_miembros" om2
            WHERE om2.org_id  = org_miembros.org_id
              AND om2.user_id = auth.uid()
              AND om2.rol     = 'admin'
        )
    );

-- org_documentos: el admin puede vincular/desvincular documentos
DROP POLICY IF EXISTS "org_documentos_admin" ON "org_documentos";
CREATE POLICY "org_documentos_admin" ON "org_documentos"
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM "org_miembros"
        WHERE org_miembros.org_id  = org_documentos.org_id
          AND org_miembros.user_id = auth.uid()
          AND org_miembros.rol     = 'admin'
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "org_miembros"
        WHERE org_miembros.org_id  = org_documentos.org_id
          AND org_miembros.user_id = auth.uid()
          AND org_miembros.rol     = 'admin'
    ));
