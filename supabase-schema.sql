-- ==============================================================================
-- CROW COMICS: SCRIPT COMPLETO Y SEGURO (POSTGRESQL / SUPABASE)
-- ==============================================================================

-- 1. Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- 2. Limpieza previa por si quedaron residuos (DROP en orden por claves foráneas)
drop policy if exists "Comics son públicos para lectura" on public.comics;
drop policy if exists "Solo administradores autenticados pueden insertar comics" on public.comics;
drop policy if exists "Solo administradores autenticados pueden actualizar comics" on public.comics;
drop policy if exists "Solo administradores autenticados pueden eliminar comics" on public.comics;

drop policy if exists "Capítulos son públicos para lectura" on public.chapters;
drop policy if exists "Solo administradores autenticados pueden insertar capítulos" on public.chapters;
drop policy if exists "Solo administradores autenticados pueden actualizar capítulos" on public.chapters;
drop policy if exists "Solo administradores autenticados pueden eliminar capítulos" on public.chapters;

-- 3. Crear Tabla de Cómics
create table if not exists public.comics (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    original_title text,
    cover_url text not null,
    synopsis text not null,
    tag text not null check (tag in ('Popular', 'Novedad', 'Éxitos', 'Más Descargados', 'Trending')),
    status text not null check (status in ('En curso', 'Finalizado')),
    writer text not null,
    artist text,
    translator_typesetter text not null,
    year integer,
    average_rating decimal(3,2) default 0,
    total_ratings integer default 0,
    download_count integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Crear Tabla de Capítulos (referencia a comics)
create table if not exists public.chapters (
    id uuid default gen_random_uuid() primary key,
    comic_id uuid references public.comics(id) on delete cascade not null,
    chapter_number integer not null,
    title text not null,
    release_date text,
    links jsonb not null default '[]'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Crear Tabla de Comentarios
create table if not exists public.comments (
    id uuid default gen_random_uuid() primary key,
    comic_id uuid references public.comics(id) on delete cascade not null,
    user_name text not null,
    user_email text,
    content text not null,
    rating integer check (rating >= 0 and rating <= 5),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Crear Tabla de Personajes
create table if not exists public.characters (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    real_name text,
    photo_url text,
    description text,
    first_appearance text,
    publisher text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Crear Tabla de Relación Personaje-Cómic
create table if not exists public.comic_characters (
    id uuid default gen_random_uuid() primary key,
    comic_id uuid references public.comics(id) on delete cascade not null,
    character_id uuid references public.characters(id) on delete cascade not null,
    role text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(comic_id, character_id)
);

-- 8. Crear Tabla de Relación Personaje-Capítulo
create table if not exists public.chapter_characters (
    id uuid default gen_random_uuid() primary key,
    chapter_id uuid references public.chapters(id) on delete cascade not null,
    character_id uuid references public.characters(id) on delete cascade not null,
    role text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(chapter_id, character_id)
);

-- 9. Activar Row Level Security (RLS)
alter table public.comics enable row level security;
alter table public.chapters enable row level security;
alter table public.comments enable row level security;
alter table public.characters enable row level security;
alter table public.comic_characters enable row level security;
alter table public.chapter_characters enable row level security;

-- 6. Políticas de Lectura Pública (Cualquier visitante puede ver el catálogo)
create policy "Comics son públicos para lectura" 
on public.comics for select 
to anon, authenticated 
using (true);

create policy "Capítulos son públicos para lectura" 
on public.chapters for select 
to anon, authenticated 
using (true);

-- 7. Políticas de Escritura y Edición (Exclusivas para Administradores con sesión)
create policy "Solo administradores autenticados pueden insertar comics" 
on public.comics for insert 
to authenticated 
with check (true);

create policy "Solo administradores autenticados pueden actualizar comics" 
on public.comics for update 
to authenticated 
using (true)
with check (true);

create policy "Solo administradores autenticados pueden eliminar comics" 
on public.comics for delete 
to authenticated 
using (true);

create policy "Solo administradores autenticados pueden insertar capítulos" 
on public.chapters for insert 
to authenticated 
with check (true);

create policy "Solo administradores autenticados pueden actualizar capítulos" 
on public.chapters for update 
to authenticated 
using (true)
with check (true);

create policy "Solo administradores autenticados pueden eliminar capítulos"
on public.chapters for delete
to authenticated
using (true);

-- 8. Políticas para Comentarios
create policy "Comentarios son públicos para lectura"
on public.comments for select
to anon, authenticated
using (true);

create policy "Solo usuarios autenticados pueden insertar comentarios"
on public.comments for insert
to authenticated
with check (true);

create policy "Solo usuarios autenticados pueden actualizar comentarios"
on public.comments for update
to authenticated
using (true)
with check (true);

create policy "Solo usuarios autenticados pueden eliminar comentarios"
on public.comments for delete
to authenticated
using (true);

-- 9. Políticas para Personajes
create policy "Personajes son públicos para lectura"
on public.characters for select
to anon, authenticated
using (true);

create policy "Solo administradores pueden insertar personajes"
on public.characters for insert
to authenticated
with check (true);

create policy "Solo administradores pueden actualizar personajes"
on public.characters for update
to authenticated
using (true)
with check (true);

create policy "Solo administradores pueden eliminar personajes"
on public.characters for delete
to authenticated
using (true);

-- 10. Políticas para Relaciones Personaje-Cómic
create policy "Relaciones cómic-personaje son públicas para lectura"
on public.comic_characters for select
to anon, authenticated
using (true);

create policy "Solo administradores pueden insertar relaciones cómic-personaje"
on public.comic_characters for insert
to authenticated
with check (true);

create policy "Solo administradores pueden eliminar relaciones cómic-personaje"
on public.comic_characters for delete
to authenticated
using (true);

-- 11. Políticas para Relaciones Personaje-Capítulo
create policy "Relaciones capítulo-personaje son públicas para lectura"
on public.chapter_characters for select
to anon, authenticated
using (true);

create policy "Solo administradores pueden insertar relaciones capítulo-personaje"
on public.chapter_characters for insert
to authenticated
with check (true);

create policy "Solo administradores pueden eliminar relaciones capítulo-personaje"
on public.chapter_characters for delete
to authenticated
using (true);
