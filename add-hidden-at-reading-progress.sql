-- ==============================================================================
-- CROW COMICS: "CONTINUAR LEYENDO" INDEPENDIENTE DEL HISTORIAL (estilo Netflix)
-- ==============================================================================
-- hidden_at marca el tomo como OCULTO de la fila "Continuar Leyendo" sin
-- borrarlo: el historial del perfil conserva TODOS los tomos abiertos.
-- - Quitar con la "X" de Continuar Leyendo  → hidden_at = ahora
-- - "Marcar como leído" / "Finalizado"      → hidden_at = ahora
-- - Volver a abrir el tomo                  → hidden_at = NULL (regresa a Continuar)
-- - Borrar desde el historial               → DELETE real (desaparece de todo)

ALTER TABLE public.reading_progress
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;
