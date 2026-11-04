-- ==============================================================================
-- CROW COMICS: SPRINT 4 - TABLA DE PERFILES (PROFILES)
-- ==============================================================================

-- 1. Crear Tabla de Perfiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    prefs JSONB DEFAULT '{"onboarding_completed": false, "favorite_publishers": [], "favorite_characters": [], "reading_style": null}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Activar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para Perfiles
DROP POLICY IF EXISTS "Los perfiles son públicos para lectura" ON public.profiles;
CREATE POLICY "Los perfiles son públicos para lectura"
ON public.profiles FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Los usuarios pueden insertar su propio perfil" ON public.profiles;
CREATE POLICY "Los usuarios pueden insertar su propio perfil"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON public.profiles;
CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar su propio perfil" ON public.profiles;
CREATE POLICY "Los usuarios pueden eliminar su propio perfil"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- 4. Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Trigger para crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, avatar_url, bio, prefs)
    VALUES (
        NEW.id,
        'user_' || substr(NEW.id::text, 1, 8),
        NULL,
        NULL,
        '{"onboarding_completed": false, "favorite_publishers": [], "favorite_characters": [], "reading_style": null}'::jsonb
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 6. BACKFILL: crea el perfil de los usuarios que YA existían antes de este
-- trigger (p. ej. cuentas creadas con Google). Idempotente: se puede re-ejecutar.
INSERT INTO public.profiles (id, username, avatar_url, bio, prefs)
SELECT
    u.id,
    'user_' || substr(u.id::text, 1, 8),
    NULL,
    NULL,
    '{"onboarding_completed": false, "favorite_publishers": [], "favorite_characters": [], "reading_style": null}'::jsonb
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);
