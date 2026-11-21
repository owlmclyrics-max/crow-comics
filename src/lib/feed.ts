/**
 * Feed de Momentos (v0.10.1) — estilo Instagram pero solo texto.
 *
 * Posts de texto (reseñas, recomendaciones, lo que se te ocurra del mundo
 * cómic). Likes sin duplicados y comentarios. Todo va a tablas con RLS:
 * cada uno escribe solo lo suyo. Sin fotos — el storage queda para los
 * tomos (1 GB no da para memes 😄).
 */
import { supabase, isSupabaseConfigured } from './supabase';
import { pushNotification } from './notifications';

export interface FeedPost {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  body: string;
  created_at: string;
  likes: number;
  comments: number;
  liked_by_me: boolean;
}

export interface FeedComment {
  id: string;
  post_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  body: string;
  created_at: string;
}

/** El feed armado (RPC: contadores + liked_by_me correctos). */
export const fetchFeed = async (limit = 30): Promise<FeedPost[]> => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
  const db = supabase;
  const { data, error } = await db.rpc('get_feed_posts', { p_limit: limit });
  if (error) throw new Error(`No se pudo leer el feed: ${error.message}`);
  return (data ?? []) as FeedPost[];
};

/** Publica un momento/reseña (solo texto). */
export const createFeedPost = async (meId: string, body: string): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
  const db = supabase;
  const clean = body.trim().slice(0, 1000);
  if (!clean) throw new Error('Escribí algo antes de publicar');
  const { error } = await db
    .from('community_posts')
    .insert({ user_id: meId, body: clean });
  if (error) {
    throw new Error(`No se pudo publicar: ${error.message}`);
  }
};

/** Da o saca el ❤️. Devuelve el nuevo estado (true = con like). */
export const togglePostLike = async (
  postId: string,
  meId: string,
  liked: boolean,
  ownerId?: string,
): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
  const db = supabase;
  if (liked) {
    const { error } = await db.from('community_likes').delete().eq('post_id', postId).eq('user_id', meId);
    if (error) throw new Error('No se pudo quitar el like');
    return false;
  }
  const { error } = await db.from('community_likes').insert({ post_id: postId, user_id: meId });
  if (error) throw new Error('No se pudo dar like');
  if (ownerId) void pushNotification(ownerId, meId, 'like', '');
  return true;
};

/** Comentarios de un post (con nombre/avatar de quien escribió). */
export const fetchPostComments = async (postId: string): Promise<FeedComment[]> => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
  const db = supabase;
  const { data, error } = await db
    .from('community_comments')
    .select('id,post_id,user_id,body,created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw new Error(`No se pudo leer los comentarios: ${error.message}`);
  const rows = (data ?? []) as Array<{
    id: string;
    post_id: string;
    user_id: string;
    body: string;
    created_at: string;
  }>;
  if (rows.length === 0) return [];

  // Segunda pasada: perfiles de quienes comentaron (sin depender de FKs).
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: profilesData } = await db
    .from('profiles')
    .select('id,username,avatar_url')
    .in('id', userIds);
  const profileById = new Map(
    ((profilesData ?? []) as Array<{ id: string; username: string; avatar_url: string | null }>).map(
      (p) => [p.id, p],
    ),
  );

  return rows.map((row) => ({
    id: row.id,
    post_id: row.post_id,
    user_id: row.user_id,
    username: profileById.get(row.user_id)?.username ?? 'usuario',
    avatar_url: profileById.get(row.user_id)?.avatar_url ?? null,
    body: row.body,
    created_at: row.created_at,
  }));
};

export const addPostComment = async (
  postId: string,
  meId: string,
  body: string,
  ownerId?: string,
): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
  const db = supabase;
  const clean = body.trim().slice(0, 500);
  if (!clean) return;
  const { error } = await db
    .from('community_comments')
    .insert({ post_id: postId, user_id: meId, body: clean });
  if (error) throw new Error(`No se pudo comentar: ${error.message}`);
  if (ownerId) void pushNotification(ownerId, meId, 'comment', clean.slice(0, 140));
};

/** Borra tu momento. */
export const deleteFeedPost = async (postId: string, meId: string): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
  const db = supabase;
  const { error } = await db.from('community_posts').delete().eq('id', postId).eq('user_id', meId);
  if (error) throw new Error('No se pudo borrar el momento');
};
