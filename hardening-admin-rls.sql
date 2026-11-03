-- ==============================================================================
-- CROW COMICS - HARDENING DE SEGURIDAD (RLS SOLO PARA ADMINS)
-- ==============================================================================
-- ¿Qué hace este script?
--   1. Crea la función is_crow_admin(): devuelve TRUE solo si el usuario con
--      sesión iniciada es uno de los correos de ADMIN_EMAILS de la app.
--   2. Reemplaza TODAS las políticas de escritura que permitían editar a
--      cualquier usuario autenticado ("with check (true)") por políticas que
--      exigen is_crow_admin().
--   3. Los comentarios quedan abiertos para que cualquier usuario registado
--      comente, pero cada uno solo puede EDITAR/BORRAR los suyos
--      (y el admin puede moderar todo).
-- La lectura pública (anon + authenticated) NO cambia: el catálogo sigue
-- visible para todos los visitantes.
-- Idempotente: se puede ejecutar varias veces sin romper nada.
-- Ejecutar COMPLETO en el SQL Editor de Supabase (una sola vez, tras el schema
-- y sprint5 si aún no los corriste).
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FUNCIÓN:¿este usuario es del equipo Crow?
--    SECURITY DEFINER: puede leer auth.users aunque el cliente no pueda.
--    ⚠ Si algún día cambia el correo admin, edita la lista AQUÍ (y también
--    ADMIN_EMAILS en src/context/AuthContext.tsx de la app).
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
-- 5. RELACIONES CÓMIC-PERSONAJE: escritura solo admin
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Solo administradores pueden insertar relaciones cómic-personaje" on public.comic_characters;
drop policy if exists "Solo administradores pueden eliminar relaciones cómic-personaje" on public.comic_characters;

create policy "Solo el equipo Crow inserta relaciones cómic-personaje"
  on public.comic_characters for insert
  to authenticated
  with check (public.is_crow_admin());

create policy "Solo el equipo Crow elimina relaciones cómic-personaje"
  on public.comic_characters for delete
  to authenticated
  using (public.is_crow_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RELACIONES CAPÍTULO-PERSONAJE: escritura solo admin
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Solo administradores pueden insertar relaciones capítulo-personaje" on public.chapter_characters;
drop policy if exists "Solo administradores pueden eliminar relaciones capítulo-personaje" on public.chapter_characters;

create policy "Solo el equipo Crow inserta relaciones capítulo-personaje"
  on public.chapter_characters for insert
  to authenticated
  with check (public.is_crow_admin());

create policy "Solo el equipo Crow elimina relaciones capítulo-personaje"
  on public.chapter_characters for delete
  to authenticated
  using (public.is_crow_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. COMENTARIOS: todos comentan, cada uno edita solo lo suyo, el admin modera
--    (las políticas anteriores permitían editar/borrar comentarios de NADIE)
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Solo usuarios autenticados pueden insertar comentarios" on public.comments;
drop policy if exists "Solo usuarios autenticados pueden actualizar comentarios" on public.comments;
drop policy if exists "Solo usuarios autenticados pueden eliminar comentarios" on public.comments;

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
-- 8. GUÍAS DE LECTURA (Sprint 5): eventos e items, escritura solo admin
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Solo usuarios autenticados pueden crear eventos" on public.events;
drop policy if exists "Solo usuarios autenticados pueden editar eventos" on public.events;
drop policy if exists "Solo usuarios autenticados pueden eliminar eventos" on public.events;
drop policy if exists "Solo usuarios autenticados pueden crear items de eventos" on public.event_items;
drop policy if exists "Solo usuarios autenticados pueden editar items de eventos" on public.event_items;
drop policy if exists "Solo usuarios autenticados pueden eliminar items de eventos" on public.event_items;

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

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Verificación rápida de lo aplicado (se muestra al final del editor)
-- ─────────────────────────────────────────────────────────────────────────────
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and policyname ilike '%Crow%'
order by tablename, cmd;
