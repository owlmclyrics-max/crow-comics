-- ==============================================================================
-- CROW COMICS - SPRINT 3: LISTAS PERSONALIZADAS Y COLECCIONES CURADAS
-- Reutiliza las tablas reading_lists / reading_list_items del Sprint 1.
-- Añade is_featured para las colecciones oficiales del sitio y las hace
-- públicamente legibles (solo lectura; la edición sigue siendo del dueño).
-- Ejecutar en el SQL Editor de Supabase. Idempotente.
-- ==============================================================================

-- 1. Columna para marcar listas oficiales del sitio (creadas por el admin)
alter table public.reading_lists
    add column if not exists is_featured boolean default false not null;

-- Marcar aquí tus listas oficiales por nombre (ejemplos; edita a tu gusto):
-- update public.reading_lists set is_featured = true where name = 'Esenciales Marvel';

-- 2. Limpieza de políticas previas de este sprint (idempotencia)
drop policy if exists "Listas oficiales destacadas son visibles para todos" on public.reading_lists;
drop policy if exists "Items de listas destacadas son visibles para todos" on public.reading_list_items;

-- 3. Los visitantes (anon + usuarios) pueden VER las colecciones destacadas…
create policy "Listas oficiales destacadas son visibles para todos"
on public.reading_lists for select
to anon, authenticated
using (is_featured = true and is_public = true);

-- …y los cómics que contienen (solo lectura; editar sigue siendo solo del dueño)
create policy "Items de listas destacadas son visibles para todos"
on public.reading_list_items for select
to anon, authenticated
using (
    exists (
        select 1 from public.reading_lists rl
        where rl.id = reading_list_items.list_id
        and rl.is_featured = true
        and rl.is_public = true
    )
);

-- 4. Índice para la consulta del home
create index if not exists idx_reading_lists_featured on public.reading_lists (is_featured) where is_featured;
