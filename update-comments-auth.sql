-- ==============================================================================
-- CROW COMICS: ACTUALIZAR TABLA DE COMENTARIOS PARA USAR PROFILE
-- ==============================================================================

-- Agregar columna user_id si no existe
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Actualizar políticas para requerir autenticación
-- (primero eliminamos las políticas viejas permisivas del SQL anterior:
--  en Postgres las políticas permissivas se SUMAN, así que si queda la
--  antigua "WITH CHECK (true)" seguirían pudiendo comentar sin cuenta)
DROP POLICY IF EXISTS "Solo usuarios autenticados pueden insertar comentarios" ON public.comments;
DROP POLICY IF EXISTS "Solo usuarios autenticados pueden actualizar comentarios" ON public.comments;
DROP POLICY IF EXISTS "Solo usuarios autenticados pueden eliminar comentarios" ON public.comments;
DROP POLICY IF EXISTS "Solo autenticados pueden comentar" ON public.comments;
DROP POLICY IF EXISTS "Solo autenticados pueden eliminar sus comentarios" ON public.comments;

CREATE POLICY "Solo autenticados pueden comentar"
ON public.comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Solo autenticados pueden eliminar sus comentarios"
ON public.comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
