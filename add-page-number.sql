-- ==============================================================================
-- CROW COMICS - SPRINT 3.5: MARCADOR DE PÁGINA MANUAL
-- El visor PDF (iframe de Drive) no puede detectar la página exacta, así que
-- el usuario guarda su marcador manualmente. Idempotente: se puede re-ejecutar.
-- Ejecutar en el SQL Editor de Supabase.
-- ==============================================================================

-- 1. Columna del marcador en el historial de lectura
alter table public.reading_progress
    add column if not exists page_number integer default 0 not null;

-- 2. Índice parcial para listar "lecturas con marcador" si se necesita después
create index if not exists idx_reading_progress_page
    on public.reading_progress (user_id, updated_at desc)
    where page_number > 0;

-- Ejemplo: marcar la página manualmente por SQL (opcional, edición de admin):
-- update public.reading_progress set page_number = 42
--     where user_id = '<UUID_USUARIO>' and chapter_id = '<UUID_CAPITULO>';
