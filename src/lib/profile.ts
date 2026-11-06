import { supabase, isSupabaseConfigured } from './supabase';
import { readLocalJSON, writeLocalJSON } from './localStore';

// ==============================================================================
// SPRINT 1: Capa de datos del perfil de usuario (favoritos, historial,
// listas y ajustes de privacidad). Con Supabase configurado usa las tablas
// protegidas con RLS; sin credenciales recurre a localStorage (modo demo).
// ==============================================================================

const LOCAL_KEYS = {
  favorites: 'crow_favorites_local_v1',
  readingProgress: 'crow_reading_progress_local_v1',
  readingLists: 'crow_reading_lists_local_v1',
  privacy: 'crow_privacy_settings_local_v1',
} as const;

// ------------------------------ Tipos ------------------------------

export interface FavoriteRow {
  id: string;
  user_id: string;
  comic_id: string;
  created_at: string;
}

export interface ReadingProgressRow {
  id: string;
  user_id: string;
  comic_id: string;
  chapter_id: string;
  chapter_number: number;
  /** Sprint 3.5: marcador manual de página (0 = sin marcador). */
  page_number?: number;
  completed: boolean;
  updated_at: string;
  /** Netflix-style: con marca, el tomo sale de "Continuar Leyendo" pero
      SIGUE en el historial. Solo el borrado explícito lo elimina de ambos. */
  hidden_at?: string | null;
}

export interface ReadingListRow {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  /** Sprint 3: colección oficial del sitio (solo la marcan los admins desde Supabase). */
  is_featured?: boolean;
  created_at: string;
}

export interface ReadingListItemRow {
  id: string;
  list_id: string;
  comic_id: string;
  added_at: string;
}

export interface PrivacySettings {
  profilePublic: boolean;
  showFavorites: boolean;
  showActivity: boolean;
}

export const DEFAULT_PRIVACY: PrivacySettings = {
  profilePublic: true,
  showFavorites: true,
  showActivity: true,
};

const uid = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

// ------------------------------ Favoritos ------------------------------

export const getFavorites = async (userId: string): Promise<FavoriteRow[]> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) return data as FavoriteRow[];
    console.error('Error cargando favoritos:', error?.message);
    return [];
  }

  // Modo demo: filtramos el almacenamiento local por usuario
  return readLocalJSON<FavoriteRow[]>(LOCAL_KEYS.favorites, []).filter((r) => r.user_id === userId);
};

export const toggleFavorite = async (userId: string, comicId: string): Promise<{ isFavorite: boolean }> => {
  if (isSupabaseConfigured && supabase) {
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('comic_id', comicId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('favorites').delete().eq('id', (existing as { id: string }).id);
      if (error) throw error;
      return { isFavorite: false };
    }

    const { error } = await supabase.from('favorites').insert({ user_id: userId, comic_id: comicId });
    if (error) throw error;
    return { isFavorite: true };
  }

  // Modo demo
  const all = readLocalJSON<FavoriteRow[]>(LOCAL_KEYS.favorites, []);
  const index = all.findIndex((r) => r.user_id === userId && r.comic_id === comicId);
  if (index >= 0) {
    all.splice(index, 1);
    writeLocalJSON(LOCAL_KEYS.favorites, all);
    return { isFavorite: false };
  }
  all.unshift({ id: uid(), user_id: userId, comic_id: comicId, created_at: new Date().toISOString() });
  writeLocalJSON(LOCAL_KEYS.favorites, all);
  return { isFavorite: true };
};

// ------------------------------ Progreso de lectura ------------------------------

export const getReadingProgress = async (userId: string): Promise<ReadingProgressRow[]> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!error && data) return data as ReadingProgressRow[];
    console.error('Error cargando progreso de lectura:', error?.message);
    return [];
  }

  return readLocalJSON<ReadingProgressRow[]>(LOCAL_KEYS.readingProgress, [])
    .filter((r) => r.user_id === userId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
};

