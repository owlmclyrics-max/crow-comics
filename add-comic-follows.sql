-- ==============================================================================
-- CROW COMICS: SEGUIR CÓMICS (avisos de tomo/capítulo nuevo)
-- ==============================================================================

-- 1. Tabla de seguidores de cómics.
--    last_seen_at: última vez que el usuario visitó el cómic. Los capítulos
--    con created_at > last_seen_at son "nuevos" para esa persona.
CREATE TABLE IF NOT EXISTS public.comic_follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    comic_id UUID REFERENCES public.comics(id) ON DELETE CASCADE NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, comic_id)
);

-- 2. Activar RLS
ALTER TABLE public.comic_follows ENABLE ROW LEVEL SECURITY;

-- 3. Políticas: cada usuario ve/edita SOLO sus propios follows
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios follows" ON public.comic_follows;
CREATE POLICY "Los usuarios pueden ver sus propios follows"
ON public.comic_follows FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden seguir cómics" ON public.comic_follows;
CREATE POLICY "Los usuarios pueden seguir cómics"
ON public.comic_follows FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus follows" ON public.comic_follows;
CREATE POLICY "Los usuarios pueden actualizar sus follows"
ON public.comic_follows FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden dejar de seguir" ON public.comic_follows;
CREATE POLICY "Los usuarios pueden dejar de seguir"
ON public.comic_follows FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Índice para las consultas de la campana
CREATE INDEX IF NOT EXISTS idx_comic_follows_user ON public.comic_follows(user_id);
