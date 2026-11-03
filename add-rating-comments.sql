-- ==============================================================================
-- CROW COMICS: AGREGAR CAMPOS DE RATING Y COMENTARIOS
-- ==============================================================================

-- 1. Agregar campos de rating y descargas a la tabla comics
ALTER TABLE public.comics
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

-- 2. Crear tabla de comentarios
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comic_id UUID REFERENCES public.comics(id) ON DELETE CASCADE NOT NULL,
    user_name TEXT NOT NULL,
    user_email TEXT,
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 0 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Activar RLS en comentarios
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para comentarios
-- Cualquiera puede leer comentarios
CREATE POLICY "Comentarios son públicos para lectura"
ON public.comments FOR SELECT
TO anon, authenticated
USING (true);

-- Solo usuarios autenticados pueden insertar comentarios
CREATE POLICY "Solo usuarios autenticados pueden insertar comentarios"
ON public.comments FOR INSERT
TO authenticated
WITH CHECK (true);

-- Solo el autor o admin puede actualizar comentarios (simplificado: cualquiera autenticado)
CREATE POLICY "Solo usuarios autenticados pueden actualizar comentarios"
ON public.comments FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Solo el autor o admin puede eliminar comentarios (simplificado: cualquiera autenticado)
CREATE POLICY "Solo usuarios autenticados pueden eliminar comentarios"
ON public.comments FOR DELETE
TO authenticated
USING (true);

-- 5. Actualizar constraint de category a tag en comics
-- Primero eliminamos el constraint anterior
ALTER TABLE public.comics DROP CONSTRAINT IF EXISTS comics_category_check;

-- Agregamos el nuevo constraint para tags
ALTER TABLE public.comics
ADD CONSTRAINT comics_tag_check
CHECK (tag IN ('Popular', 'Novedad', 'Éxitos', 'Más Descargados', 'Trending'));
