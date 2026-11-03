import { supabase, isSupabaseConfigured } from './supabase';
import type { Profile } from '../types/comic';

/**
 * Búsqueda pública de perfiles por username (buscador Ctrl+K).
 * La tabla profiles tiene SELECT público (RLS), así que funciona
 * con o sin sesión iniciada.
 */
export const searchProfiles = async (query: string, limit = 5): Promise<Profile[]> => {
  const q = query.trim();
  if (!isSupabaseConfigured || !supabase || !q) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio, prefs, created_at, updated_at')
    .ilike('username', `%${q}%`)
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
};

/**
 * Carga el perfil público de un usuario por id
 * (vista "PublicProfilePage" al hacer clic en un resultado del buscador).
 */
export const getProfileById = async (id: string): Promise<Profile | null> => {
  if (!isSupabaseConfigured || !supabase || !id) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    // PGRST116 = ninguna fila (perfil eliminado): devolvemos null, no error
    if ((error as { code?: string }).code === 'PGRST116') return null;
    throw new Error(error.message);
  }

  return data as Profile;
};

/**
 * Ids de cómics favoritos de un usuario, vía RPC seguro que respeta su
 * configuración de privacidad (show_favorites en user_settings).
 * Devuelve `null` si el usuario tiene sus favoritos en privado.
 */
export const getPublicFavoriteIds = async (userId: string): Promise<string[] | null> => {
  if (!isSupabaseConfigured || !supabase || !userId) return [];

  const { data, error } = await supabase.rpc('get_public_favorites', {
    p_user_id: userId,
  });

  if (error) throw new Error(error.message);
  return (data as string[] | null) ?? null;
};
