-- ==============================================================================
-- CROW COMICS: AGREGAR TABLA DE FAVORITOS
-- ==============================================================================

-- 1. Crear Tabla de Favoritos
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    comic_id UUID REFERENCES public.comics(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, comic_id)
);

-- 2. Activar RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para Favoritos
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios favoritos" ON public.favorites;
CREATE POLICY "Los usuarios pueden ver sus propios favoritos"
ON public.favorites FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios favoritos" ON public.favorites;
CREATE POLICY "Los usuarios pueden insertar sus propios favoritos"
ON public.favorites FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios favoritos" ON public.favorites;
CREATE POLICY "Los usuarios pueden eliminar sus propios favoritos"
ON public.favorites FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
