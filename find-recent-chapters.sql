-- Buscar capítulos creados recientemente que podrían ser los #11-#15
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Últimos 20 capítulos creados (todos los cómics)
SELECT 
  c.id,
  c.comic_id,
  co.title as comic_title,
  c.chapter_number,
  c.title,
  c.release_date,
  c.schedule_date,
  c.created_at
FROM chapters c
LEFT JOIN comics co ON c.comic_id = co.id
ORDER BY c.created_at DESC
LIMIT 20;

-- 2. Capítulos con chapter_number > 10 (todos los cómics)
SELECT 
  c.id,
  c.comic_id,
  co.title as comic_title,
  c.chapter_number,
  c.title,
  c.release_date,
  c.schedule_date,
  c.created_at
FROM chapters c
LEFT JOIN comics co ON c.comic_id = co.id
WHERE c.chapter_number > 10
ORDER BY c.created_at DESC;

-- 3. Capítulos específicamente de Red Lanterns con número > 10
SELECT 
  c.id,
  c.comic_id,
  c.chapter_number,
  c.title,
  c.release_date,
  c.schedule_date,
  c.created_at
FROM chapters c
WHERE c.comic_id = (
  SELECT id FROM comics 
  WHERE title = 'Red Lanterns New 52' 
  OR title ILIKE '%Red Lanterns New 52%'
  LIMIT 1
)
AND c.chapter_number > 10
ORDER BY c.chapter_number;

-- 4. Contar capítulos por cómic (para ver cuántos tiene cada uno)
SELECT 
  co.title,
  COUNT(c.id) as total_capitulos,
  MAX(c.chapter_number) as max_numero
FROM comics co
LEFT JOIN chapters c ON c.comic_id = co.id
GROUP BY co.id, co.title
ORDER BY total_capitulos DESC;
