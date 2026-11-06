import { isSupabaseConfigured, supabase } from './supabase';
import type { Chapter, Comic } from '../types/comic';

// ============================================================================
// SEGUIR CÓMICS: tabla `comic_follows` (ver add-comic-follows.sql).
// Cada fila guarda la última vez que el usuario vio el cómic (last_seen_at);
// los capítulos con created_at posterior son "nuevos" para esa persona.
// ============================================================================

export interface FollowRow {
  user_id: string;
  comic_id: string;
  last_seen_at: string;
  created_at: string;
}

export const getFollows = async (userId: string): Promise<FollowRow[]> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('comic_follows')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) return data as FollowRow[];
    console.error('Error cargando cómics seguidos:', error?.message);
    return [];
  }
  return [];
};

export const insertFollow = async (userId: string, comicId: string): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('comic_follows')
      .insert({ user_id: userId, comic_id: comicId });
    if (error) throw error;
  }
};

export const deleteFollow = async (userId: string, comicId: string): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('comic_follows')
      .delete()
      .eq('user_id', userId)
      .eq('comic_id', comicId);
    if (error) throw error;
  }
};

/** Marca el cómic como "ya visitado": los capítulos actuales dejan de ser nuevos. */
export const markFollowSeen = async (userId: string, comicId: string): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('comic_follows')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('comic_id', comicId);
    if (error) throw error;
  }
};

/** Capítulos del cómic subidos DESPUÉS de la última visita (sin marca = ninguno). */
export const newChaptersOf = (comic: Comic, lastSeenAt: string | undefined): Chapter[] => {
  if (!lastSeenAt) return [];
  const seen = new Date(lastSeenAt).getTime();
  if (Number.isNaN(seen)) return [];
  return (comic.chapters ?? []).filter((chapter) => {
    if (!chapter.created_at) return false;
    const created = new Date(chapter.created_at).getTime();
    return !Number.isNaN(created) && created > seen;
  });
};
