-- ==============================================================================
-- CROW COMICS: ELEGIR VARIANTE EN EL REPARTO DE UN TOMO
-- Agrega a la relación "chapter_characters" (personajes asignados a un tomo)
-- una columna opcional con la variante a mostrar en el reparto de ese tomo.
-- null = se muestra la ficha principal. Correr UNA VEZ en SQL Editor.
-- ==============================================================================

alter table public.chapter_characters
  add column if not exists variant_id uuid
  references public.character_variants (id)
  on delete set null;

-- Si el admin elige una variante y luego borra esa variante, el reparto
-- vuelve solo a la ficha principal (on delete set null).

-- Verificación
select 'Columna variant_id lista en chapter_characters' as mensaje;
