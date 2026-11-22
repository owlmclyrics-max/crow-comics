/**
 * Calendario de lanzamientos (v0.11.0).
 *
 * Anuncios públicos de lo que viene: fecha + hora, portada, editorial y,
 * opcionalmente, el cómic del catálogo. Vive en la tabla release_schedule
 * (RLS: lectura pública, escritura solo equipo).
 */
import { supabase, isSupabaseConfigured } from './supabase';

export interface ReleaseItem {
  id: string;
  comic_id: string | null;
  title: string;
  chapter_label: string | null;
  publisher: string | null;
  cover_url: string | null;
  release_at: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ReleaseInput {
  comic_id?: string | null;
  title: string;
  chapter_label?: string | null;
  publisher?: string | null;
  cover_url?: string | null;
  release_at: string;
  notes?: string | null;
}

const requireDb = () => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
  return supabase;
};

export const fetchReleases = async (): Promise<ReleaseItem[]> => {
  const db = requireDb();
  const { data, error } = await db
    .from('release_schedule')
    .select('*')
    .order('release_at', { ascending: true })
    .limit(300);
  if (error) throw new Error(`No se pudo leer el calendario: ${error.message}`);
  return (data ?? []) as ReleaseItem[];
};

export const createRelease = async (input: ReleaseInput, meId: string): Promise<void> => {
  const db = requireDb();
  const { error } = await db.from('release_schedule').insert({
    comic_id: input.comic_id ?? null,
    title: input.title.trim(),
    chapter_label: input.chapter_label?.trim() || null,
    publisher: input.publisher?.trim() || null,
    cover_url: input.cover_url?.trim() || null,
    release_at: input.release_at,
    notes: input.notes?.trim() || null,
    created_by: meId,
  });
  if (error) throw new Error(`No se pudo crear el lanzamiento: ${error.message}`);
};

export const updateRelease = async (id: string, input: ReleaseInput): Promise<void> => {
  const db = requireDb();
  const { error } = await db
    .from('release_schedule')
    .update({
      comic_id: input.comic_id ?? null,
      title: input.title.trim(),
      chapter_label: input.chapter_label?.trim() || null,
      publisher: input.publisher?.trim() || null,
      cover_url: input.cover_url?.trim() || null,
      release_at: input.release_at,
      notes: input.notes?.trim() || null,
    })
    .eq('id', id);
  if (error) throw new Error(`No se pudo guardar el lanzamiento: ${error.message}`);
};

export const deleteRelease = async (id: string): Promise<void> => {
  const db = requireDb();
  const { error } = await db.from('release_schedule').delete().eq('id', id);
  if (error) throw new Error(`No se pudo borrar el lanzamiento: ${error.message}`);
};

/* ── Helpers de fecha (hora local del navegador) ───────────────────────── */

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO → valor para <input type="datetime-local">. */
export const toLocalInput = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

/** Valor de datetime-local → ISO UTC. */
export const fromLocalInput = (value: string): string => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
};

export const releaseDateLabel = (iso: string): string => {
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(d) - startOf(today)) / 86_400_000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Mañana';
  if (diffDays === -1) return 'Ayer';
  return d.toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

export const releaseTimeLabel = (iso: string): string =>
  new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

/** Cuánto falta en texto corto ("en 3 días", "en 2 h"). */
export const countdownLabel = (iso: string): string => {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'ya salió';
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `en ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `en ${hours} h`;
  const days = Math.round(hours / 24);
  return `en ${days} día${days === 1 ? '' : 's'}`;
};
