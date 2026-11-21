-- ==============================================================================
-- CROW COMICS: CENTRO DE NOTIFICACIONES (v0.10.6)
-- ==============================================================================
-- Ejecutar TODO en el SQL Editor de Supabase.
--
-- Avisos de la red social: nuevo seguidor, mensaje directo, ❤️ en tu
-- momento y comentarios en tu momento. Cada fila es para UNA persona
-- (user_id) y firma quien lo generó (actor_id).
-- ==============================================================================

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,  -- destinatario
  actor_id   uuid not null references auth.users(id) on delete cascade,  -- quien generó el aviso
  type       text not null check (type in ('follow','message','like','comment')),
  body       text not null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- Leo solo MIS notificaciones.
drop policy if exists "notificaciones leo las mias" on public.notifications;
create policy "notificaciones leo las mias"
on public.notifications for select
using (user_id = auth.uid());

-- Crea avisos quien genera la acción (firmando como él mismo).
drop policy if exists "notificaciones crea el actor" on public.notifications;
create policy "notificaciones crea el actor"
on public.notifications for insert
to authenticated
with check (actor_id = auth.uid());

-- Marco leídas / borro las mías.
drop policy if exists "notificaciones actualiza el destino" on public.notifications;
create policy "notificaciones actualiza el destino"
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "notificaciones borra el destino" on public.notifications;
create policy "notificaciones borra el destino"
on public.notifications for delete
to authenticated
using (user_id = auth.uid());

create index if not exists notifications_inbox_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications (user_id)
  where read_at is null;

-- Realtime: la campana suena sin refrescar.
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null; -- ya estaba agregada
end $$;
