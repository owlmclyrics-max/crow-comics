-- ==============================================================================
-- CROW COMICS: FEED DE MOMENTOS (estilo Instagram, SOLO TEXTO)
-- ==============================================================================
-- Ejecutar TODO en el SQL Editor de Supabase.
--
--  1. community_posts: los momentos/reseñas (solo texto, sin fotos —
--     el storage queda para los tomos).
--  2. community_likes: ❤️ sin duplicados (una por usuario y post).
--  3. community_comments: comentarios de cada momento.
--  4. RPC get_feed_posts: el feed armado en el server (contadores de
--     likes/comentarios + si ya lo LIKE-eas), filtrado por auth.uid().
-- ==============================================================================

-- ── 1. POSTS ─────────────────────────────────────────────────────────────────
create table if not exists public.community_posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

alter table public.community_posts enable row level security;

drop policy if exists "feed lectura publica" on public.community_posts;
create policy "feed lectura publica"
on public.community_posts for select
using (true);

drop policy if exists "feed publica el propio" on public.community_posts;
create policy "feed publica el propio"
on public.community_posts for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "feed borra el propio" on public.community_posts;
create policy "feed borra el propio"
on public.community_posts for delete
to authenticated
using (user_id = auth.uid());

create index if not exists feed_created_idx on public.community_posts (created_at desc);

-- ── 2. LIKES ─────────────────────────────────────────────────────────────────
create table if not exists public.community_likes (
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.community_likes enable row level security;

drop policy if exists "likes lectura publica" on public.community_likes;
create policy "likes lectura publica"
on public.community_likes for select
using (true);

drop policy if exists "likes da el propio" on public.community_likes;
create policy "likes da el propio"
on public.community_likes for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "likes saca el propio" on public.community_likes;
create policy "likes saca el propio"
on public.community_likes for delete
to authenticated
using (user_id = auth.uid());

-- ── 3. COMENTARIOS ───────────────────────────────────────────────────────────
create table if not exists public.community_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.community_comments enable row level security;

drop policy if exists "comentarios lectura publica" on public.community_comments;
create policy "comentarios lectura publica"
on public.community_comments for select
using (true);

drop policy if exists "comentarios escribe el propio" on public.community_comments;
create policy "comentarios escribe el propio"
on public.community_comments for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "comentarios borra el propio" on public.community_comments;
create policy "comentarios borra el propio"
on public.community_comments for delete
to authenticated
using (user_id = auth.uid());

create index if not exists comments_post_idx on public.community_comments (post_id, created_at);

-- ── 4. RPC: el feed armado ───────────────────────────────────────────────────
create or replace function public.get_feed_posts(p_limit int default 30)
returns table (
  id          uuid,
  user_id     uuid,
  username    text,
  avatar_url  text,
  body        text,
  created_at  timestamptz,
  likes       integer,
  comments    integer,
  liked_by_me boolean
)
language sql stable security definer set search_path = public as $$
  select
    p.id,
    p.user_id,
    pr.username,
    pr.avatar_url,
    p.body,
    p.created_at,
    (select count(*) from community_likes l where l.post_id = p.id)::int as likes,
    (select count(*) from community_comments c where c.post_id = p.id)::int as comments,
    exists (
      select 1 from community_likes l2
      where l2.post_id = p.id and l2.user_id = auth.uid()
    ) as liked_by_me
  from community_posts p
  join profiles pr on pr.id = p.user_id
  order by p.created_at desc
  limit coalesce(p_limit, 30);
$$;

revoke all on function public.get_feed_posts(int) from anon;
grant execute on function public.get_feed_posts(int) to authenticated;
