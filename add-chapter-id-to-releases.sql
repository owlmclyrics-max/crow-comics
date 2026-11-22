-- Agregar chapter_id a release_schedule para vincular lanzamientos con capítulos
-- Ejecutar este script en el SQL Editor de Supabase

-- Agregar columna chapter_id si no existe
ALTER TABLE public.release_schedule
ADD COLUMN IF NOT EXISTS chapter_id TEXT;

-- Agregar índice para búsquedas rápidas por chapter_id
CREATE INDEX IF NOT EXISTS idx_release_schedule_chapter_id
ON public.release_schedule(chapter_id);

-- Nota: No se agrega FK constraint para permitir lanzamientos manuales
-- sin capítulo asociado
