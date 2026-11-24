-- Verificar qué pasó con los tomos de Red Lanterns
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Buscar el cómic Red Lanterns
SELECT id, title, created_at
FROM comics
WHERE title ILIKE '%red lantern%'
ORDER BY created_at DESC;

-- 2. Verificar capítulos de Red Lanterns
SELECT 
  c.id, 
  c.chapter_number, 
  c.title, 
  c.release_date,
  c.schedule_date,
  c.created_at
FROM chapters c
JOIN comics co ON c.comic_id = co.id
WHERE co.title ILIKE '%red lantern%'
ORDER BY c.chapter_number;

-- 3. Verificar lanzamientos programados de Red Lanterns
SELECT 
  rs.id,
  rs.title,
  rs.chapter_label,
  rs.release_at,
  rs.chapter_id,
  rs.created_at
FROM release_schedule rs
WHERE rs.title ILIKE '%red lantern%'
ORDER BY rs.release_at;

-- 4. Verificar si la columna schedule_date existe en chapters
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'chapters'
AND column_name IN ('release_date', 'schedule_date');