/**
 * Sprint 3.5: historial de lectura de un cómic concreto (por capítulo),
 * ordenado del más reciente al más antiguo. Sirve para pintar el marcador
 * ("Continúas aquí") en las fichas de capítulos del detalle del cómic.
 */
export const getReadingProgressForComic = async (
  userId: string,
  comicId: string,
): Promise<ReadingProgressRow[]> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('comic_id', comicId)
      .order('updated_at', { ascending: false });
    if (!error && data) return data as ReadingProgressRow[];
    console.error('Error cargando progreso del cómic:', error?.message);
    return [];
  }

  return readLocalJSON<ReadingProgressRow[]>(LOCAL_KEYS.readingProgress, [])
    .filter((r) => r.user_id === userId && r.comic_id === comicId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
};

/**
 * Sprint 3.5: devuelve el registro de progreso de un capítulo concreto
 * (para mostrar el marcador de página al reabrir el tomo).
 */
export const getReadingProgressForChapter = async (
  userId: string,
  chapterId: string,
): Promise<ReadingProgressRow | null> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .maybeSingle();
    if (!error && data) return data as ReadingProgressRow;
    console.error('Error cargando marcador del tomo:', error?.message);
    return null;
  }

  return (
    readLocalJSON<ReadingProgressRow[]>(LOCAL_KEYS.readingProgress, []).find(
      (r) => r.user_id === userId && r.chapter_id === chapterId,
    ) ?? null
  );
};

/**
 * Registra (o actualiza) el último capítulo leído de un cómic.
 * Sprint 3.5: `pageNumber` opcional guarda el marcador manual del usuario.
 * Si queda undefined, se OMITE del payload: el upsert automático al abrir un
 * tomo así nunca pisa un marcador ya guardado en Supabase.
 */
export const saveReadingProgress = async (
  userId: string,
  comicId: string,
  chapterId: string,
  chapterNumber: number,
  pageNumber?: number,
): Promise<void> => {
  const now = new Date().toISOString();
  const hasMarker = typeof pageNumber === 'number' && pageNumber > 0;

  if (isSupabaseConfigured && supabase) {
    // upsert gracias a la restricción unique (user_id, chapter_id).
    // Solo actualizamos las columnas enviadas: si pageNumber no viene,
    // un page_number existente se conserva intacto.
    const { error } = await supabase.from('reading_progress').upsert(
      {
        user_id: userId,
        comic_id: comicId,
        chapter_id: chapterId,
        chapter_number: chapterNumber,
        ...(hasMarker ? { page_number: pageNumber } : {}),
        // Volver a leer un tomo lo regresa a "Continuar Leyendo".
        hidden_at: null,
        updated_at: now,
      },
      { onConflict: 'user_id,chapter_id' },
    );
    // Propagamos el error para que la UI (toast rojo) avise de verdad,
    // p. ej. falta de la columna page_number (correr add-page-number.sql).
    if (error) throw new Error(error.message);
    return;
  }

  const all = readLocalJSON<ReadingProgressRow[]>(LOCAL_KEYS.readingProgress, []);
  const existing = all.find((r) => r.user_id === userId && r.chapter_id === chapterId);
  if (existing) {
    existing.chapter_number = chapterNumber;
    if (hasMarker) existing.page_number = pageNumber;
    existing.hidden_at = null;
    existing.updated_at = now;
  } else {
    all.unshift({
      id: uid(),
      user_id: userId,
      comic_id: comicId,
      chapter_id: chapterId,
      chapter_number: chapterNumber,
      ...(hasMarker ? { page_number: pageNumber } : {}),
      completed: false,
      hidden_at: null,
      updated_at: now,
    });
  }
  writeLocalJSON(LOCAL_KEYS.readingProgress, all);
};

/**
 * Sprint 2.5: elimina un registro de progreso concreto (usuario + capítulo).
 * Se usa en "Marcar como leído" y al pasar al siguiente tomo, para que el
 * capítulo finalizado deje de aparecer en la fila "Continuar Leyendo".
 */
