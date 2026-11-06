-- ==============================================================================
-- CROW COMICS: SUSCRIPCIONES PUSH (notificaciones de tomos nuevos en el celu)
-- ==============================================================================

-- 1. Tabla de suscripciones push del navegador.
--    Cada dispositivo del usuario se registra con su endpoint único;
--    la Edge Function notify-new-chapter lee esta tabla para enviar los pushes.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Activar RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Políticas: cada usuario administra SOLO sus suscripciones.
--    (La Edge Function usa la service role key, que ignora RLS.)
DROP POLICY IF EXISTS "Los usuarios pueden ver sus suscripciones push" ON public.push_subscriptions;
CREATE POLICY "Los usuarios pueden ver sus suscripciones push"
ON public.push_subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden registrar sus suscripciones push" ON public.push_subscriptions;
CREATE POLICY "Los usuarios pueden registrar sus suscripciones push"
ON public.push_subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus suscripciones push" ON public.push_subscriptions;
CREATE POLICY "Los usuarios pueden actualizar sus suscripciones push"
ON public.push_subscriptions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden borrar sus suscripciones push" ON public.push_subscriptions;
CREATE POLICY "Los usuarios pueden borrar sus suscripciones push"
ON public.push_subscriptions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
