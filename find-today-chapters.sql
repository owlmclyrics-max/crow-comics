-- Buscar capítulos creados hoy (2026-11-24) que podrían ser los #11-#15
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Capítulos creados hoy
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
WHERE c.created_at::date = CURRENT_DATE
ORDER BY c.created_at DESC;

-- 2. Capítulos creados en las últimas 48 horas
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
WHERE c.created_at >= NOW() - INTERVAL '48 hours'
ORDER BY c.created_at DESC;

-- 3. Capítulos con schedule_date (todos)
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
WHERE c.schedule_date IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 20;

-- 4. Capítulos con comic_id que no existe (huérfanos)
SELECT 
  c.id,
  c.comic_id,
  c.chapter_number,
  c.title,
  c.created_at
FROM chapters c
WHERE c.comic_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM comics WHERE id = c.comic_id)
ORDER BY c.created_at DESC;
