-- Verificar qué cómics y capítulos tienen portadas en WebP vs solo links
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Cómics con portada (cover_url no nulo)
SELECT
  'Cómics con portada' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN cover_url LIKE '%.webp' THEN 1 END) as webp,
  COUNT(CASE WHEN cover_url NOT LIKE '%.webp' AND cover_url IS NOT NULL THEN 1 END) as otros
FROM comics
WHERE cover_url IS NOT NULL;

-- 2. Cómics con banner en WebP
SELECT
  'Cómics con banner' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN banner_url LIKE '%.webp' THEN 1 END) as webp,
  COUNT(CASE WHEN banner_url NOT LIKE '%.webp' AND banner_url IS NOT NULL THEN 1 END) as otros
FROM comics
WHERE banner_url IS NOT NULL;

-- 3. Capítulos con portada individual
SELECT
  'Capítulos con portada' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN cover_url LIKE '%.webp' THEN 1 END) as webp,
  COUNT(CASE WHEN cover_url NOT LIKE '%.webp' AND cover_url IS NOT NULL THEN 1 END) as otros
FROM chapters
WHERE cover_url IS NOT NULL;

-- 4. Capítulos con páginas WebP (visor propio)
SELECT
  'Capítulos con páginas WebP' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN pages IS NOT NULL AND jsonb_array_length(pages) > 0 THEN 1 END) as con_paginas,
  COUNT(CASE WHEN pages IS NULL OR jsonb_array_length(pages) = 0 THEN 1 END) as sin_paginas
FROM chapters;

-- 5. Lista detallada de cómics con formato de portada
SELECT
  title as 'Cómic',
  CASE
    WHEN cover_url LIKE '%.webp' THEN 'WebP'
    WHEN cover_url IS NOT NULL THEN 'Otro formato'
    ELSE 'Sin portada'
  END as formato_portada,
  CASE
    WHEN banner_url LIKE '%.webp' THEN 'WebP'
    WHEN banner_url IS NOT NULL THEN 'Otro formato'
    ELSE 'Sin banner'
  END as formato_banner
FROM comics
ORDER BY created_at DESC
LIMIT 50;

-- 6. Lista detallada de capítulos con formato de portada y páginas
SELECT
  c.title as 'Cómic',
  ch.chapter_number as 'Tomo',
  CASE
    WHEN ch.cover_url LIKE '%.webp' THEN 'WebP'
    WHEN ch.cover_url IS NOT NULL THEN 'Otro formato'
    ELSE 'Sin portada'
  END as formato_portada,
  CASE
    WHEN ch.pages IS NOT NULL AND jsonb_array_length(ch.pages) > 0 THEN CONCAT('Sí (', jsonb_array_length(ch.pages), ' páginas)')
    ELSE 'No'
  END as paginas_webp
FROM chapters ch
JOIN comics c ON ch.comic_id = c.id
ORDER BY ch.created_at DESC
LIMIT 50;
