# 📲 Push de tomos nuevos — Guía de instalación (v0.5)

Notificación real en el celular aunque la app esté cerrada, cuando sube un
tomo de un cómic que el lector sigue. 4 pasos en el panel de Supabase + 1 en
el celu.

---

## Paso 1 — SQL: crear la tabla de suscripciones

Supabase → **SQL Editor** → pega el contenido de `add-push-subscriptions.sql`
(o solo esto) → Run:

```sql
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios pueden ver sus suscripciones push" ON public.push_subscriptions;
CREATE POLICY "Los usuarios pueden ver sus suscripciones push"
ON public.push_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden registrar sus suscripciones push" ON public.push_subscriptions;
CREATE POLICY "Los usuarios pueden registrar sus suscripciones push"
ON public.push_subscriptions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus suscripciones push" ON public.push_subscriptions;
CREATE POLICY "Los usuarios pueden actualizar sus suscripciones push"
ON public.push_subscriptions FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden borrar sus suscripciones push" ON public.push_subscriptions;
CREATE POLICY "Los usuarios pueden borrar sus suscripciones push"
ON public.push_subscriptions FOR DELETE TO authenticated
USING (auth.uid() = user_id);
```

## Paso 2 — Llaves VAPID (secrets)

Ya están generadas. Supabase → **Edge Functions** → pestaña **Secrets** →
agrega estas tres:

| Nombre | Valor |
|---|---|
| `VAPID_PUBLIC_KEY` | `BDciMswMYxXqQFvg55BTaOLQfZrO3gb9FX5lg3E18H7er2cI3vJ3c6jU6oZcTMgNpjBTrRnJbUrmOQU-S5FTZm0` |
| `VAPID_PRIVATE_KEY` | `blWe5F4yeI6TSuSB4J6Q3jq7HPmc5EZ-kMT5m9aUX_Q` |
| `VAPID_SUBJECT` | `mailto:tu-correo@ejemplo.com` |

⚠️ La **privada** NO se toca nunca: vive solo en los secrets. Si se filtra,
se regeneran las dos y se actualiza el secret (la pública del código está en
`src/lib/pushNotifications.ts`).

## Paso 3 — El Webhook (dispara el envío)

Supabase → **Database** → **Webhooks** → **Enable webhooks** (una vez) →
**Create a webhook**:

- **Name:** `notify-new-chapter`
- **Table:** `chapters`
- **Events:** ✅ INSERT (solo insert)
- Al guardarlo, Supabase crea una Edge Function (se llama tipo
  `handle_chapters_insert` o el nombre que elegiste).

Abre esa función recién creada (Edge Functions → tu función → código) y
**reemplaza TODO su contenido** por el contenido de
`supabase/functions/notify-new-chapter/index.ts` de este repo. **Deploy**.

## Paso 4 — Probar

1. En el celu (app instalada o navegador): inicia sesión → barra inferior →
   **"Más"** → **"Avisos de tomos nuevos"** → **Activar** → acepta el permiso.
2. Sigue un cómic (campanita en su tarjeta/ficha).
3. Sube un tomo nuevo a ese cómic desde el panel admin.
4. 🎉 El celu recibe: **"Nuevo tomo de {cómic} — Tomo N …"**. Tocarla abre la
   app directo en ese tomo.

## Solución de problemas

- **No llega nada:** revisa los logs de la función (Edge Functions → Logs).
  `sin seguidores` = nadie sigue ese cómic; `sin suscripciones` = el celu no
  se llegó a suscribir (o el SQL del paso 1 no se corrió).
- **iPhone:** el push solo funciona con la PWA **instalada** y iOS 16.4+.
- **Permiso bloqueado:** Ajustes del navegador → Notificaciones → permitir
  crow-comics.pages.dev.
- **Endpoint viejo:** la función poda automáticamente suscripciones muertas
  (404/410) al enviar.
