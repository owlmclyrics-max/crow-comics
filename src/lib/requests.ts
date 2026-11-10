import { supabase, isSupabaseConfigured } from './supabase';
import { readLocalJSON, writeLocalJSON } from './localStore';

// ==============================================================================
// SPRINT 7: SOLICITUDES DE CÓMICS — el lector pide que subamos una serie.
// Tabla `comic_requests` en Supabase (ver add-comic-requests.sql); sin
// credenciales (o si la tabla aún no existe) cae a localStorage.
// ==============================================================================

const LOCAL_KEY = 'crow_comic_requests_local_v1';

export type ComicRequestState = 'pendiente' | 'en_revision' | 'agregado' | 'rechazado';

export interface ComicRequestRow {
  id: string;
  user_id: string;
  /** Nombre de la serie que pide subir. */
  title: string;
  /** Editorial aproximada (opcional). */
  publisher?: string | null;
  /** Detalles libres: tomos, año, enlaces, comentarios. */
  notes?: string | null;
  status: ComicRequestState;
  created_at: string;
}

const uid = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const readLocalRequests = (): ComicRequestRow[] =>
  readLocalJSON<ComicRequestRow[]>(LOCAL_KEY, []);

const writeLocalRequests = (rows: ComicRequestRow[]): void => writeLocalJSON(LOCAL_KEY, rows);

/** Crea una solicitud. Devuelve la fila guardada. Si Supabase falla
    (tabla sin migrar, sin sesión…) guarda local y lo indica. */
export const createComicRequest = async (input: {
  userId: string;
  title: string;
  publisher?: string;
  notes?: string;
}): Promise<{ row: ComicRequestRow; storedRemote: boolean }> => {
  const base: ComicRequestRow = {
    id: uid(),
    user_id: input.userId,
    title: input.title.trim(),
    publisher: input.publisher?.trim() || null,
    notes: input.notes?.trim() || null,
    status: 'pendiente',
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('comic_requests')
      .insert({
        user_id: input.userId,
        title: base.title,
        publisher: base.publisher,
        notes: base.notes,
        status: base.status,
      })
      .select('id, created_at')
      .single();
    if (!error && data) {
      return {
        row: { ...base, id: data.id as string, created_at: (data.created_at as string) ?? base.created_at },
        storedRemote: true,
      };
    }
    // Tabla sin migrar / RLS: cae a local sin romper el flujo del lector.
    console.warn('comic_requests no disponible:', error?.message);
  }

  writeLocalRequests([base, ...readLocalRequests()]);
  return { row: base, storedRemote: false };
};

/** Solicitudes de un usuario (las "mías"). Si es admin, trae todas. */
export const getComicRequests = async (opts: {
  userId: string;
  all?: boolean;
}): Promise<ComicRequestRow[]> => {
  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from('comic_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!opts.all) query = query.eq('user_id', opts.userId);
    const { data, error } = await query;
    if (!error && data) return data as ComicRequestRow[];
    console.error('Error cargando solicitudes:', error?.message);
    return [];
  }
  return readLocalRequests()
    .filter((r) => opts.all || r.user_id === opts.userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
};

/** Solo admins: cambia el estado de una solicitud. */
export const setComicRequestStatus = async (id: string, status: ComicRequestState): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('comic_requests').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  const rows = readLocalRequests().map((r) => (r.id === id ? { ...r, status } : r));
  writeLocalRequests(rows);
};
