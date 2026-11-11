-- ==============================================================================
-- CROW COMICS: SISTEMA DE VARIANTES DE PERSONAJES
-- ==============================================================================

-- 1. Crear Tabla de Variantes de Personajes
CREATE TABLE IF NOT EXISTS public.character_variants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    character_id UUID REFERENCES public.characters(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,                    -- Nombre de la variante (ej: "Absolute Black Canary")
    universe TEXT NOT NULL,               -- Universo / Continuidad (ej: "Absolute Universe")
    earth TEXT,                           -- Tierra (ej: "Tierra-616")
    image_url TEXT NOT NULL,              -- Imagen representativa
    description TEXT NOT NULL,           -- Descripción de la variante
    first_appearance TEXT,               -- Primera aparición
    differences TEXT,                    -- Diferencias / Características
    aliases TEXT,                        -- Alias de la variante (uno por línea)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Activar RLS
ALTER TABLE public.character_variants ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para Variantes
DROP POLICY IF EXISTS "Las variantes son públicas para lectura" ON public.character_variants;
CREATE POLICY "Las variantes son públicas para lectura"
ON public.character_variants FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Solo administradores pueden insertar variantes" ON public.character_variants;
CREATE POLICY "Solo administradores pueden insertar variantes"
ON public.character_variants FOR INSERT
TO authenticated
WITH CHECK (public.is_crow_admin());

DROP POLICY IF EXISTS "Solo administradores pueden actualizar variantes" ON public.character_variants;
CREATE POLICY "Solo administradores pueden actualizar variantes"
ON public.character_variants FOR UPDATE
TO authenticated
USING (public.is_crow_admin())
WITH CHECK (public.is_crow_admin());

DROP POLICY IF EXISTS "Solo administradores pueden eliminar variantes" ON public.character_variants;
CREATE POLICY "Solo administradores pueden eliminar variantes"
ON public.character_variants FOR DELETE
TO authenticated
USING (public.is_crow_admin());
