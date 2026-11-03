-- ==============================================================================
-- CROW COMICS: AGREGAR COLUMNA pdf_url A TABLA chapters
-- Ejecutar en Supabase SQL Editor
-- ==============================================================================

ALTER TABLE public.chapters
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

COMMENT ON COLUMN public.chapters.pdf_url IS 'URL del PDF para leer online. Recomendado: Google Drive preview (https://drive.google.com/file/d/FILE_ID/preview)';
