-- ==============================================================================
-- CROW COMICS: FAVORITOS PÚBLICOS (para la vista de perfil público)
-- ==============================================================================
-- En lugar de abrir la tabla favorites al mundo (RLS público expondría TODAS
-- las filas), creamos una función RPC SECURITY DEFINER que:
--   1. Devuelve los comic_id favoritos del usuario pedido.
--   2. SOLO si ese usuario tiene show_favorites = true en user_settings
--      (o si nunca configuró privacidad → default público, igual que la app).
--   3. Devuelve NULL si sus favoritos son privados → la UI muestra el aviso.
--
-- Ejecutar en el SQL Editor de Supabase.

CREATE OR REPLACE FUNCTION public.get_public_favorites(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(
      (SELECT ps.show_favorites FROM public.user_settings ps WHERE ps.user_id = p_user_id),
      TRUE -- sin configuración → default público (DEFAULT_PRIVACY de la app)
    )
    THEN COALESCE(
      (SELECT jsonb_agg(f.comic_id) FROM public.favorites f WHERE f.user_id = p_user_id),
      '[]'::jsonb
    )
    ELSE NULL -- favoritos privados
  END;
$$;

-- Lectura pública de la función (con o sin sesión iniciada)
GRANT EXECUTE ON FUNCTION public.get_public_favorites(UUID) TO anon, authenticated;
