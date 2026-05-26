-- ============================================================
-- Migración 20260526000001 — Bucket de avatares + ajuste del
-- trigger de creación de perfiles para usar el nombre_usuario
-- elegido por el usuario en el registro.
-- ============================================================

-- 1. Bucket "avatars" en Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies del bucket
-- Lectura: cualquiera (los avatares se sirven directamente en <img>).
DROP POLICY IF EXISTS "avatares_lectura_publica" ON storage.objects;
CREATE POLICY "avatares_lectura_publica" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'avatars');

-- Subida: solo el dueño dentro de su carpeta {auth.uid()}/...
DROP POLICY IF EXISTS "avatares_subida_propia" ON storage.objects;
CREATE POLICY "avatares_subida_propia" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Actualización: solo el dueño.
DROP POLICY IF EXISTS "avatares_update_propia" ON storage.objects;
CREATE POLICY "avatares_update_propia" ON storage.objects
    FOR UPDATE TO authenticated USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Borrado: solo el dueño.
DROP POLICY IF EXISTS "avatares_borrado_propio" ON storage.objects;
CREATE POLICY "avatares_borrado_propio" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 3. Reescritura del trigger: usar el nombre_usuario del registro
-- sin sufijo aleatorio. El form ya garantiza unicidad chequeando antes
-- de llamar a signUp; el UNIQUE NOT NULL de la columna respalda.
CREATE OR REPLACE FUNCTION crear_perfil_nuevo_usuario()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, nombre_usuario, nombre_completo)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'nombre_usuario',
            -- Fallback: solo para usuarios creados desde el panel admin
            -- de Supabase (sin metadata). Sufijo aleatorio para no chocar.
            split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 8)
        ),
        NEW.raw_user_meta_data->>'nombre_completo'
    );
    RETURN NEW;
END;
$$;
-- Trigger ya existe de la migración 20260522000001; no recrear.
