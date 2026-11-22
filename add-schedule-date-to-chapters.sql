-- Agregar schedule_date a chapters para programación de lanzamientos
-- Ejecutar este script en el SQL Editor de Supabase

-- Agregar columna schedule_date si no existe
ALTER TABLE public.chapters
ADD COLUMN IF NOT EXISTS schedule_date TIMESTAMPTZ;

-- Nota: release_date sigue siendo la fecha de publicación original del cómic
-- schedule_date es la fecha/hora en que aparece en el horario de lanzamientos
