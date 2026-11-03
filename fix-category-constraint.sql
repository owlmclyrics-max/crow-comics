-- ==============================================================================
-- SOLUCIÓN DEFINITIVA: ELIMINAR RESTRICCIONES DE CATEGORÍA
-- Ejecuta esto en el SQL Editor de Supabase y dale a "Run"
-- ==============================================================================

-- 1. Eliminar la restricción restrictiva anterior de categorías para permitir cualquier género
alter table public.comics drop constraint if exists comics_category_check;

-- 2. Asegurar que las columnas nuevas existan
alter table public.comics add column if not exists publisher text not null default 'Independiente';
alter table public.comics add column if not exists total_issues_label text;
alter table public.comics add column if not exists full_download_links jsonb not null default '[]'::jsonb;
alter table public.chapters add column if not exists cover_url text;