export const deleteReadingProgress = async (userId: string, chapterId: string): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    // La RLS garantiza que solo se borran filas del propio usuario
    const { error } = await supabase
      .from('reading_progress')
      .delete()
      .eq('user_id', userId)
      .eq('chapter_id', chapterId);
    // Propagamos para que la UI avise (toast rojo) si el borrado falla.
    if (error) throw new Error(error.message);
    return;
  }

  writeLocalJSON(
    LOCAL_KEYS.readingProgress,
    readLocalJSON<ReadingProgressRow[]>(LOCAL_KEYS.readingProgress, [])
      .filter((r) => !(r.user_id === userId && r.chapter_id === chapterId)),
  );
};

/**
 * Sprint 2.5: elimina un registro de progreso por su id de fila.
 * BORRADO REAL (usuario+capítulo fuera del historial y de todo).
 */
export const deleteReadingProgressRow = async (rowId: string): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('reading_progress').delete().eq('id', rowId);
    if (error) console.error('Error eliminando registro de progreso:', error.message);
    return;
  }

  writeLocalJSON(
    LOCAL_KEYS.readingProgress,
    readLocalJSON<ReadingProgressRow[]>(LOCAL_KEYS.readingProgress, []).filter((r) => r.id !== rowId),
  );
};

/**
 * Netflix-style: OCULTAR un tomo de "Continuar Leyendo" SIN borrarlo del
 * historial. La fila queda con hidden_at y el historial la conserva.
 */
export const hideReadingProgress = async (userId: string, chapterId: string): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('reading_progress')
      .update({ hidden_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('chapter_id', chapterId);
    if (error) throw new Error(error.message);
    return;
  }

  writeLocalJSON(
    LOCAL_KEYS.readingProgress,
    readLocalJSON<ReadingProgressRow[]>(LOCAL_KEYS.readingProgress, []).map((r) =>
      r.user_id === userId && r.chapter_id === chapterId ? { ...r, hidden_at: new Date().toISOString() } : r,
    ),
  );
};

/** Igual que hideReadingProgress pero por id de fila (la "X" de las tarjetas). */
export const hideReadingProgressRow = async (rowId: string): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('reading_progress')
      .update({ hidden_at: new Date().toISOString() })
      .eq('id', rowId);
    if (error) console.error('Error ocultando registro de progreso:', error.message);
    return;
  }

  writeLocalJSON(
    LOCAL_KEYS.readingProgress,
    readLocalJSON<ReadingProgressRow[]>(LOCAL_KEYS.readingProgress, []).map((r) =>
      r.id === rowId ? { ...r, hidden_at: new Date().toISOString() } : r,
    ),
  );
};

// ------------------------------ Listas de lectura ------------------------------

export const getReadingLists = async (userId: string): Promise<ReadingListRow[]> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('reading_lists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (!error && data) return data as ReadingListRow[];
    console.error('Error cargando listas:', error?.message);
    return [];
  }

  return readLocalJSON<ReadingListRow[]>(LOCAL_KEYS.readingLists, []).filter((r) => r.user_id === userId);
};

export const createReadingList = async (
  userId: string,
  name: string,
  description = '',
): Promise<ReadingListRow | null> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('reading_lists')
      .insert({ user_id: userId, name, description })
      .select()
      .single();

    if (!error && data) return data as ReadingListRow;
    // Sprint 3: propagar el error real (RLS, tabla faltante, etc.) para que la
    // interfaz puedo mostrar por qué falló la creación
    console.error('Error creando lista:', error?.message);
    throw new Error(error?.message || 'Error desconocido de Supabase');
  }

  const row: ReadingListRow = {
    id: uid(),
    user_id: userId,
    name,
    description,
    is_public: false,
    created_at: new Date().toISOString(),
  };
  writeLocalJSON(LOCAL_KEYS.readingLists, [...readLocalJSON<ReadingListRow[]>(LOCAL_KEYS.readingLists, []), row]);
  return row;
};

