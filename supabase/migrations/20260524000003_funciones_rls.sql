-- ============================================================
-- Migración 20260524000003 — Funciones helper para RLS
-- Todas son SECURITY DEFINER con search_path fijado para evitar
-- escalada de privilegios y recursión en las policies.
-- ============================================================

-- ¿El propietario del documento ha bloqueado al usuario actual?
CREATE OR REPLACE FUNCTION fn_esta_bloqueado(propietario_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM "bloqueos"
        WHERE bloqueador_id = fn_esta_bloqueado.propietario_id
          AND bloqueado_id  = auth.uid()
    );
$$;

-- ¿El usuario actual es favorito del propietario del documento?
-- (el propietario añadió al usuario como favorito → puede ver sus privados)
CREATE OR REPLACE FUNCTION fn_es_favorito(propietario_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM "favoritos"
        WHERE "favoritos".propietario_id = fn_es_favorito.propietario_id
          AND "favoritos".favorito_id    = auth.uid()
    );
$$;

-- ¿El usuario actual tiene permiso explícito (invitación) sobre este documento?
CREATE OR REPLACE FUNCTION fn_tiene_permiso(documento_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM "Permisos"
        WHERE "Permisos".documento_id = fn_tiene_permiso.documento_id
          AND "Permisos".inv_user_id  = auth.uid()
    );
$$;

-- ¿El usuario actual pertenece a esta organización?
CREATE OR REPLACE FUNCTION fn_es_miembro_org(org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM "org_miembros"
        WHERE "org_miembros".org_id  = fn_es_miembro_org.org_id
          AND "org_miembros".user_id = auth.uid()
    );
$$;

-- ¿El usuario actual comparte organización con el documento?
-- (el documento está vinculado a una org de la que el usuario es miembro)
CREATE OR REPLACE FUNCTION fn_comparte_organizacion(doc_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM "org_documentos" od
        JOIN "org_miembros"   om ON om.org_id = od.org_id
        WHERE od.documento_id = fn_comparte_organizacion.doc_id
          AND om.user_id      = auth.uid()
    );
$$;
