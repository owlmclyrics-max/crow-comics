import { isSupabaseConfigured, supabase } from './supabase';

// ============================================================================
// NOTIFICACIONES PUSH (v0.5): aviso en el celu aunque la app esté cerrada
// cuando sube un tomo de un cómic que sigues.
//
// - El usuario se suscribe desde la hoja "Más" de la barra inferior móvil
//   (o donde se use este módulo): permiso + suscripción push + fila en la
//   tabla `push_subscriptions`.
// - La Edge Function `notify-new-chapter` (disparada por un Database Webhook
//   al insertarse un capítulo) lee los seguidores del cómic y les envía el
//   push con web-push usando las llaves VAPID (ver PUSH-SETUP.md).
// ============================================================================

/** Llave pública VAPID (la privada vive SOLO en los secrets de Supabase). */
export const VAPID_PUBLIC_KEY =
  'BDciMswMYxXqQFvg55BTaOLQfZrO3gb9FX5lg3E18H7er2cI3vJ3c6jU6oZcTMgNpjBTrRnJbUrmOQU-S5FTZm0';

export type PushState = 'unsupported' | 'denied' | 'subscribed' | 'default';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
};
/** ¿Este navegador puede recibir push? (iPhone: solo con la app instalada, iOS 16.4+) */
export const pushSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

/** Estado actual: sin soporte / permiso bloqueado / suscrito / por activar. */
export const getPushState = async (): Promise<PushState> => {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = registration ? await registration.pushManager.getSubscription() : null;
    return subscription ? 'subscribed' : 'default';
  } catch {
    return 'default';
  }
};

/** Pide permiso, suscribe el navegador del usuario y guarda la suscripción. */
export const enablePush = async (userId: string): Promise<void> => {
  if (!pushSupported()) {
    throw new Error('Este navegador no soporta notificaciones push');
  }
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase no está configurado');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('No diste permiso a las notificaciones');
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    throw new Error('El service worker aún no está listo, prueba en un rato');
  }

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const json = subscription.toJSON();
  const keys = (json.keys ?? {}) as Record<string, string>;
  const { endpoint } = json;
  const p256dh = keys.p256dh;
  const auth = keys.auth;
  if (!endpoint || !p256dh || !auth) {
    throw new Error('La suscripción llegó incompleta');
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: userId, endpoint, p256dh, auth },
    { onConflict: 'endpoint' },
  );
  if (error) throw new Error(error.message);
};

/** Cancela la suscripción: borra la fila y des-registra el navegador. */
export const disablePush = async (): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = registration ? await registration.pushManager.getSubscription() : null;
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  await subscription.unsubscribe().catch(() => {
    // Si el navegador no puede des-registrar, la fila ya no existe: el
    // servidor ignora endpoints muertos (410) y los poda.
  });
};
