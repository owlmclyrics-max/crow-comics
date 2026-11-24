-- Buscar específicamente "Red Lanterns New 52"
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Buscar el cómic exacto
SELECT 
  id, 
  title, 
  publisher, 
  created_at,
  updated_at
FROM comics
WHERE title = 'Red Lanterns New 52'
   OR title ILIKE '%Red Lanterns New 52%';

-- 2. Si el cómic existe, ver sus capítulos
SELECT 
  c.id,
  c.chapter_number,
  c.title,
  c.release_date,
  c.schedule_date,
  c.created_at,
  c.updated_at
FROM chapters c
WHERE c.comic_id = (
  SELECT id FROM comics 
  WHERE title = 'Red Lanterns New 52' 
  OR title ILIKE '%Red Lanterns New 52%'
  LIMIT 1
)
ORDER BY c.chapter_number;

-- 3. Verificar lanzamientos para este cómic
SELECT 
  rs.id,
  rs.title,
  rs.chapter_label,
  rs.release_at,
  rs.chapter_id,
  rs.comic_id,
  rs.created_at
FROM release_schedule rs
WHERE rs.title ILIKE '%Red Lanterns New 52%'
ORDER BY rs.release_at;

-- 4. Verificar si hay capítulos huérfanos (sin cómic válido)
SELECT 
  c.id,
  c.comic_id,
  c.chapter_number,
  c.title,
  c.created_at
FROM chapters c
WHERE c.comic_id IS NULL
   OR c.comic_id = ''
   OR NOT EXISTS (SELECT 1 FROM comics WHERE id = c.comic_id)
ORDER BY c.created_at DESC
LIMIT 10;
