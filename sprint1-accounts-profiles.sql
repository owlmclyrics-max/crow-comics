-- ==============================================================================
-- CROW COMICS - SPRINT 1: SISTEMA DE CUENTAS Y PERFILES
-- Tablas de progreso, favoritos, listas y ajustes de privacidad con RLS.
-- Cada usuario SOLO ve y gestiona sus propias filas (auth.uid() = user_id).
-- Ejecutar en el SQL Editor de Supabase.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLA: FAVORITOS
-- ------------------------------------------------------------------------------
create table if not exists public.favorites (
    id uuid default gen_random_uuid() primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    comic_id uuid references public.comics(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (user_id, comic_id)
);

-- ------------------------------------------------------------------------------
-- 3. TABLA: PROGRESO DE LECTURA (HISTORIAL)
-- ------------------------------------------------------------------------------
create table if not exists public.reading_progress (
    id uuid default gen_random_uuid() primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    comic_id uuid references public.comics(id) on delete cascade not null,
    chapter_id uuid references public.chapters(id) on delete cascade not null,
    chapter_number integer not null,
    completed boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (user_id, chapter_id)
);

-- ------------------------------------------------------------------------------
-- 4. TABLA: LISTAS DE LECTURA PERSONALES
-- ------------------------------------------------------------------------------
create table if not exists public.reading_lists (
    id uuid default gen_random_uuid() primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    description text,
    is_public boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.reading_list_items (
    id uuid default gen_random_uuid() primary key,
    list_id uuid references public.reading_lists(id) on delete cascade not null,
    comic_id uuid references public.comics(id) on delete cascade not null,
    added_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (list_id, comic_id)
);

-- ------------------------------------------------------------------------------
-- 5. TABLA: AJUSTES DE PRIVACIDAD (una fila por usuario)
-- ------------------------------------------------------------------------------
create table if not exists public.user_settings (
    user_id uuid primary key references auth.users(id) on delete cascade,
    profile_public boolean default true not null,
    show_favorites boolean default true not null,
    show_activity boolean default true not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 6. LIMPIEZA DE POLÍTICAS PREVIAS (por si se re-ejecuta el script;
--    ahora SÍ existen las tablas, por eso va después de crearlas)
-- ------------------------------------------------------------------------------
drop policy if exists "Usuarios pueden ver sus favoritos" on public.favorites;
drop policy if exists "Usuarios pueden crear sus favoritos" on public.favorites;
drop policy if exists "Usuarios pueden eliminar sus favoritos" on public.favorites;
drop policy if exists "Usuarios pueden ver su propio progreso de lectura" on public.reading_progress;
drop policy if exists "Usuarios pueden insertar su propio progreso de lectura" on public.reading_progress;
drop policy if exists "Usuarios pueden actualizar su propio progreso de lectura" on public.reading_progress;
drop policy if exists "Usuarios pueden eliminar su propio progreso de lectura" on public.reading_progress;
drop policy if exists "Usuarios pueden ver sus propias listas" on public.reading_lists;
drop policy if exists "Usuarios pueden crear sus propias listas" on public.reading_lists;
drop policy if exists "Usuarios pueden actualizar sus propias listas" on public.reading_lists;
drop policy if exists "Usuarios pueden eliminar sus propias listas" on public.reading_lists;
drop policy if exists "Usuarios pueden ver los items de sus listas" on public.reading_list_items;
drop policy if exists "Usuarios pueden insertar items en sus listas" on public.reading_list_items;
drop policy if exists "Usuarios pueden eliminar items de sus listas" on public.reading_list_items;
drop policy if exists "Usuarios pueden ver sus propios ajustes" on public.user_settings;
drop policy if exists "Usuarios pueden insertar sus propios ajustes" on public.user_settings;
drop policy if exists "Usuarios pueden actualizar sus propios ajustes" on public.user_settings;

-- ------------------------------------------------------------------------------
-- 7. ACTIVAR ROW LEVEL SECURITY
-- ------------------------------------------------------------------------------
alter table public.favorites enable row level security;
alter table public.reading_progress enable row level security;
alter table public.reading_lists enable row level security;
alter table public.reading_list_items enable row level security;
alter table public.user_settings enable row level security;

-- ------------------------------------------------------------------------------
-- 8. POLÍTICAS FAVORITOS (solo dueño)
-- ------------------------------------------------------------------------------
create policy "Usuarios pueden ver sus favoritos"
on public.favorites for select
to authenticated
using (auth.uid() = user_id);

create policy "Usuarios pueden crear sus favoritos"
on public.favorites for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Usuarios pueden eliminar sus favoritos"
on public.favorites for delete
to authenticated
using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 9. POLÍTICAS PROGRESO DE LECTURA (solo dueño)
-- ------------------------------------------------------------------------------
create policy "Usuarios pueden ver su propio progreso de lectura"
on public.reading_progress for select
to authenticated
using (auth.uid() = user_id);

create policy "Usuarios pueden insertar su propio progreso de lectura"
on public.reading_progress for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Usuarios pueden actualizar su propio progreso de lectura"
on public.reading_progress for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Usuarios pueden eliminar su propio progreso de lectura"
on public.reading_progress for delete
to authenticated
using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 10. POLÍTICAS LISTAS DE LECTURA (solo dueño)
-- ------------------------------------------------------------------------------
create policy "Usuarios pueden ver sus propias listas"
on public.reading_lists for select
to authenticated
using (auth.uid() = user_id);

create policy "Usuarios pueden crear sus propias listas"
on public.reading_lists for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Usuarios pueden actualizar sus propias listas"
on public.reading_lists for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Usuarios pueden eliminar sus propias listas"
on public.reading_lists for delete
to authenticated
using (auth.uid() = user_id);

-- Items de listas: se valida la propiedad a través de la tabla padre reading_lists
create policy "Usuarios pueden ver los items de sus listas"
on public.reading_list_items for select
to authenticated
using (
    exists (
        select 1 from public.reading_lists rl
        where rl.id = reading_list_items.list_id
        and rl.user_id = auth.uid()
    )
);

create policy "Usuarios pueden insertar items en sus listas"
on public.reading_list_items for insert
to authenticated
with check (
    exists (
        select 1 from public.reading_lists rl
        where rl.id = reading_list_items.list_id
        and rl.user_id = auth.uid()
    )
);

create policy "Usuarios pueden eliminar items de sus listas"
on public.reading_list_items for delete
to authenticated
using (
    exists (
        select 1 from public.reading_lists rl
        where rl.id = reading_list_items.list_id
        and rl.user_id = auth.uid()
    )
);

-- ------------------------------------------------------------------------------
-- 11. POLÍTICAS AJUSTES DE PRIVACIDAD (solo dueño)
-- ------------------------------------------------------------------------------
create policy "Usuarios pueden ver sus propios ajustes"
on public.user_settings for select
to authenticated
using (auth.uid() = user_id);

create policy "Usuarios pueden insertar sus propios ajustes"
on public.user_settings for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Usuarios pueden actualizar sus propios ajustes"
on public.user_settings for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 12. ÍNDICES para consultas habituales por usuario
-- ------------------------------------------------------------------------------
create index if not exists idx_favorites_user on public.favorites (user_id);
create index if not exists idx_reading_progress_user on public.reading_progress (user_id, updated_at desc);
create index if not exists idx_reading_lists_user on public.reading_lists (user_id);
create index if not exists idx_reading_list_items_list on public.reading_list_items (list_id);
create index if not exists idx_reading_list_items_comic on public.reading_list_items (comic_id);
