-- ============================================================
-- Migración 20260524000005 — Políticas RLS del bucket almacen_documentos
-- La visibilidad del objeto hereda la RLS de Documentos:
-- si el usuario puede ver la fila de Documentos, puede descargar el archivo.
-- ============================================================

-- Limpiar policies previas del bucket (las que creó Supabase por defecto)
DROP POLICY IF EXISTS "storage_subida"   ON storage.objects;
DROP POLICY IF EXISTS "storage_descarga" ON storage.objects;
DROP POLICY IF EXISTS "storage_borrado"  ON storage.objects;

-- INSERT: el usuario solo puede subir archivos a su propia carpeta ({user_id}/…)
CREATE POLICY "storage_subida" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'almacen_documentos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- SELECT: el usuario puede descargar si la RLS de Documentos le da acceso.
-- Al consultar "Documentos" en este contexto se aplica la RLS del usuario
-- (doc_gestion_propietario + doc_lectura_terceros), por lo que bloqueos,
-- favoritos, permisos y organizaciones se comprueban automáticamente.
CREATE POLICY "storage_descarga" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'almacen_documentos'
        AND EXISTS (
            SELECT 1 FROM "Documentos"
            WHERE "Documentos".url = storage.objects.name
        )
    );

-- DELETE: solo el propietario puede borrar su objeto del bucket
CREATE POLICY "storage_borrado" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'almacen_documentos'
        AND EXISTS (
            SELECT 1 FROM "Documentos"
            WHERE "Documentos".url     = storage.objects.name
              AND "Documentos".user_id = auth.uid()
        )
    );
