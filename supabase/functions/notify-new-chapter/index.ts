// ============================================================================
// CROW COMICS — Edge Function: notify-new-chapter
// Envía una notificación push a los seguidores de un cómic cuando se inserta
// un capítulo nuevo. Se invoca desde un Database Webhook (INSERT en chapters).
// Ver PUSH-SETUP.md para la instalación paso a paso en el panel de Supabase.
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

interface ChapterRecord {
  id: string;
  comic_id: string;
  chapter_number: number;
  title: string;
}

interface WebhookPayload {
  type: string;
  table: string;
  record: ChapterRecord;
}

Deno.serve(async (req) => {
  try {
    const payload = (await req.json()) as WebhookPayload;

    // Solo nos interesa la inserción de capítulos.
    if (payload?.type !== 'INSERT' || payload?.table !== 'chapters' || !payload?.record?.comic_id) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const chapter = payload.record;

    // Service role: leer follows y suscripciones sin que RLS estorbe.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: comic } = await supabase
      .from('comics')
      .select('title')
      .eq('id', chapter.comic_id)
      .single();

    const comicTitle = comic?.title ?? 'un cómic que sigues';

    // ¿Quién sigue este cómic?
    const { data: follows, error: followsError } = await supabase
      .from('comic_follows')
      .select('user_id')
      .eq('comic_id', chapter.comic_id);

    if (followsError) throw new Error(`follows: ${followsError.message}`);
    const userIds = (follows ?? []).map((f) => f.user_id);
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'sin seguidores' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Suscripciones push de esos usuarios.
    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in('user_id', userIds);

    if (subsError) throw new Error(`push_subscriptions: ${subsError.message}`);
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'sin suscripciones' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@crow-comics.pages.dev';
    webpush.setVapidDetails(
      subject,
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!,
    );

    const message = JSON.stringify({
      title: `Nuevo tomo de ${comicTitle}`,
      body: `Tomo ${chapter.chapter_number} — ${chapter.title} ya está disponible`,
      url: `/#/vista?comic=${chapter.comic_id}&chapter=${chapter.id}`,
      tag: chapter.id,
    });

    let sent = 0;
    const staleIds: string[] = [];

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            message,
          );
          sent += 1;
        } catch (pushError) {
          // 404/410 = suscripción muerta: podar para no reintentar siempre.
          const status = (pushError as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) staleIds.push(sub.id);
        }
      }),
    );

    if (staleIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', staleIds);
    }

    return new Response(JSON.stringify({ sent, pruned: staleIds.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
