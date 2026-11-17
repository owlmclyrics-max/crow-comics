/**
 * Red social Crow Comics (v0.10): follows, chat directo y presencia.
 *
 * - Follows: tabla `follows` (RLS: cada uno administra los suyos, lectura
 *   pública). Los contadores se calculan con count head:true, barato.
 * - Chat: tabla `dm_messages` 1 a 1. Enviar = insert con tu uid; leer =
 *   solo tus hilos. "Visto" = read_at del mensaje.
 * - Presencia: `profiles.last_seen_at` actualizado por heartbeat del
 *   navegador (AuthContext). En línea = visto hace < 3 minutos.
 */
import { supabase, isSupabaseConfigured } from './supabase';

// ── FOLLOWS ──────────────────────────────────────────────────────────────────

export interface FollowState {
  following: boolean;
  followers: number;
  followingCount: number;
}

export const fetchFollowState = async (
  profileId: string,
  meId: string | null,
): Promise<FollowState> => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');

  const [followersRes, followingRes, isFollowingRes] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileId),
    meId
      ? supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', meId)
          .eq('following_id', profileId)
      : Promise.resolve({ count: 0, error: null }),
  ]);

  if (followersRes.error || followingRes.error || (meId && isFollowingRes.error)) {
    throw new Error('No se pudo leer el seguimiento');
  }
  return {
    following: Boolean(isFollowingRes.count),
    followers: followersRes.count ?? 0,
    followingCount: followingRes.count ?? 0,
  };
};

/** Seguir o dejar de seguir. `following` = estado ANTES del toggle. */
export const toggleFollow = async (
  profileId: string,
  meId: string,
  following: boolean,
): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
  if (following) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', meId)
      .eq('following_id', profileId);
    if (error) throw new Error('No se pudo dejar de seguir');
    return false;
  }
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: meId, following_id: profileId });
  if (error) throw new Error('No se pudo seguir');
  return true;
};

// ── PRESENCIA ────────────────────────────────────────────────────────────────

const ONLINE_WINDOW_MS = 3 * 60 * 1000; // 3 minutos = "en línea"

/** Marca "estoy acá" (llamado por el heartbeat del AuthContext). */
export const touchPresence = async (userId: string): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('profiles')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) console.warn('No se pudo marcar presencia:', error.message);
};

/** ¿Está en línea? + etiqueta "hace X". */
export const presenceOf = (lastSeen?: string | null): { online: boolean; label: string } => {
  if (!lastSeen) return { online: false, label: '' };
  const seen = new Date(lastSeen).getTime();
  if (!Number.isFinite(seen)) return { online: false, label: '' };
  const diff = Date.now() - seen;
  if (diff < ONLINE_WINDOW_MS) return { online: true, label: 'En línea' };
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return { online: false, label: `hace ${minutes} min` };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { online: false, label: `hace ${hours} h` };
  const days = Math.floor(hours / 24);
  return { online: false, label: `hace ${days} d` };
};

// ── CHAT DIRECTO ─────────────────────────────────────────────────────────────

export interface DmConversation {
  partner_id: string;
  username: string;
  avatar_url: string | null;
  last_seen_at: string | null;
  last_body: string;
  last_at: string;
  last_is_mine: boolean;
  unread: number;
}

export interface DmMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

/** Lista de conversaciones (RPC segura por auth.uid()). */
export const fetchConversations = async (): Promise<DmConversation[]> => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
  const { data, error } = await supabase.rpc('get_dm_conversations');
  if (error) throw new Error(`No se pudo leer las conversaciones: ${error.message}`);
  return (data ?? []) as DmConversation[];
};

/** Total de mensajes sin leer (globo del navbar). */
export const fetchUnreadCount = async (): Promise<number> => {
  if (!isSupabaseConfigured || !supabase) return 0;
  const { data, error } = await supabase.rpc('get_dm_unread_count');
  if (error) return 0;
  return Number(data ?? 0);
};

/** Thread con alguien, ordenado de más viejo a más nuevo. */
export const fetchThread = async (partnerId: string, meId: string): Promise<DmMessage[]> => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
  const { data, error } = await supabase
    .from('dm_messages')
    .select('id,sender_id,recipient_id,body,created_at,read_at')
    .or(`and(sender_id.eq.${meId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${meId})`)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw new Error(`No se pudo leer el chat: ${error.message}`);
  return (data ?? []) as DmMessage[];
};

export const sendDmMessage = async (
  meId: string,
  partnerId: string,
  body: string,
): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
  const clean = body.trim().slice(0, 2000);
  if (!clean) return;
  const { error } = await supabase
    .from('dm_messages')
    .insert({ sender_id: meId, recipient_id: partnerId, body: clean });
  if (error) throw new Error(`No se pudo enviar: ${error.message}`);
};

/** Marca como leídos los mensajes que me llegaron de `partnerId`. */
export const markThreadRead = async (partnerId: string, meId: string): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('dm_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', meId)
    .eq('sender_id', partnerId)
    .is('read_at', null);
  if (error) console.warn('No se pudo marcar leído:', error.message);
};

/**
 * Tiempo real del chat: notifica INSERT donde participa `meId`.
 * Devuelve la función para desuscribirse.
 */
export const subscribeToDm = (
  meId: string,
  onMessage: (msg: DmMessage) => void,
  onInvalidate: () => void,
): (() => void) => {
  if (!isSupabaseConfigured || !supabase) return () => {};
  const db = supabase;
  const channel = db
    .channel(`dm-${meId.slice(0, 8)}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `recipient_id=eq.${meId}` },
      (payload) => onMessage(payload.new as DmMessage),
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `sender_id=eq.${meId}` },
      (payload) => onMessage(payload.new as DmMessage),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'dm_messages', filter: `sender_id=eq.${meId}` },
      () => onInvalidate(), // mi mensaje fue marcado como visto
    )
    .subscribe();
  return () => {
    void db.removeChannel(channel);
  };
};

/** Tiempo real del globo de no leídos en el navbar. */
export const subscribeToUnread = (
  meId: string,
  onInsert: () => void,
): (() => void) => {
  if (!isSupabaseConfigured || !supabase) return () => {};
  const db = supabase;
  const channel = db
    .channel(`dm-unread-${meId.slice(0, 8)}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `recipient_id=eq.${meId}` },
      onInsert,
    )
    .subscribe();
  return () => {
    void db.removeChannel(channel);
  };
};
