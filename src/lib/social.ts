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
import { pushNotification } from './notifications';

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
  // Aviso al seguido (best-effort, no rompe el follow si falla).
  void pushNotification(profileId, meId, 'follow', '');
  return true;
};

// ── SUGERENCIAS DE AMIGOS (v0.10.3) ─────────────────────────────────────────

export interface SuggestedProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  last_seen_at: string | null;
  online: boolean;
  /** Yo lo sigo. */
  isFollowing: boolean;
  /** Él me sigue a mí. */
  followsMe: boolean;
  /** Amistad mutua: los dos se siguen. */
  isFriend: boolean;
}

/**
 * Perfiles para la fila de Mensajes:
 *  1. AMIGOS (mutuos) primero — aunque no estén activos hace rato.
 *  2. El resto: los más activos recientemente (por heartbeat), con el
 *     icono "+" para agregarlos (seguirlos) desde la fila.
 */
export const fetchSuggestedProfiles = async (
  meId: string,
  limit = 10,
): Promise<SuggestedProfile[]> => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
  const db = supabase;

  // A quiénes sigo y quién me sigue (una pasada por cada uno).
  const [followingRes, followersRes] = await Promise.all([
    db.from('follows').select('following_id').eq('follower_id', meId).limit(100),
    db.from('follows').select('follower_id').eq('following_id', meId).limit(100),
  ]);
  if (followingRes.error || followersRes.error) {
    throw new Error('No se pudo leer los seguimientos');
  }
  const followingSet = new Set(
    ((followingRes.data ?? []) as Array<{ following_id: string }>).map((r) => r.following_id),
  );
  const followersSet = new Set(
    ((followersRes.data ?? []) as Array<{ follower_id: string }>).map((r) => r.follower_id),
  );

  const toSuggested = (r: {
    id: string;
    username: string;
    avatar_url: string | null;
    last_seen_at: string | null;
  }): SuggestedProfile => ({
    id: r.id,
    username: r.username,
    avatar_url: r.avatar_url,
    last_seen_at: r.last_seen_at,
    online: presenceOf(r.last_seen_at).online,
    isFollowing: followingSet.has(r.id),
    followsMe: followersSet.has(r.id),
    isFriend: followingSet.has(r.id) && followersSet.has(r.id),
  });

  const out: SuggestedProfile[] = [];
  const used = new Set<string>([meId]);

  // 1) Amigos mutuos (ordenados por actividad, los conectados primero).
  const mutual = [...followingSet].filter((id) => followersSet.has(id));
  if (mutual.length > 0) {
    const { data } = await db
      .from('profiles')
      .select('id,username,avatar_url,last_seen_at')
      .in('id', mutual);
    const rows = (data ?? [])
      .slice()
      .sort((a, b) => {
        const ta = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
        const tb = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
        return tb - ta;
      });
    for (const r of rows) {
      if (out.length >= limit) break;
      out.push(toSuggested(r));
      used.add(r.id);
    }
  }

  // 2) A quiénes seguís pero no son amigos mutuos (después de los amigos).
  let followingIds = [...followingSet].filter((id) => !followersSet.has(id));
  if (out.length < limit && followingIds.length > 0) {
    followingIds = followingIds.slice(0, limit - out.length + 10);
    const { data } = await db
      .from('profiles')
      .select('id,username,avatar_url,last_seen_at')
      .in('id', followingIds);
    const rows = ((data ?? []) as Array<{
      id: string;
      username: string;
      avatar_url: string | null;
      last_seen_at: string | null;
    }>)
      .slice()
      .sort((a, b) => {
        const ta = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
        const tb = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
        return tb - ta;
      });
    for (const r of rows) {
      if (out.length >= limit) break;
      if (used.has(r.id)) continue;
      out.push(toSuggested(r));
      used.add(r.id);
    }
  }

  // 3) Relleno final: perfiles activos recientes (con "+" para agregar).
  const remaining = limit - out.length;
  if (remaining > 0) {
    const { data } = await db
      .from('profiles')
      .select('id,username,avatar_url,last_seen_at')
      .neq('id', meId)
      .order('last_seen_at', { ascending: false, nullsFirst: false })
      .limit(remaining + 10);
    for (const r of (data ?? []) as Array<{
      id: string;
      username: string;
      avatar_url: string | null;
      last_seen_at: string | null;
    }>) {
      if (out.length >= limit) break;
      if (used.has(r.id)) continue;
      out.push(toSuggested(r));
      used.add(r.id);
    }
  }
  return out;
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
  void pushNotification(partnerId, meId, 'message', clean.slice(0, 140));
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
 * Tiempo real del chat: notifica INSERT/UPDATE donde participa `meId`.
 * `channelKey` evita que la lista y el chat abierto compartan canal.
 * Devuelve la función para desuscribirse.
 */
export const subscribeToDm = (
  meId: string,
  onMessage: (msg: DmMessage) => void,
  onInvalidate: () => void,
  channelKey = 'list',
): (() => void) => {
  if (!isSupabaseConfigured || !supabase) return () => {};
  const db = supabase;
  const channel = db
    .channel(`dm-${channelKey}-${meId.slice(0, 8)}`)
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
