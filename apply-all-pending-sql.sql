-- ==============================================================================
-- CROW COMICS: SCRIPT MAESTRO PARA APLICAR TODOS LOS SQL PENDIENTES
-- ==============================================================================
-- Este script ejecuta todos los cambios pendientes en el orden correcto.
-- Es idempotente: se puede ejecutar múltiples veces sin errores.
-- Ejecutar en el SQL Editor de Supabase.
-- ==============================================================================

-- ============================================
-- 1. TABLA PROFILES (Sprint 4)
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '--- Iniciando: add-profiles-schema.sql ---';
END
$$;

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

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 6. BACKFILL: crea el perfil de los usuarios que YA existían antes de este trigger
INSERT INTO public.profiles (id, username, avatar_url, bio, prefs)
SELECT
    u.id,
    'user_' || substr(u.id::text, 1, 8),
    NULL,
    NULL,
    '{"onboarding_completed": false, "favorite_publishers": [], "favorite_characters": [], "reading_style": null}'::jsonb
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

DO $$
BEGIN
    RAISE NOTICE '--- Completado: add-profiles-schema.sql ---';
END
$$;

-- ============================================
-- 2. TABLA FAVORITES (Sprint 4)
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '--- Iniciando: add-favorites-schema.sql ---';
END
$$;

-- 1. Crear Tabla de Favoritos
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    comic_id UUID REFERENCES public.comics(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, comic_id)
);

-- 2. Activar RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para Favoritos
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios favoritos" ON public.favorites;
CREATE POLICY "Los usuarios pueden ver sus propios favoritos"
ON public.favorites FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios favoritos" ON public.favorites;
CREATE POLICY "Los usuarios pueden insertar sus propios favoritos"
ON public.favorites FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios favoritos" ON public.favorites;
CREATE POLICY "Los usuarios pueden eliminar sus propios favoritos"
ON public.favorites FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DO $$
BEGIN
    RAISE NOTICE '--- Completado: add-favorites-schema.sql ---';
END
$$;

-- ============================================
-- 3. ACTUALIZAR COMENTARIOS (Sprint 4)
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '--- Iniciando: update-comments-auth.sql ---';
END
$$;

-- Agregar columna user_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'comments' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.comments ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Columna user_id agregada a comments';
    ELSE
        RAISE NOTICE 'Columna user_id ya existe en comments';
    END IF;
END
$$;

-- Actualizar políticas para requerir autenticación
DROP POLICY IF EXISTS "Solo usuarios autenticados pueden insertar comentarios" ON public.comments;
DROP POLICY IF EXISTS "Solo usuarios autenticados pueden actualizar comentarios" ON public.comments;
DROP POLICY IF EXISTS "Solo usuarios autenticados pueden eliminar comentarios" ON public.comments;
DROP POLICY IF EXISTS "Solo autenticados pueden comentar" ON public.comments;
DROP POLICY IF EXISTS "Solo autenticados pueden eliminar sus comentarios" ON public.comments;

CREATE POLICY "Solo autenticados pueden comentar"
ON public.comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Solo autenticados pueden eliminar sus comentarios"
ON public.comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DO $$
BEGIN
    RAISE NOTICE '--- Completado: update-comments-auth.sql ---';
END
$$;

-- ============================================
-- 4. PERSONAJES (Agregar name_spanish)
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '--- Iniciando: add-characters-schema.sql (name_spanish) ---';
END
$$;

-- Agregar columna name_spanish si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'characters' AND column_name = 'name_spanish'
    ) THEN
        ALTER TABLE public.characters ADD COLUMN name_spanish TEXT;
        RAISE NOTICE 'Columna name_spanish agregada a characters';
    ELSE
        RAISE NOTICE 'Columna name_spanish ya existe en characters';
    END IF;
END
$$;

DO $$
BEGIN
    RAISE NOTICE '--- Completado: add-characters-schema.sql (name_spanish) ---';
END
$$;

-- ============================================
-- 5. HARDENING RLS (SEGURIDAD SOLO ADMINS)
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '--- Iniciando: hardening-admin-rls.sql ---';
    RAISE NOTICE '⚠️  ATENCIÓN: Este script limitará la escritura solo al admin (owlmclyrics@gmail.com)';
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FUNCIÓN:¿este usuario es del equipo Crow?
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.is_crow_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users
    where id = auth.uid()
      and lower(email) in (
        'owlmclyrics@gmail.com'
      )
  );
$$;

