-- Agregar columnas faltantes a chapters para el sistema de lanzamientos
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Agregar columna schedule_date si no existe
ALTER TABLE public.chapters
ADD COLUMN IF NOT EXISTS schedule_date TIMESTAMPTZ;

-- 2. Verificar que la columna chapter_id existe en release_schedule
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'release_schedule'
        AND column_name = 'chapter_id'
    ) THEN
        ALTER TABLE public.release_schedule
        ADD COLUMN chapter_id TEXT;
        
        -- Agregar índice para búsquedas rápidas
        CREATE INDEX IF NOT EXISTS idx_release_schedule_chapter_id
        ON public.release_schedule(chapter_id);
    END IF;
END $$;

-- Verificación
SELECT 
    'Columnas agregadas exitosamente' AS mensaje,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'chapters' AND column_name = 'schedule_date') AS schedule_date_existe,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'release_schedule' AND column_name = 'chapter_id') AS chapter_id_existe;
