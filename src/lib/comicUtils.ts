import type { Chapter, ChapterWithComic, Character, Comic } from '../types/comic';

/**
 * Aplana un capítulo junto con los datos de su cómic padre.
 * Evita repetir el mismo mapeo en App, el carrusel y las páginas de detalle.
 */
export const toChapterWithComic = (chapter: Chapter, comic: Comic): ChapterWithComic => ({
  ...chapter,
  comic_title: comic.title,
  comic_cover_url: comic.cover_url,
  comic_synopsis: comic.synopsis,
  comic_publisher: comic.publisher,
  comic_tag: comic.tag,
  comic_status: comic.status,
  comic_writer: comic.writer,
  comic_artist: comic.artist,
  comic_translator_typesetter: comic.translator_typesetter,
  comic_year: comic.year,
});

const normalize = (value: string): string => value.trim().toLowerCase();

/**
 * Minúsculas, sin acentos y con espacios colapsados: "Yelena Bélova ",
 * "yelena belova" y "Yelena  Belova" empatan. Para comparar nombres
 * de personajes entre el texto libre y el wiki.
 */
export const accentless = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

/** ¿Son el mismo nombre de personaje? Ignora acentos, mayúsculas y espacios. */
export const isSameCharacterName = (a: string, b: string): boolean =>
  Boolean(a) && Boolean(b) && accentless(a) === accentless(b);

/** Coincide un nombre (libre) con el nombre inglés o español del personaje. */
export const characterNameMatches = (character: Character, name: string): boolean =>
  isSameCharacterName(character.name, name) ||
  (!!character.name_spanish && isSameCharacterName(character.name_spanish, name));

/**
 * Búsqueda del navbar: título, título original, guionista, editorial y maquetador.
 */
export const filterComicsByQuery = (comics: Comic[], query: string): Comic[] => {
  const term = normalize(query);
  if (!term) return [];

  return comics.filter((comic) => {
    const searchable = [
      comic.title,
      comic.original_title,
      comic.writer,
      comic.publisher,
      comic.translator_typesetter,
    ];

    return searchable.some((value) => value?.toLowerCase().includes(term));
  });
};

/**
 * Búsqueda de personajes: nombre (EN/ES), real, editorial y toda la mini-wiki
 * (alias, especie, universo, creadores, enemigos, arma...).
 */
export const matchesCharacterSearch = (character: Character, query: string): boolean => {
  const term = normalize(query);
  if (!term) return true;

  return [
    character.name,
    character.name_spanish,
    character.real_name,
    character.publisher,
    character.alignment,
    character.aliases,
    character.species,
    character.universe,
    character.origin_place,
    character.creators,
    character.enemies,
    character.weapon,
  ].some((value) => value?.toLowerCase().includes(term));
};
