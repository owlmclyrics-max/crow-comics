/**
 * Importador de datos desde Fandom (v0.9.9.9.4).
 * El admin pega el link de la página del cómic en Fandom y la function
 * edge /fandom le devuelve título, portada y sinopsis (meta-tags Open Graph).
 */
export interface FandomInfo {
  title?: string;
  image?: string;
  description?: string;
}

export const isFandomWikiUrl = (url: string): boolean =>
  /^https:\/\/[a-z0-9-]+\.fandom\.com\/wiki\//i.test(url.trim()) ||
  /^https:\/\/fandom\.com\/wiki\//i.test(url.trim());

export const fetchFandomInfo = async (pageUrl: string): Promise<FandomInfo | null> => {
  try {
    const res = await fetch(`/fandom?u=${encodeURIComponent(pageUrl.trim())}`);
    if (!res.ok) return null;
    const data = (await res.json()) as FandomInfo;
    if (!data.title && !data.image && !data.description) return null;
    return data;
  } catch {
    return null;
  }
};
