-- ==============================================================================
-- CROW COMICS: MIGRACIÓN COMPLETA — Agregar columnas faltantes
-- Ejecutar en Supabase → SQL Editor
-- Es seguro: usa IF NOT EXISTS / IF EXISTS, no borra datos
-- ==============================================================================

-- ── 1. TABLA comics ──────────────────────────────────────────────────────────

-- Agregar columna 'publisher'
ALTER TABLE public.comics
  ADD COLUMN IF NOT EXISTS publisher TEXT NOT NULL DEFAULT 'Independiente';

-- Agregar columna 'tag'
ALTER TABLE public.comics
  ADD COLUMN IF NOT EXISTS tag TEXT NOT NULL DEFAULT 'Novedad';

-- Agregar columna 'banner_url'
ALTER TABLE public.comics
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Agregar columna 'total_issues_label'
ALTER TABLE public.comics
  ADD COLUMN IF NOT EXISTS total_issues_label TEXT;

-- Agregar columna 'full_download_links'
ALTER TABLE public.comics
  ADD COLUMN IF NOT EXISTS full_download_links JSONB NOT NULL DEFAULT '[]'::JSONB;

-- ── 2. TABLA chapters ────────────────────────────────────────────────────────

-- Agregar columna 'cover_url'
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Agregar columna 'pages_count'
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS pages_count INTEGER;

-- Agregar columna 'pdf_url' (para leer online)
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- ── 3. TABLA characters ──────────────────────────────────────────────────────

-- Agregar columna 'name_spanish'
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS name_spanish TEXT;

-- ── 4. Refresca el schema cache de Supabase ──────────────────────────────────
-- Esto es necesario para que PostgREST detecte las nuevas columnas
NOTIFY pgrst, 'reload schema';
