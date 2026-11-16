-- ==============================================================================
-- CROW COMICS: STORAGE DE PÁGINAS (visor propio de imágenes)
-- ==============================================================================
-- PASO 1 (dashboard, NO SQL):
--   Supabase → Storage → "New bucket" → nombre EXACTO: pages
--   → marcar "Public bucket" → Create.
--
-- PASO 2: ejecutar TODO este archivo en el SQL Editor.
--   Las páginas WebP de los tomos viven en ese bucket. Cualquiera puede
--   VERLAS (URLs públicas con CDN), pero SOLO los emails del equipo pueden
--   SUBIR o BORRAR — está cerrado con política, no con confianza.
-- ==============================================================================

-- Lectura: público (el bucket ya es público, esto lo respalda en la API).
CREATE POLICY "pages lectura publica"
ON storage.objects FOR SELECT
USING (bucket_id = 'pages');

-- Subida: solo admins/colaboradores autenticados.
CREATE POLICY "pages suben admins"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pages'
  AND (auth.email())::text IN (
    'owlmclyrics@gmail.com',
    'mabner112@gmail.com',
    'crow.comics.01@gmail.com'
  )
);

-- Borrado/reemplazo: mismos admins.
CREATE POLICY "pages borran admins"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'pages'
  AND (auth.email())::text IN (
    'owlmclyrics@gmail.com',
    'mabner112@gmail.com',
    'crow.comics.01@gmail.com'
  )
);
