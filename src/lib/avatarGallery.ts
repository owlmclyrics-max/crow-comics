import { supabase, isSupabaseConfigured } from './supabase';
import { readLocalJSON, writeLocalJSON } from './localStore';

// ==============================================================================
// SPRINT 4: GALERÍA DE AVATARES COMPARTIDA
// Los 8 avatares de fábrica + los que el admin añada ("modo desarrollador").
// La galería personalizada vive en la tabla app_config (key = avatar_gallery)
// para que TODOS los usuarios vean los mismos avatares; sin Supabase usa
// localStorage (modo demo).
// ==============================================================================

const LOCAL_KEY = 'crow_avatar_gallery_v1';

export const DEFAULT_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
];

/** Galería personalizada guardada por el admin (sin incluir los de fábrica). */
export const loadAvatarGallery = async (): Promise<string[]> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'avatar_gallery')
      .maybeSingle();

    if (!error && data) {
      const avatars = (data as { value?: { avatars?: string[] } }).value?.avatars;
      return Array.isArray(avatars) ? avatars : [];
    }
    if (error) {
      console.error('Error cargando galería de avatares:', error.message);
    }
    // Respaldo local mientras no exista la tabla app_config
    return readLocalJSON<string[]>(LOCAL_KEY, []);
  }

  return readLocalJSON<string[]>(LOCAL_KEY, []);
};

/**
 * Guarda la galería completa. Devuelve true si persistió en Supabase
 * (o en modo demo local) y false si solo quedó en este navegador.
 */
export const saveAvatarGallery = async (avatars: string[]): Promise<boolean> => {
  writeLocalJSON(LOCAL_KEY, avatars);

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('app_config')
      .upsert(
        {
          key: 'avatar_gallery',
          value: { avatars },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' },
      );
    if (error) {
      console.error('Error guardando galería de avatares:', error.message);
      return false;
    }
  }

  return true;
};
