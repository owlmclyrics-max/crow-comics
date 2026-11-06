-- ==============================================================================
-- CROW COMICS: TRIGGER DE PUSH AL SUBIR UN TOMO (reemplaza el Webhook del panel)
-- ==============================================================================
-- Cuando se INSERTA un capítulo, dispara la Edge Function notify-new-chapter,
-- que avisa por push a los seguidores del cómic (ver PUSH-SETUP.md).
-- Requiere antes:
--   1. La Edge Function "notify-new-chapter" desplegada (código en
--      supabase/functions/notify-new-chapter/index.ts).
--   2. El secret WEBHOOK_SECRET configurado (igual al de este archivo).
-- ==============================================================================

-- 1. pg_net: permite a la base hacer llamadas HTTP (a nuestra propia función).
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Función del trigger: arma el payload estilo webhook y llama a la función.
CREATE OR REPLACE FUNCTION public.notify_new_chapter_hook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://zllafdlsatueezldoxlh.supabase.co/functions/v1/notify-new-chapter',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '6c260beef6094d9195be793d09fa0a4e218277dc0bf640ee8bc6bd62f98b77cb'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'chapters',
      'record', to_jsonb(NEW)
    ),
    timeout_msec := 15000
  );
  RETURN NEW;
END;
$$;

-- 3. El trigger: cada INSERT en chapters dispara el envío.
DROP TRIGGER IF EXISTS chapters_notify_new_chapter ON public.chapters;
CREATE TRIGGER chapters_notify_new_chapter
AFTER INSERT ON public.chapters
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_chapter_hook();
