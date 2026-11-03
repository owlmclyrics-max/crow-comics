export const LOCAL_KEYS = {
  comics: 'crow_comics_local_cache_v2',
  comments: 'crow_comments_local_cache_v1',
  characters: 'crow_characters_local_cache_v1',
  chapterCharacters: 'crow_chapter_characters_local_cache_v1',
} as const;

export const readLocalJSON = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const writeLocalJSON = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // El almacenamiento local puede estar lleno o deshabilitado.
  }
};
