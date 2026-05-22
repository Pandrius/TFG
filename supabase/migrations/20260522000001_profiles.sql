-- ============================================================
-- Migración 20260522000001 — Perfiles de usuario
-- Tabla pública de perfiles (necesaria para el buscador de usuarios,
-- objetivo O5) y trigger que la rellena al registrarse un usuario.
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
    id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_usuario  text UNIQUE NOT NULL,
    nombre_completo text,
    avatar_url      text,
    creado_en       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer perfiles (buscador de usuarios).
DROP POLICY IF EXISTS "perfiles_lectura" ON profiles;
CREATE POLICY "perfiles_lectura" ON profiles
    FOR SELECT TO authenticated USING (true);

-- Cada usuario solo puede modificar su propio perfil.
DROP POLICY IF EXISTS "perfiles_update_propio" ON profiles;
CREATE POLICY "perfiles_update_propio" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Trigger: crea el perfil automáticamente al registrarse un usuario nuevo.
CREATE OR REPLACE FUNCTION crear_perfil_nuevo_usuario()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, nombre_usuario, nombre_completo)
    VALUES (
        NEW.id,
        -- nombre de usuario único: lo indicado al registrarse (o la parte
        -- local del email) más un sufijo del id para garantizar unicidad.
        COALESCE(
            NEW.raw_user_meta_data->>'nombre_usuario',
            split_part(NEW.email, '@', 1),
            'usuario'
        ) || '_' || substr(NEW.id::text, 1, 8),
        NEW.raw_user_meta_data->>'nombre_completo'
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION crear_perfil_nuevo_usuario();
