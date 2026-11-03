-- ==============================================================================
-- ACTUALIZACIÓN DE COLUMNAS PARA SOPORTAR PACKS Y VOLÚMENES
-- Ejecuta esto en el SQL Editor de Supabase y dale a "Run"
-- ==============================================================================

-- 1. Añadir columnas a la tabla 'comics' si no existen
alter table public.comics add column if not exists publisher text not null default 'Independiente';
alter table public.comics add column if not exists total_issues_label text;
alter table public.comics add column if not exists full_download_links jsonb not null default '[]'::jsonb;

-- 2. Añadir columnas a la tabla 'chapters' si no existen
alter table public.chapters add column if not exists cover_url text;
alter table public.chapters add column if not exists pages_count integer;
