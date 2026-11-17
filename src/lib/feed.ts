/**
 * Feed de Momentos (v0.10.1) — estilo Instagram.
 *
 * Posts con texto y/o foto (la foto se comprime a WebP 1280px en el
 * navegador antes de subir al bucket "community"), likes sin duplicados
 * y comentarios. Todo va a tablas con RLS: cada uno escribe solo lo suyo.
 */
import { supabase, isSupabaseConfigured } from './supabase';

export interface FeedPost {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  body: string;
  image_url: string | null;
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

const MAX_IMAGE_DIM = 1280;
const WEBP_QUALITY = 0.82;

/** El feed armado (RPC: contadores + liked_by_me correctos). */
export const fetchFeed = async (limit = 30): Promise<FeedPost[]> => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
  const db = supabase;
  const { data, error } = await db.rpc('get_feed_posts', { p_limit: limit });
  if (error) throw new Error(`No se pudo leer el feed: ${error.message}`);
  return (data ?? []) as FeedPost[];
};

/** Comprime una imagen a WebP (máx 1280px) en el navegador. */
export const compressFeedImage = async (file: File): Promise<Blob> => {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no disponible');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const webp = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY),
    );
    if (!webp) throw new Error('No se pudo comprimir la imagen');
    return webp;
  } finally {
    bitmap.close();
  }
};

/** Publica un momento: texto obligatorio, foto opcional. */
export const createFeedPost = async (
  meId: string,
  body: string,
  imageFile?: File | null,
): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
  const db = supabase;
  const clean = body.trim().slice(0, 1000);
  if (!clean) throw new Error('Escribí algo antes de publicar');

  let imageUrl: string | null = null;
  if (imageFile) {
    const webp = await compressFeedImage(imageFile);
    const name = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.webp`;
    const path = `posts/${meId}/${name}`;
    const { error: upErr } = await db.storage
      .from('community')
      .upload(path, webp, { contentType: 'image/webp', upsert: false });
    if (upErr) throw new Error(`No se pudo subir la foto: ${upErr.message}`);
    imageUrl = db.storage.from('community').getPublicUrl(path).data.publicUrl;
  }

  const { error } = await db
    .from('community_posts')
    .insert({ user_id: meId, body: clean, image_url: imageUrl });
  if (error) {
    throw new Error(`No se pudo publicar: ${error.message}`);
  }
};

/** Da o saca el ❤️. Devuelve el nuevo estado (true = con like). */
export const togglePostLike = async (postId: string, meId: string, liked: boolean): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
  const db = supabase;
  if (liked) {
    const { error } = await db.from('community_likes').delete().eq('post_id', postId).eq('user_id', meId);
    if (error) throw new Error('No se pudo quitar el like');
    return false;
  }
  const { error } = await db.from('community_likes').insert({ post_id: postId, user_id: meId });
  if (error) throw new Error('No se pudo dar like');
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

export const addPostComment = async (postId: string, meId: string, body: string): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
  const db = supabase;
  const clean = body.trim().slice(0, 500);
  if (!clean) return;
  const { error } = await db
    .from('community_comments')
    .insert({ post_id: postId, user_id: meId, body: clean });
  if (error) throw new Error(`No se pudo comentar: ${error.message}`);
};

/** Borra tu momento (la foto del bucket, best-effort). */
export const deleteFeedPost = async (postId: string, meId: string): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
  const db = supabase;
  const { data: post } = await db
    .from('community_posts')
    .select('image_url')
    .eq('id', postId)
    .eq('user_id', meId)
    .maybeSingle();
  if (post?.image_url) {
    const match = /\/object\/public\/community\/(.+)$/.exec(post.image_url);
    if (match) {
      void db.storage.from('community').remove([match[1]]);
    }
  }
  const { error } = await db.from('community_posts').delete().eq('id', postId).eq('user_id', meId);
  if (error) throw new Error('No se pudo borrar el momento');
};
