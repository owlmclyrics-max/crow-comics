-- ==============================================================================
-- CROW COMICS: MINI-WIKI DE PERSONAJES (ficha estilo Marvel)
-- Campos extra para la ficha: alias, especie, universo, origen, creadores,
-- enemigos, poderes y arma principal. Todos opcionales (TEXT).
-- Ejecutar en Supabase → SQL Editor.
-- ==============================================================================

ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS aliases TEXT;
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS species TEXT;
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS universe TEXT;
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS origin_place TEXT;
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS creators TEXT;
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS enemies TEXT;
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS powers TEXT;
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS weapon TEXT;
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS alignment TEXT;

-- weapon: ej. "All-Black, la Necroespada"
-- aliases: uno por línea (ej. "Rey de Negro\nDios de los Simbiontes")
-- species: ej. "Entidad cósmica primordial"
-- universe: ej. "Tierra-616"
-- origin_place: ej. "Vacío primordial"
-- creators: ej. "Donny Cates y Ryan Stegman"
-- enemies: uno por línea (ej. "Venom\nThor\nSilver Surfer")
-- powers: un poder por línea
-- weapon: ej. "All-Black, la Necroespada"
