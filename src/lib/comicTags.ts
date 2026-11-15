/**
 * Etiquetas automáticas (v0.9.9.9).
 *
 * Antes el tag era solo el campo estático `comics.tag` (elegido a mano en el
 * admin). Ahora se calcula según actividad REAL de lectura, con prioridad:
 *
 *   1. 🆕 Novedad  → cómic subido hace menos de 14 días (el más reciente).
 *   2. 🔥 Popular  → el más leído de los últimos 7 días.
 *   3. 📈 Trending → el más leído de los últimos 30 días.
 *   4. 🏆 Éxitos   → el más leído de siempre.
 *
 * Cada categoría elige su ganador entre los cómics que aún no tienen tag;
 * si no hay datos suficientes, se cae al tag estático del admin (NUNCA se
 * inventan datos). Los conteos vienen de la RPC `get_public_read_counts`
 * (ver make-read-counts-public.sql): son números agregados, sin exponer
 * lecturas individuales.
 */
import { isSupabaseConfigured, supabase } from './supabase';
import type { Comic, ComicTag } from '../types/comic';

export interface ComicReadCounts {
  comic_id: string;
  total_reads: number;
  weekly_reads: number;
  monthly_reads: number;
}

export type ReadCountsByComic = Record<string, ComicReadCounts>;

export type AutoTagByComic = Record<string, ComicTag>;

/** Ventana (en días) para considerar un cómic "Novedad". */
export const NOVEDAD_WINDOW_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Trae los conteos agregados de la RPC. Si la SQL no se ejecutó todavía
    (o falla), devuelve un mapa vacío → todos los cómics usan su tag estático. */
export const fetchReadCounts = async (): Promise<ReadCountsByComic> => {
  if (!isSupabaseConfigured || !supabase) return {};

  try {
    const { data, error } = await supabase.rpc('get_public_read_counts');
    if (error || !data) return {};

    const map: ReadCountsByComic = {};
    for (const row of data as ComicReadCounts[]) {
      map[row.comic_id] = {
        comic_id: row.comic_id,
        total_reads: Number(row.total_reads) || 0,
        weekly_reads: Number(row.weekly_reads) || 0,
        monthly_reads: Number(row.monthly_reads) || 0,
      };
    }
    return map;
  } catch {
    return {};
  }
};

/** El mejor candidato de una lista ordenada que todavía no tenga tag. */
const pickAvailable = (candidates: Comic[], taken: Set<string>): Comic | undefined =>
  candidates.find((comic) => !taken.has(comic.id));

/**
 * Asigna una etiqueta automática a cada cómic según las reglas de arriba.
 * `comics` debe venir ordenado por created_at DESC (como lo trae la base),
 * aunque internamente se re-ordenan los candidatos por si acaso.
 */
export const computeAutoTags = (
  comics: Comic[],
  counts: ReadCountsByComic,
  now: number = Date.now(),
): AutoTagByComic => {
  const assigned: AutoTagByComic = {};
  const taken = new Set<string>();

  const byWeek = [...comics].sort(
    (a, b) => (counts[b.id]?.weekly_reads ?? 0) - (counts[a.id]?.weekly_reads ?? 0),
  );
  const byMonth = [...comics].sort(
    (a, b) => (counts[b.id]?.monthly_reads ?? 0) - (counts[a.id]?.monthly_reads ?? 0),
  );
  const byTotal = [...comics].sort(
    (a, b) => (counts[b.id]?.total_reads ?? 0) - (counts[a.id]?.total_reads ?? 0),
  );

  const assign = (comic: Comic | undefined, tag: ComicTag) => {
    if (!comic) return;
    assigned[comic.id] = tag;
    taken.add(comic.id);
  };

  // 1) Novedad: el más reciente de los subidos en la ventana.
  const recent = comics
    .filter((comic) => {
      if (!comic.created_at) return false;
      const age = now - Date.parse(comic.created_at);
      return Number.isFinite(age) && age <= NOVEDAD_WINDOW_DAYS * DAY_MS;
    })
    .sort((a, b) => Date.parse(b.created_at as string) - Date.parse(a.created_at as string));
  assign(pickAvailable(recent, taken), 'Novedad');

  // 2) Popular: más lecturas de los últimos 7 días (empates → orden del
  //    catálogo, no inventamos desempates raros).
  const weekLeader = byWeek.find(
    (comic) => (counts[comic.id]?.weekly_reads ?? 0) > 0,
  );
  assign(pickAvailable(weekLeader ? [weekLeader] : [], taken), 'Popular');

  // 3) Trending: más lecturas de los últimos 30 días.
  const monthLeader = byMonth.find(
    (comic) => (counts[comic.id]?.monthly_reads ?? 0) > 0,
  );
  assign(pickAvailable(monthLeader ? [monthLeader] : [], taken), 'Trending');

  // 4) Éxitos: más lecturas de siempre.
  const allTimeLeader = byTotal.find(
    (comic) => (counts[comic.id]?.total_reads ?? 0) > 0,
  );
  assign(pickAvailable(allTimeLeader ? [allTimeLeader] : [], taken), 'Éxitos');

  return assigned;
};

/** Shape mínimo que acepta el helper: un cómic completo O un tomo con su
    comic_id + tag estático (ChapterWithComic). */
export interface TagSource {
  id: string;
  tag: ComicTag;
}
