-- ==============================================================================
-- CROW COMICS: ROL DE COLABORADOR PARA GESTIÓN DE CONTENIDO
-- Ejecutar en Supabase después de supabase-schema.sql y
-- hardening-admin-rls.sql (o apply-all-pending-sql.sql).
-- ==============================================================================

-- Algunos proyectos antiguos solo tienen la relación personaje-capítulo.
-- Crear ambas tablas si faltan antes de configurar sus políticas RLS.
create table if not exists public.comic_characters (
  id uuid primary key default gen_random_uuid(),
  comic_id uuid references public.comics(id) on delete cascade not null,
  character_id uuid references public.characters(id) on delete cascade not null,
  role text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (comic_id, character_id)
);

create table if not exists public.chapter_characters (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references public.chapters(id) on delete cascade not null,
  character_id uuid references public.characters(id) on delete cascade not null,
  role text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (chapter_id, character_id)
);

create or replace function public.is_crow_content_editor()
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
        'owlmclyrics@gmail.com',
        'crow.comics.01@gmail.com'
      )
  );
$$;

revoke all on function public.is_crow_content_editor() from public, anon;
grant execute on function public.is_crow_content_editor() to authenticated;

-- Retira políticas de escritura anteriores para que sus permisos no se sumen
-- (las políticas permisivas de PostgreSQL se combinan con OR).
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('comics', 'chapters', 'characters', 'comic_characters', 'chapter_characters')
      and cmd <> 'SELECT'
  loop
    execute format(
      'drop policy %I on %I.%I',
      existing_policy.policyname,
      existing_policy.schemaname,
      existing_policy.tablename
    );
  end loop;
end
$$;

drop policy if exists "Comics son públicos para lectura" on public.comics;
create policy "Comics son públicos para lectura"
  on public.comics for select
  to anon, authenticated
  using (true);

drop policy if exists "Capítulos son públicos para lectura" on public.chapters;
create policy "Capítulos son públicos para lectura"
  on public.chapters for select
  to anon, authenticated
  using (true);

drop policy if exists "Personajes son públicos para lectura" on public.characters;
create policy "Personajes son públicos para lectura"
  on public.characters for select
  to anon, authenticated
  using (true);

drop policy if exists "Relaciones cómic-personaje son públicas para lectura" on public.comic_characters;
create policy "Relaciones cómic-personaje son públicas para lectura"
  on public.comic_characters for select
  to anon, authenticated
  using (true);

drop policy if exists "Relaciones capítulo-personaje son públicas para lectura" on public.chapter_characters;
create policy "Relaciones capítulo-personaje son públicas para lectura"
  on public.chapter_characters for select
  to anon, authenticated
  using (true);

alter table public.comics enable row level security;
alter table public.chapters enable row level security;
alter table public.characters enable row level security;
alter table public.comic_characters enable row level security;
alter table public.chapter_characters enable row level security;

create policy "Colaboradores de contenido insertan cómics"
  on public.comics for insert
  to authenticated
  with check (public.is_crow_content_editor());
create policy "Colaboradores de contenido actualizan cómics"
  on public.comics for update
  to authenticated
  using (public.is_crow_content_editor())
  with check (public.is_crow_content_editor());
create policy "Colaboradores de contenido eliminan cómics"
  on public.comics for delete
  to authenticated
  using (public.is_crow_content_editor());

create policy "Colaboradores de contenido insertan capítulos"
  on public.chapters for insert
  to authenticated
  with check (public.is_crow_content_editor());
create policy "Colaboradores de contenido actualizan capítulos"
  on public.chapters for update
  to authenticated
  using (public.is_crow_content_editor())
  with check (public.is_crow_content_editor());
create policy "Colaboradores de contenido eliminan capítulos"
  on public.chapters for delete
  to authenticated
  using (public.is_crow_content_editor());

create policy "Colaboradores de contenido insertan personajes"
  on public.characters for insert
  to authenticated
  with check (public.is_crow_content_editor());
create policy "Colaboradores de contenido actualizan personajes"
  on public.characters for update
  to authenticated
  using (public.is_crow_content_editor())
  with check (public.is_crow_content_editor());
create policy "Colaboradores de contenido eliminan personajes"
  on public.characters for delete
  to authenticated
  using (public.is_crow_content_editor());

create policy "Colaboradores de contenido asignan personajes a cómics"
  on public.comic_characters for insert
  to authenticated
  with check (public.is_crow_content_editor());
create policy "Colaboradores de contenido editan asignaciones de cómics"
  on public.comic_characters for update
  to authenticated
  using (public.is_crow_content_editor())
  with check (public.is_crow_content_editor());
create policy "Colaboradores de contenido quitan personajes de cómics"
  on public.comic_characters for delete
  to authenticated
  using (public.is_crow_content_editor());

create policy "Colaboradores de contenido asignan personajes a capítulos"
  on public.chapter_characters for insert
  to authenticated
  with check (public.is_crow_content_editor());
create policy "Colaboradores de contenido editan asignaciones de capítulos"
  on public.chapter_characters for update
  to authenticated
  using (public.is_crow_content_editor())
  with check (public.is_crow_content_editor());
create policy "Colaboradores de contenido quitan personajes de capítulos"
  on public.chapter_characters for delete
  to authenticated
  using (public.is_crow_content_editor());
