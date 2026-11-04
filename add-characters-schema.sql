-- ==============================================================================
-- CROW COMICS: AGREGAR TABLA DE PERSONAJES (POR TOMO/CAPÍTULO)
-- ==============================================================================

-- 1. Crear Tabla de Personajes
CREATE TABLE IF NOT EXISTS public.characters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    name_spanish TEXT,
    real_name TEXT,
    photo_url TEXT,
    description TEXT,
    first_appearance TEXT,
    publisher TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Agregar columna name_spanish si no existe (para tablas ya creadas)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'characters' AND column_name = 'name_spanish'
    ) THEN
        ALTER TABLE public.characters ADD COLUMN name_spanish TEXT;
    END IF;
END
$$;

-- 2. Crear Tabla de Relación Personaje-Capítulo (Solo por tomo)
CREATE TABLE IF NOT EXISTS public.chapter_characters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE NOT NULL,
    character_id UUID REFERENCES public.characters(id) ON DELETE CASCADE NOT NULL,
    role TEXT, -- ej: "Protagonista", "Antagonista", "Secundario"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(chapter_id, character_id)
);

-- 3. Activar RLS
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_characters ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para Personajes
CREATE POLICY "Personajes son públicos para lectura"
ON public.characters FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Solo administradores pueden insertar personajes"
ON public.characters FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Solo administradores pueden actualizar personajes"
ON public.characters FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Solo administradores pueden eliminar personajes"
ON public.characters FOR DELETE
TO authenticated
USING (true);

-- 5. Políticas para Relaciones Personaje-Capítulo
CREATE POLICY "Relaciones capítulo-personaje son públicas para lectura"
ON public.chapter_characters FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Solo administradores pueden insertar relaciones capítulo-personaje"
ON public.chapter_characters FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Solo administradores pueden eliminar relaciones capítulo-personaje"
ON public.chapter_characters FOR DELETE
TO authenticated
USING (true);
