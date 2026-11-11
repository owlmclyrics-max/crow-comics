-- ==============================================================================
-- CROW COMICS: AGREGAR COLUMNA "aliases" A LAS VARIANTES DE PERSONAJES
-- El formulario de variantes usa un campo Alias, pero las versiones
-- anteriores del SQL de character_variants no incluían esa columna → los
-- inserts con alias fallaban. Correr UNA VEZ en Supabase SQL Editor.
-- ==============================================================================

alter table public.character_variants add column if not exists aliases text;

-- Verificación
select 'Columna aliases lista' as mensaje;