export const deleteReadingList = async (listId: string): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    // La RLS garantiza que solo se borra si la lista pertenece al usuario
    const { error } = await supabase.from('reading_lists').delete().eq('id', listId);
    if (error) console.error('Error eliminando lista:', error.message);
    return;
  }

  writeLocalJSON(
    LOCAL_KEYS.readingLists,
    readLocalJSON<ReadingListRow[]>(LOCAL_KEYS.readingLists, []).filter((r) => r.id !== listId),
  );
};

export const getListItems = async (listId: string): Promise<ReadingListItemRow[]> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('reading_list_items')
      .select('*')
      .eq('list_id', listId)
      .order('added_at', { ascending: false });

    if (!error && data) return data as ReadingListItemRow[];
    console.error('Error cargando items de lista:', error?.message);
    return [];
  }

  // Modo demo: cada lista guarda sus items en una clave propia de localStorage.
  return readLocalJSON<ReadingListItemRow[]>(`crow_list_items_${listId}`, []);
};

export const addComicToList = async (listId: string, comicId: string): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('reading_list_items')
      .insert({ list_id: listId, comic_id: comicId });
    if (error) console.error('Error añadiendo cómic a lista:', error.message);
    return;
  }

  const key = `crow_list_items_${listId}`;
  const items = readLocalJSON<ReadingListItemRow[]>(key, []);
  if (items.some((r) => r.comic_id === comicId)) return;
  items.unshift({ id: uid(), list_id: listId, comic_id: comicId, added_at: new Date().toISOString() });
  writeLocalJSON(key, items);
};

export const removeComicFromList = async (listId: string, comicId: string): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('reading_list_items')
      .delete()
      .eq('list_id', listId)
      .eq('comic_id', comicId);
    if (error) console.error('Error eliminando cómic de lista:', error.message);
    return;
  }

  const key = `crow_list_items_${listId}`;
  writeLocalJSON(
    key,
    readLocalJSON<ReadingListItemRow[]>(key, []).filter((r) => r.comic_id !== comicId),
  );
};

// ------------------------------ Colecciones destacadas (Sprint 3) ------------------------------

/** Listas oficiales del sitio marcadas por el admin (is_featured = true). */
export const getFeaturedLists = async (): Promise<ReadingListRow[]> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('reading_lists')
      .select('*')
      .eq('is_featured', true)
      .eq('is_public', true)
      .order('created_at', { ascending: true });

    if (!error && data) return data as ReadingListRow[];
    console.error('Error cargando colecciones destacadas:', error?.message);
    return [];
  }

  // Modo demo: sin colecciones oficiales
  return [];
};

// ------------------------------ Ajustes de privacidad ------------------------------

export const getPrivacySettings = async (userId: string): Promise<PrivacySettings> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('user_settings')
      .select('profile_public, show_favorites, show_activity')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      const row = data as { profile_public: boolean; show_favorites: boolean; show_activity: boolean };
      return {
        profilePublic: row.profile_public,
        showFavorites: row.show_favorites,
        showActivity: row.show_activity,
      };
    }
    if (error && error.code !== 'PGRST116') {
      console.error('Error cargando ajustes de privacidad:', error.message);
    }
    return DEFAULT_PRIVACY;
  }

  return readLocalJSON<PrivacySettings>(LOCAL_KEYS.privacy, DEFAULT_PRIVACY);
};

export const savePrivacySettings = async (userId: string, settings: PrivacySettings): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('user_settings').upsert(
      {
        user_id: userId,
        profile_public: settings.profilePublic,
        show_favorites: settings.showFavorites,
        show_activity: settings.showActivity,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (error) console.error('Error guardando ajustes de privacidad:', error.message);
    return;
  }

  writeLocalJSON(LOCAL_KEYS.privacy, settings);
};
