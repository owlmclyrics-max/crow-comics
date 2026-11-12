import type { Comic, Chapter } from '../types/comic';

// ============================================================================
// v0.9.9.4: LINKS LEGIBLES PARA CÓMICS Y TOMOS
// En vez de #/comic-detail?comic=cdf58cbf-4b93-4348-... (UUID ilegible),
// los links ahora son #/comic/<slug> y #/comic/<slug>/tomo-<n>.
// Ej: #/comic/winter-guard  ·  #/comic/winter-guard/tomo-3
// Los links viejos con UUID siguen funcionando (compatibilidad hacia atrás).
// No toca la base de datos: el slug se calcula del título en memoria.
// ============================================================================

/** "Spider-Man: Blue" → "spider-man-blue" (sin tildes, minúsculas, guiones). */
export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Slug de un tomo: "tomo-3" (el número de tomo es único dentro de la serie). */
export const chapterSlug = (chapter: Pick<Chapter, 'chapter_number'>): string =>
  `tomo-${chapter.chapter_number}`;

/**
 * Slug de un cómic. Si hay dos cómics con el mismo título, al segundo se le
 * agrega sufijo (-2, -3...) para que cada link sea único.
 */
export const comicSlug = (comic: Comic, comics: Comic[]): string => {
  const base = slugify(comic.title) || 'comic';
  const sameBase = comics.filter((c) => (slugify(c.title) || 'comic') === base);
  if (sameBase.length <= 1) return base;
  const index = sameBase.findIndex((c) => c.id === comic.id);
  return index <= 0 ? base : `${base}-${index + 1}`;
};

/**
 * Resuelve un "ref" que puede venir en tres formas: UUID viejo (links
 * compartidos antes de v0.9.9.4), slug simple o slug único con sufijo.
 */
export const findComicByRef = (ref: string | null, comics: Comic[]): Comic | null => {
  if (!ref) return null;
  return (
    comics.find((c) => c.id === ref) ??
    comics.find((c) => comicSlug(c, comics) === ref) ??
    null
  );
};

/** Resuelve un tomo por UUID o por su slug (tomo-N) dentro de su serie. */
export const findChapterByRef = (
  comic: Comic,
  ref: string | null,
): Chapter | null => {
  if (!ref || !comic.chapters) return null;
  return (
    comic.chapters.find((ch) => ch.id === ref) ??
    comic.chapters.find((ch) => chapterSlug(ch) === ref) ??
    null
  );
};
