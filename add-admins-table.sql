-- ==============================================================================
-- CROW COMICS: GESTIÓN DE ADMINS (tabla app_admins)
-- ==============================================================================
-- Ejecutar TODO en el SQL Editor de Supabase.
--
-- De ahora en más, quién es admin/colaborador NO vive en el código: vive
-- acá. El dueño (owlmclyrics@gmail.com) puede agregar y sacar gente desde
-- la web misma, sin tocar SQL nunca más.
--
-- Roles:
--   owner       → el jefe: gestiona la tabla (hoy: owlmclyrics@gmail.com)
--   admin       → todos los poderes del panel
--   colaborador → puede subir/editar contenido, sin gestión de admins
-- ==============================================================================

create table if not exists public.app_admins (
  email      text primary key check (email = lower(email)),
  role       text not null default 'admin' check (role in ('owner', 'admin', 'colaborador')),
  added_by   uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

-- Lectura: cualquier usuario con sesión (para saber su propio rol).
drop policy if exists "admins lectura para sesion" on public.app_admins;
create policy "admins lectura para sesion"
on public.app_admins for select
to authenticated
using (true);

-- Alta/baja: SOLO el owner.
create or replace function public.is_crow_owner()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.app_admins
    where email = lower(coalesce(auth.email(), ''))
      and role = 'owner'
  );
$$;

drop policy if exists "admins alta solo owner" on public.app_admins;
create policy "admins alta solo owner"
on public.app_admins for insert
to authenticated
with check (public.is_crow_owner());

drop policy if exists "admins baja solo owner" on public.app_admins;
create policy "admins baja solo owner"
on public.app_admins for delete
to authenticated
using (public.is_crow_owner());

-- ── SEMILLA: los admins actuales ────────────────────────────────────────────
-- on conflict: no rompe si ya existieran; actualiza el rol al correcto.
insert into public.app_admins (email, role) values
  ('owlmclyrics@gmail.com', 'owner'),
  ('mabner112@gmail.com', 'admin'),
  ('tmr296629@gmail.com', 'admin'),
  ('crow.comics.01@gmail.com', 'colaborador')
on conflict (email) do update set role = excluded.role;
