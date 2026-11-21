/**
 * Centro de notificaciones (v0.10.6): seguimientos, mensajes, likes y
 * comentarios. La fila se inserta en el momento de la acción (el que la
 * genera firma como actor) y el destinatario la ve en su campana, en vivo
 * por Supabase Realtime.
 */
import { supabase, isSupabaseConfigured } from './supabase';

export type NotificationType = 'follow' | 'message' | 'like' | 'comment';

export interface NotificationItem {
  id: string;
  user_id: string;
  actor_id: string;
  type: NotificationType;
  body: string;
  read_at: string | null;
  created_at: string;
  actor_username: string;
  actor_avatar: string | null;
}

/** Inserta un aviso (best-effort: nunca rompe la acción original). */
export const pushNotification = async (
  targetId: string,
  actorId: string,
  type: NotificationType,
  body: string,
): Promise<void> => {
  if (!isSupabaseConfigured || !supabase || targetId === actorId) return;
  const { error } = await supabase
    .from('notifications')
    .insert({ user_id: targetId, actor_id: actorId, type, body });
  if (error) console.warn('No se pudo notificar:', error.message);
};

/** Últimas notificaciones con el perfil del actor (para avatar y nombre). */
export const fetchNotifications = async (meId: string, limit = 20): Promise<NotificationItem[]> => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
  const db = supabase;

  const { data, error } = await db
    .from('notifications')
    .select('id,user_id,actor_id,type,body,read_at,created_at')
    .eq('user_id', meId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`No se pudo leer las notificaciones: ${error.message}`);

  const rows = (data ?? []) as Array<{
    id: string;
    user_id: string;
    actor_id: string;
    type: NotificationType;
    body: string;
    read_at: string | null;
    created_at: string;
  }>;
  if (rows.length === 0) return [];

  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id)));
  const { data: profiles } = await db
    .from('profiles')
    .select('id,username,avatar_url')
    .in('id', actorIds);
  const byId = new Map(
    ((profiles ?? []) as Array<{ id: string; username: string; avatar_url: string | null }>).map(
      (p) => [p.id, p],
    ),
  );

  return rows.map((r) => ({
    ...r,
    actor_username: byId.get(r.actor_id)?.username ?? 'alguien',
    actor_avatar: byId.get(r.actor_id)?.avatar_url ?? null,
  }));
};

/** Cantidad sin leer (badge de la campana). */
export const fetchUnreadNotificationsCount = async (meId: string): Promise<number> => {
  if (!isSupabaseConfigured || !supabase) return 0;
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', meId)
    .is('read_at', null);
  if (error) return 0;
  return count ?? 0;
};

/** Marca TODAS las mías como leídas. */
export const markAllNotificationsRead = async (meId: string): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', meId)
    .is('read_at', null);
  if (error) console.warn('No se pudo marcar leídas:', error.message);
};

/**
 * Marca como leídas las notificaciones de tipo `message` de un actor
 * (se llama al abrir su chat, para que no queden acumuladas).
 */
export const markActorNotificationsRead = async (
  actorId: string,
  type: NotificationType,
): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('actor_id', actorId)
    .eq('type', type)
    .is('read_at', null);
  if (error) console.warn('No se pudo marcar leídas del actor:', error.message);
};

/** Realtime: notifica cada INSERT dirigido a mí. */
export const subscribeToNotifications = (
  meId: string,
  onInsert: () => void,
): (() => void) => {
  if (!isSupabaseConfigured || !supabase) return () => {};
  const db = supabase;
  const channel = db
    .channel(`notif-${meId.slice(0, 8)}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${meId}` },
      onInsert,
    )
    .subscribe();
  return () => {
    void db.removeChannel(channel);
  };
};
