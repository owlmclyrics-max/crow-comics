-- ==============================================================================
-- CROW COMICS: CONTEOS PÚBLICOS DE LECTURA (para etiquetas automáticas)
-- ==============================================================================
-- Las etiquetas automáticas (Novedad / Popular / Trending / Éxitos) necesitan
-- saber cuánta gente leyó cada cómic. La tabla reading_progress es privada
-- (RLS: cada usuario solo ve sus filas), así que NO se puede contar entre
-- usuarios desde la web. Igual que con los favoritos públicos
-- (make-favorites-public.sql), creamos una función RPC SECURITY DEFINER que
-- devuelve SOLO números agregados por cómic: nada de quién leyó qué.
--
-- Devuelve por cada comic_id:
--   total_reads   → lecturas de siempre (para Éxitos)
--   weekly_reads  → lecturas de los últimos 7 días (para Popular)
--   monthly_reads → lecturas de los últimos 30 días (para Trending)
--
-- Ejecutar en el SQL Editor de Supabase.

CREATE OR REPLACE FUNCTION public.get_public_read_counts()
RETURNS TABLE (
  comic_id      UUID,
  total_reads   BIGINT,
  weekly_reads  BIGINT,
  monthly_reads BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    rp.comic_id,
    COUNT(*) AS total_reads,
    COUNT(*) FILTER (WHERE rp.updated_at >= now() - interval '7 days')  AS weekly_reads,
    COUNT(*) FILTER (WHERE rp.updated_at >= now() - interval '30 days') AS monthly_reads
  FROM public.reading_progress rp
  GROUP BY rp.comic_id;
$$;

-- Lectura pública de la función (con o sin sesión iniciada)
GRANT EXECUTE ON FUNCTION public.get_public_read_counts() TO anon, authenticated;
