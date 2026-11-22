-- ==============================================================================
-- CROW COMICS: CALENDARIO DE LANZAMIENTOS (v0.11.0)
-- ==============================================================================
-- Ejecutar TODO en el SQL Editor de Supabase.
--
-- Anuncios de lo que viene: fecha + hora, portada, editorial y (opcional)
-- el cómic del catálogo. Es independiente de los tomos ya subidos, así que
-- podés anunciar antes de tener el archivo listo.
-- ==============================================================================

create table if not exists public.release_schedule (
  id            uuid primary key default gen_random_uuid(),
  comic_id      uuid references public.comics(id) on delete set null,
  title         text not null,
  chapter_label text,
  publisher     text,
  cover_url     text,
  release_at    timestamptz not null,
  notes         text,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

alter table public.release_schedule enable row level security;

-- Quién es del equipo (owner, admin o colaborador).
create or replace function public.can_manage_releases()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_admins
    where email = lower(coalesce(auth.email(), ''))
      and role in ('owner', 'admin', 'colaborador')
  );
$$;

revoke all on function public.can_manage_releases() from public, anon;
grant execute on function public.can_manage_releases() to authenticated;

-- Lectura pública: el calendario lo ve todo el mundo.
drop policy if exists "lanzamientos lectura publica" on public.release_schedule;
create policy "lanzamientos lectura publica"
on public.release_schedule for select
to anon, authenticated
using (true);

-- Escritura: solo el equipo.
drop policy if exists "lanzamientos crea el equipo" on public.release_schedule;
create policy "lanzamientos crea el equipo"
on public.release_schedule for insert
to authenticated
with check (public.can_manage_releases());

drop policy if exists "lanzamientos edita el equipo" on public.release_schedule;
create policy "lanzamientos edita el equipo"
on public.release_schedule for update
to authenticated
using (public.can_manage_releases())
with check (public.can_manage_releases());

drop policy if exists "lanzamientos borra el equipo" on public.release_schedule;
create policy "lanzamientos borra el equipo"
on public.release_schedule for delete
to authenticated
using (public.can_manage_releases());

create index if not exists release_schedule_date_idx
  on public.release_schedule (release_at asc);

create index if not exists release_schedule_comic_idx
  on public.release_schedule (comic_id);