-- Solo los usuarios con sesión pueden evaluar la función.
revoke all on function public.is_crow_admin() from public, anon;
grant execute on function public.is_crow_admin() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CÓMICS: escritura solo admin
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Solo administradores autenticados pueden insertar comics" on public.comics;
drop policy if exists "Solo administradores autenticados pueden actualizar comics" on public.comics;
drop policy if exists "Solo administradores autenticados pueden eliminar comics" on public.comics;
drop policy if exists "Solo el equipo Crow inserta cómics" on public.comics;
drop policy if exists "Solo el equipo Crow actualiza cómics" on public.comics;
drop policy if exists "Solo el equipo Crow elimina cómics" on public.comics;

create policy "Solo el equipo Crow inserta cómics"
  on public.comics for insert
  to authenticated
  with check (public.is_crow_admin());

create policy "Solo el equipo Crow actualiza cómics"
  on public.comics for update
  to authenticated
  using (public.is_crow_admin())
  with check (public.is_crow_admin());

create policy "Solo el equipo Crow elimina cómics"
  on public.comics for delete
  to authenticated
  using (public.is_crow_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CAPÍTULOS: escritura solo admin
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Solo administradores autenticados pueden insertar capítulos" on public.chapters;
drop policy if exists "Solo administradores autenticados pueden actualizar capítulos" on public.chapters;
drop policy if exists "Solo administradores autenticados pueden eliminar capítulos" on public.chapters;
drop policy if exists "Solo el equipo Crow inserta capítulos" on public.chapters;
drop policy if exists "Solo el equipo Crow actualiza capítulos" on public.chapters;
drop policy if exists "Solo el equipo Crow elimina capítulos" on public.chapters;

create policy "Solo el equipo Crow inserta capítulos"
  on public.chapters for insert
  to authenticated
  with check (public.is_crow_admin());

create policy "Solo el equipo Crow actualiza capítulos"
  on public.chapters for update
  to authenticated
  using (public.is_crow_admin())
  with check (public.is_crow_admin());

create policy "Solo el equipo Crow elimina capítulos"
  on public.chapters for delete
  to authenticated
  using (public.is_crow_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PERSONAJES: escritura solo admin
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Solo administradores pueden insertar personajes" on public.characters;
drop policy if exists "Solo administradores pueden actualizar personajes" on public.characters;
drop policy if exists "Solo administradores pueden eliminar personajes" on public.characters;
drop policy if exists "Solo el equipo Crow inserta personajes" on public.characters;
drop policy if exists "Solo el equipo Crow actualiza personajes" on public.characters;
drop policy if exists "Solo el equipo Crow elimina personajes" on public.characters;

create policy "Solo el equipo Crow inserta personajes"
  on public.characters for insert
  to authenticated
  with check (public.is_crow_admin());

create policy "Solo el equipo Crow actualiza personajes"
  on public.characters for update
  to authenticated
  using (public.is_crow_admin())
  with check (public.is_crow_admin());

create policy "Solo el equipo Crow elimina personajes"
  on public.characters for delete
  to authenticated
  using (public.is_crow_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RELACIONES CÓMIC-PERSONAJE: escritura solo admin (SOLO si la tabla existe)
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.comic_characters') is not null then
    drop policy if exists "Solo administradores pueden insertar relaciones cómic-personaje" on public.comic_characters;
    drop policy if exists "Solo administradores pueden eliminar relaciones cómic-personaje" on public.comic_characters;
    drop policy if exists "Solo el equipo Crow inserta relaciones cómic-personaje" on public.comic_characters;
    drop policy if exists "Solo el equipo Crow elimina relaciones cómic-personaje" on public.comic_characters;

    create policy "Solo el equipo Crow inserta relaciones cómic-personaje"
      on public.comic_characters for insert
      to authenticated
      with check (public.is_crow_admin());

    create policy "Solo el equipo Crow elimina relaciones cómic-personaje"
      on public.comic_characters for delete
      to authenticated
      using (public.is_crow_admin());
  end if;
end
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RELACIONES CAPÍTULO-PERSONAJE: escritura solo admin (SOLO si la tabla existe)
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.chapter_characters') is not null then
    drop policy if exists "Solo administradores pueden insertar relaciones capítulo-personaje" on public.chapter_characters;
    drop policy if exists "Solo administradores pueden eliminar relaciones capítulo-personaje" on public.chapter_characters;
    drop policy if exists "Solo el equipo Crow inserta relaciones capítulo-personaje" on public.chapter_characters;
    drop policy if exists "Solo el equipo Crow elimina relaciones capítulo-personaje" on public.chapter_characters;

    create policy "Solo el equipo Crow inserta relaciones capítulo-personaje"
      on public.chapter_characters for insert
      to authenticated
      with check (public.is_crow_admin());

    create policy "Solo el equipo Crow elimina relaciones capítulo-personaje"
      on public.chapter_characters for delete
      to authenticated
      using (public.is_crow_admin());
  end if;
end
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. COMENTARIOS: todos comentan, cada uno edita solo lo suyo, el admin modera
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Solo usuarios autenticados pueden insertar comentarios" on public.comments;
drop policy if exists "Solo usuarios autenticados pueden actualizar comentarios" on public.comments;
drop policy if exists "Solo usuarios autenticados pueden eliminar comentarios" on public.comments;
drop policy if exists "Usuarios registrados comentan" on public.comments;
drop policy if exists "Cada usuario edita solo sus comentarios" on public.comments;
drop policy if exists "Cada usuario elimina solo sus comentarios" on public.comments;
drop policy if exists "El equipo Crow modera todos los comentarios" on public.comments;
drop policy if exists "El equipo Crow elimina cualquier comentario" on public.comments;

create policy "Usuarios registrados comentan"
  on public.comments for insert
  to authenticated
  with check (true);

create policy "Cada usuario edita solo sus comentarios"
  on public.comments for update
  to authenticated
  using (user_email = lower(coalesce(auth.jwt() ->> 'email', '')))
  with check (user_email = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy "Cada usuario elimina solo sus comentarios"
  on public.comments for delete
  to authenticated
  using (user_email = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy "El equipo Crow modera todos los comentarios"
  on public.comments for update
  to authenticated
  using (public.is_crow_admin())
  with check (public.is_crow_admin());

create policy "El equipo Crow elimina cualquier comentario"
  on public.comments for delete
  to authenticated
  using (public.is_crow_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. GUÍAS DE LECTURA (Sprint 5): eventos e items, escritura solo admin (SOLO si existen)
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.events') is not null then
    drop policy if exists "Solo usuarios autenticados pueden crear eventos" on public.events;
    drop policy if exists "Solo usuarios autenticados pueden editar eventos" on public.events;
    drop policy if exists "Solo usuarios autenticados pueden eliminar eventos" on public.events;
    drop policy if exists "Solo el equipo Crow crea guías" on public.events;
    drop policy if exists "Solo el equipo Crow edita guías" on public.events;
    drop policy if exists "Solo el equipo Crow elimina guías" on public.events;

    create policy "Solo el equipo Crow crea guías"
      on public.events for insert
      to authenticated
      with check (public.is_crow_admin());

    create policy "Solo el equipo Crow edita guías"
      on public.events for update
      to authenticated
      using (public.is_crow_admin())
      with check (public.is_crow_admin());

    create policy "Solo el equipo Crow elimina guías"
      on public.events for delete
      to authenticated
      using (public.is_crow_admin());
  end if;
end
$$;

do $$
begin
  if to_regclass('public.event_items') is not null then
    drop policy if exists "Solo usuarios autenticados pueden crear items de eventos" on public.event_items;
    drop policy if exists "Solo usuarios autenticados pueden editar items de eventos" on public.event_items;
    drop policy if exists "Solo usuarios autenticados pueden eliminar items de eventos" on public.event_items;
    drop policy if exists "Solo el equipo Crow crea items de guías" on public.event_items;
    drop policy if exists "Solo el equipo Crow edita items de guías" on public.event_items;
    drop policy if exists "Solo el equipo Crow elimina items de guías" on public.event_items;

    create policy "Solo el equipo Crow crea items de guías"
      on public.event_items for insert
      to authenticated
      with check (public.is_crow_admin());

    create policy "Solo el equipo Crow edita items de guías"
      on public.event_items for update
      to authenticated
      using (public.is_crow_admin())
      with check (public.is_crow_admin());

    create policy "Solo el equipo Crow elimina items de guías"
      on public.event_items for delete
      to authenticated
      using (public.is_crow_admin());
  end if;
end
$$;

DO $$
BEGIN
    RAISE NOTICE '--- Completado: hardening-admin-rls.sql ---';
    RAISE NOTICE '🎉 TODOS LOS SCRIPTS SE HAN APLICADO CORRECTAMENTE ---';
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ─────────────────────────────────────────────────────────────────────────────
SELECT '========================================' AS mensaje;
SELECT 'VERIFICACIÓN DE POLÍTICAS APLICADAS' AS mensaje;
SELECT '========================================' AS mensaje;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname ILIKE '%Crow%'
ORDER BY tablename, cmd;
