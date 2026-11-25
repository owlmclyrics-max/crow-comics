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
  chapter_id: string | null; // ID del capítulo vinculado
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
  chapter_id?: string | null; // ID del capítulo vinculado
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
    chapter_id: input.chapter_id ?? null,
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
      chapter_id: input.chapter_id ?? null,
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

/**
 * Crea o actualiza un lanzamiento automáticamente desde un capítulo.
 * Si ya existe un lanzamiento para este chapter_id, lo actualiza.
 * Si no tiene schedule_date, elimina el lanzamiento existente.
 */
export const syncChapterRelease = async (
  chapterId: string,
  comicTitle: string,
  chapterNumber: number,
  chapterTitle: string,
  coverUrl: string | null,
  publisher: string | null,
  scheduleDate: string | null
): Promise<void> => {
  const db = requireDb();

  // Primero, buscar si ya existe un lanzamiento para este capítulo
  const { data: existing } = await db
    .from('release_schedule')
    .select('id')
    .eq('chapter_id', chapterId)
    .maybeSingle();

  // Si no hay fecha de programación, eliminar el lanzamiento existente
  if (!scheduleDate) {
    if (existing) {
      const { error } = await db.from('release_schedule').delete().eq('id', existing.id);
      if (error) throw new Error(`No se pudo eliminar el lanzamiento: ${error.message}`);
    }
    return;
  }

  // Generar título automático: "{Comic} - Tomo #{n}"
  const title = `${comicTitle} - Tomo #${chapterNumber}`;
  const chapterLabel = chapterTitle ? `#${chapterNumber} - ${chapterTitle}` : `#${chapterNumber}`;

  // El valor del editor viene en hora de Colombia: lo pasamos a UTC real.
  const releaseAt = colombiaLocalToIso(scheduleDate);
  if (!releaseAt) throw new Error('La fecha de programación no es válida');

  const input = {
    comic_id: null,
    chapter_id: chapterId,
    title,
    chapter_label: chapterLabel,
    publisher,
    cover_url: coverUrl,
    release_at: releaseAt,
    notes: null,
  };

  if (existing) {
    // Actualizar existente
    const { error } = await db
      .from('release_schedule')
      .update(input)
      .eq('id', existing.id);
    if (error) throw new Error(`No se pudo actualizar el lanzamiento: ${error.message}`);
  } else {
    // Crear nuevo. `created_by` debe ser el usuario logueado (FK a auth.users),
    // no el id del cómic: si no, el insert falla y el calendario queda vacío.
    const { data: authData } = await db.auth.getUser();
    const { error } = await db
      .from('release_schedule')
      .insert({
        ...input,
        created_by: authData.user?.id ?? null,
      });
    if (error) throw new Error(`No se pudo crear el lanzamiento: ${error.message}`);
  }
};

/* ── Helpers de fecha (hora de Colombia, GMT-5, sin horario de verano) ──── */

/** Zona horaria de Colombia. No cambia con el horario de verano. */
export const COLOMBIA_TZ = 'America/Bogota';

// Formato YYYY-MM-DD en hora de Colombia.
const CO_DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: COLOMBIA_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Formato HH:mm en hora de Colombia.
const CO_TIME_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: COLOMBIA_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Clave de día (YYYY-MM-DD) en hora de Colombia. */
export const colombiaDayKey = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : CO_DATE_FMT.format(d);
};

/** Número de día del mes en hora de Colombia. */
export const colombiaDayNumber = (iso: string): number =>
  Number(colombiaDayKey(iso).split('-')[2] || 0);

/**
 * Valor de <input type="datetime-local"> (hora de Colombia) → ISO UTC.
 * Acepta también un ISO con zona (lo deja como está).
 */
export const colombiaLocalToIso = (value: string): string => {
  const v = value.trim();
  if (!v) return '';
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(v)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
  }
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return '';
  // Colombia es UTC-5 todo el año: 18:00 en Bogotá = 23:00 UTC.
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00-05:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
};

/** ISO → valor de <input type="datetime-local"> en hora de Colombia. */
export const isoToColombiaInput = (iso: string): string => {
  const v = iso.trim();
  // Si ya viene sin zona, es hora de pared (la del editor): se deja igual.
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(v) && !/[zZ]$|[+-]\d{2}:?\d{2}$/.test(v)) {
    return v.slice(0, 16).replace(' ', 'T');
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${CO_DATE_FMT.format(d)}T${CO_TIME_FMT.format(d)}`;
};

/** Compatibilidad con los nombres viejos (ya usan hora de Colombia). */
export const toLocalInput = isoToColombiaInput;
export const fromLocalInput = colombiaLocalToIso;

/** Etiqueta de día: Hoy / Mañana / Ayer / "martes, 25 de noviembre". */
export const releaseDateLabel = (iso: string): string => {
  const key = colombiaDayKey(iso);
  if (!key) return '';
  const todayKey = CO_DATE_FMT.format(new Date());
  const toUtc = (k: string) => {
    const [y, m, d] = k.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const diffDays = Math.round((toUtc(key) - toUtc(todayKey)) / 86_400_000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Mañana';
  if (diffDays === -1) return 'Ayer';
  return new Date(iso).toLocaleDateString('es', {
    timeZone: COLOMBIA_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

export const releaseTimeLabel = (iso: string): string =>
  new Date(iso).toLocaleTimeString('es-CO', {
    timeZone: COLOMBIA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

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
