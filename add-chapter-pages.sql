-- ==============================================================================
-- CROW COMICS: PÁGINAS DE IMAGEN POR TOMO (visor propio)
-- ==============================================================================
-- Los tomos pueden tener un PDF de Drive (pdf_url) Y/O páginas de imagen
-- propias (pages): un array JSON con las URLs de cada página, en orden.
-- El visor usa las imágenes si existen y cae al PDF si no.
--
-- Ejecutar en el SQL Editor de Supabase.

ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS pages JSONB;
