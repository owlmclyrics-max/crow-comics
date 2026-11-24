-- Investigación completa de Red Lanterns
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Buscar todos los cómics con "lantern" en el título
SELECT 
  id, 
  title, 
  publisher, 
  created_at,
  updated_at
FROM comics
WHERE title ILIKE '%lantern%'
ORDER BY created_at DESC;

-- 2. Verificar TODOS los capítulos recientes (últimos 10 creados)
SELECT 
  c.id,
  c.comic_id,
  co.title as comic_title,
  c.chapter_number,
  c.title as chapter_title,
  c.release_date,
  c.schedule_date,
  c.created_at,
  c.updated_at
FROM chapters c
LEFT JOIN comics co ON c.comic_id = co.id
ORDER BY c.created_at DESC
LIMIT 20;

-- 3. Verificar si hay capítulos con comic_id NULL o inválido
SELECT
  id,
  comic_id,
  chapter_number,
  title,
  created_at
FROM chapters
WHERE comic_id IS NULL
   OR NOT EXISTS (SELECT 1 FROM comics WHERE id = chapters.comic_id)
ORDER BY created_at DESC;

-- 4. Contar capítulos por cómic
SELECT 
  co.title,
  COUNT(c.id) as chapter_count
FROM comics co
LEFT JOIN chapters c ON c.comic_id = co.id
GROUP BY co.id, co.title
ORDER BY chapter_count DESC;

-- 5. Verificar lanzamientos recientes
SELECT 
  rs.id,
  rs.title,
  rs.chapter_label,
  rs.release_at,
  rs.chapter_id,
  rs.comic_id,
  rs.created_at
FROM release_schedule rs
ORDER BY rs.created_at DESC
LIMIT 20;
