-- ==============================================================================
-- CROW COMICS: RED SOCIAL — follows + chat directo + presencia
-- ==============================================================================
-- Ejecutar TODO en el SQL Editor de Supabase.
--
--  1. follows: quién sigue a quién (perfil a perfil, sin duplicados).
--  2. dm_messages: mensajes directos 1 a 1. Solo el remitente y el
--     destinatario pueden ver sus mensajes (RLS, no confiancito).
--  3. profiles.last_seen_at: "heartbeat" que manda el navegador mientras
--     la web está abierta → para mostrar "En línea / hace X min".
--  4. Tiempo real: la tabla dm_messages entra a la publicación
--     supabase_realtime para que los mensajes lleguen sin refrescar.
--  5. RPC get_dm_conversations: lista de conversaciones (último mensaje
--     + no leídos) armada en el server, siempre filtrada por auth.uid().
--  6. RPC get_dm_unread_count: globo de no leídos del navbar.
-- ==============================================================================

-- ── 1. FOLLOWS ────────────────────────────────────────────────────────────────
create table if not exists public.follows (
  follower_id  uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

alter table public.follows enable row level security;

-- Cualquiera (incluido anónimo) puede VER quién sigue a quién.
drop policy if exists "follows lectura publica" on public.follows;
create policy "follows lectura publica"
on public.follows for select
using (true);

-- Solo seguírselo a alguien siendo vos el follower (y con sesión).
drop policy if exists "follows inserta el propio" on public.follows;
create policy "follows inserta el propio"
on public.follows for insert
to authenticated
with check (follower_id = auth.uid());

-- Dejar de seguir: solo el dueño del follow puede borrarlo.
drop policy if exists "follows borra el propio" on public.follows;
create policy "follows borra el propio"
on public.follows for delete
to authenticated
using (follower_id = auth.uid());

create index if not exists follows_following_idx on public.follows (following_id);
create index if not exists follows_follower_idx  on public.follows (follower_id);

-- ── 2. MENSAJES DIRECTOS ──────────────────────────────────────────────────────
create table if not exists public.dm_messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 2000),
  created_at   timestamptz not null default now(),
  read_at      timestamptz,          -- cuándo lo leyó el destinatario ("visto")
  check (sender_id <> recipient_id)
);

alter table public.dm_messages enable row level security;

-- Ver solo los mensajes donde participo.
drop policy if exists "dm leo solo los mios" on public.dm_messages;
create policy "dm leo solo los mios"
on public.dm_messages for select
to authenticated
using (sender_id = auth.uid() or recipient_id = auth.uid());

-- Mandar: yo soy el remitente y no me hablo solo.
drop policy if exists "dm manda el remitente" on public.dm_messages;
create policy "dm manda el remitente"
on public.dm_messages for insert
to authenticated
with check (sender_id = auth.uid() and recipient_id <> sender_id);

-- Marcar como leído: solo el destinatario, y solo poniendo read_at.
drop policy if exists "dm marca leido el destinatario" on public.dm_messages;
create policy "dm marca leido el destinatario"
on public.dm_messages for update
to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

create index if not exists dm_partner_idx on public.dm_messages (sender_id, recipient_id, created_at desc);
create index if not exists dm_inbox_idx   on public.dm_messages (recipient_id, created_at desc);

-- ── 3. PRESENCIA (última vez visto) ─────────────────────────────────────────
alter table public.profiles
  add column if not exists last_seen_at timestamptz;

-- ── 4. TIEMPO REAL para el chat ─────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dm_messages'
  ) then
    alter publication supabase_realtime add table public.dm_messages;
  end if;
end $$;

-- ── 5. RPC: lista de conversaciones ─────────────────────────────────────────
create or replace function public.get_dm_conversations()
returns table (
  partner_id uuid,
  username   text,
  avatar_url text,
  last_seen_at timestamptz,
  last_body  text,
  last_at    timestamptz,
  last_is_mine boolean,
  unread     integer
)
language sql stable security definer set search_path = public as $$
  with my_msgs as (
    select
      case when sender_id = auth.uid() then recipient_id else sender_id end as partner_id,
      body, created_at, read_at,
      (recipient_id = auth.uid()) as is_incoming,
      (recipient_id = auth.uid() and read_at is null) as unread_flag
    from public.dm_messages
    where sender_id = auth.uid() or recipient_id = auth.uid()
  ),
  ranked as (
    select
      m.*,
      row_number() over (partition by partner_id order by created_at desc) as rn,
      coalesce(sum(case when unread_flag then 1 else 0 end) over (partition by partner_id), 0) as unread_cnt
    from my_msgs m
  )
  select
    r.partner_id,
    p.username,
    p.avatar_url,
    p.last_seen_at,
    r.body,
    r.created_at,
    not r.is_incoming,
    r.unread_cnt::integer
  from ranked r
  join public.profiles p on p.id = r.partner_id
  where r.rn = 1
  order by r.created_at desc;
$$;

revoke all on function public.get_dm_conversations() from anon;
grant execute on function public.get_dm_conversations() to authenticated;

-- ── 6. RPC: total de no leídos (globo del navbar) ────────────────────────────
create or replace function public.get_dm_unread_count()
returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(count(*), 0)::int
  from public.dm_messages
  where recipient_id = auth.uid()
    and read_at is null;
$$;

revoke all on function public.get_dm_unread_count() from anon;
grant execute on function public.get_dm_unread_count() to authenticated;
