-- Solicitudes de cómics (v0.7): el lector pide que subamos una serie.
-- Ejecutar en Supabase SQL Editor.

create table if not exists public.comic_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  publisher text,
  notes text,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'en_revision', 'agregado', 'rechazado')),
  created_at timestamptz not null default now()
);

alter table public.comic_requests enable row level security;

-- Cada uno ve y crea las SUYAS
drop policy if exists "Mis solicitudes" on public.comic_requests;
create policy "Mis solicitudes"
  on public.comic_requests
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Los admins ven TODAS y cambian el estado (lista en ADMIN_EMAILS de la app)
drop policy if exists "Admin ve todo" on public.comic_requests;
create policy "Admin ve todo"
  on public.comic_requests
  for select
  using (auth.email() in (select lower(trim(value)) from json_array_elements_text('["owlmclyrics@gmail.com"]'::json)));
