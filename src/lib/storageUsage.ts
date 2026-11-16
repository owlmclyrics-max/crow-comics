/**
 * Uso del bucket "pages" de Supabase Storage (v0.9.9.9.9.1).
 *
 * El plan gratis de Supabase da 1 GB de storage. Este módulo mide cuánto
 * está usando Crow Comics: lista los objetos del bucket (las páginas WebP
 * de los tomos), los agrupa por tomo y detecta "huérfanas" — páginas que
 * quedaron en el bucket pero que ningún tomo usa (por ejemplo cuando
 * re-subís un CBZ: la subida vieja sigue ahí hasta que la limpiamos).
 */
import { supabase } from './supabase';

export interface PageObject {
  path: string; // chapters/<chapterId>/<uploadId>/p001.webp
  size: number; // bytes
  chapterId: string;
  uploadId: string;
}

export interface ChapterUsage {
  chapterId: string;
  label: string; // "Tomo #3 — Nombre"
  numPages: number; // páginas en el bucket
  bytes: number;
  hasPdf: boolean; // si tiene pdf_url, es seguro quitarle las páginas
  orphanUploads: string[]; // uploads en el bucket que el tomo no usa
  orphanBytes: number;
}

export interface ComicUsage {
  comicId: string;
  title: string;
  coverUrl: string;
  chapters: ChapterUsage[];
  numPages: number;
  bytes: number;
  orphanBytes: number;
}

export interface StorageUsage {
  objects: PageObject[];
  totalBytes: number;
  numObjects: number;
  orphanBytes: number;
  orphanCount: number;
  comics: ComicUsage[];
}

/** Cuota del plan gratis de Supabase. */
export const STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024;

export const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
};

const PATH_RE = /^chapters\/([^/]+)\/([^/]+)\/p\d+\.\w+$/;

/** Lista TODOS los objetos del bucket (recursivo, por carpetas). */
export const listPageObjects = async (): Promise<PageObject[]> => {
  if (!supabase) throw new Error('Supabase no está configurado');
  const storage = supabase.storage.from('pages');
  const out: PageObject[] = [];

  const walk = async (prefix: string): Promise<void> => {
    const { data, error } = await storage.list(prefix, { limit: 1000, offset: 0 });
    if (error) throw new Error(`No se pudo leer el bucket: ${error.message}`);
    const folders: string[] = [];
    for (const entry of data ?? []) {
      if (entry.id === null) {
        folders.push(`${prefix}${entry.name}/`);
      } else {
        const match = PATH_RE.exec(`${prefix}${entry.name}`);
        if (match && entry.metadata) {
          out.push({
            path: `${prefix}${entry.name}`,
            size: entry.metadata.size,
            chapterId: match[1],
            uploadId: match[2],
          });
        }
      }
    }
    for (const folder of folders) await walk(folder);
  };

  await walk('chapters/');
  return out;
};

/**
 * Cruza los objetos del bucket con los datos de la base (comics + chapters)
 * para armar el listado por cómic, con huérfanas incluidas.
 */
export const buildUsage = (
  objects: PageObject[],
  comics: Array<{ id: string; title: string; cover_url: string }>,
  chapters: Array<{
    id: string;
    title: string;
    chapter_number: number | null;
    comic_id: string;
    pdf_url: string | null;
    pages: string[] | null;
  }>,
): StorageUsage => {
  const comicById = new Map(comics.map((c) => [c.id, c]));
  const chapterById = new Map(chapters.map((ch) => [ch.id, ch]));

  const chaptersMap = new Map<string, ChapterUsage>();
  const ensureChapter = (chapterId: string): ChapterUsage => {
    let usage = chaptersMap.get(chapterId);
    if (!usage) {
      const ch = chapterById.get(chapterId);
      usage = {
        chapterId,
        label: ch ? `Tomo #${ch.chapter_number ?? '?'}${ch.title ? ` — ${ch.title}` : ''}` : 'Tomo (ya no existe)',
        numPages: 0,
        bytes: 0,
        hasPdf: Boolean(ch?.pdf_url),
        orphanUploads: [],
        orphanBytes: 0,
      };
      chaptersMap.set(chapterId, usage);
    }
    return usage;
  };

  // Suma por tomo, separando las páginas activas de las huérfanas.
  const uploadActive = new Map<string, Set<string>>(); // "chapterId/uploadId" si el tomo usa ESE upload
  for (const ch of chapters) {
    for (const url of ch.pages ?? []) {
      const match = /\/chapters\/[^/]+\/([^/]+)\//.exec(url);
      if (match) {
        const key = `${ch.id}/${match[1]}`;
        if (!uploadActive.has(key)) uploadActive.set(key, new Set());
      }
    }
  }

  for (const obj of objects) {
    const usage = ensureChapter(obj.chapterId);
    const isActive = uploadActive.has(`${obj.chapterId}/${obj.uploadId}`);
    if (isActive) {
      usage.numPages += 1;
      usage.bytes += obj.size;
    } else {
      if (!usage.orphanUploads.includes(obj.uploadId)) {
        usage.orphanUploads.push(obj.uploadId);
      }
      usage.orphanBytes += obj.size;
    }
  }

  const comicsOut: ComicUsage[] = [];
  for (const usage of chaptersMap.values()) {
    const chapterId = usage.chapterId;
    const comicId = chapterById.get(chapterId)?.comic_id ?? '';
    const comic = comicById.get(comicId);
    let comicUsage = comicsOut.find((c) => c.comicId === comicId);
    if (!comicUsage) {
      comicUsage = {
        comicId,
        title: comic?.title ?? 'Cómic eliminado',
        coverUrl: comic?.cover_url ?? '',
        chapters: [],
        numPages: 0,
        bytes: 0,
        orphanBytes: 0,
      };
      comicsOut.push(comicUsage);
    }
    comicUsage.chapters.push(usage);
    comicUsage.numPages += usage.numPages;
    comicUsage.bytes += usage.bytes + usage.orphanBytes;
    comicUsage.orphanBytes += usage.orphanBytes;
  }
  // Tomos más pesados primero, cómics con más peso primero.
  for (const c of comicsOut) c.chapters.sort((a, b) => b.bytes + b.orphanBytes - (a.bytes + a.orphanBytes));
  comicsOut.sort((a, b) => b.bytes + b.orphanBytes - (a.bytes + a.orphanBytes));

  const activeBytes = objects
    .filter((o) => uploadActive.has(`${o.chapterId}/${o.uploadId}`))
    .reduce((sum, o) => sum + o.size, 0);
  const totalBytes = objects.reduce((sum, o) => sum + o.size, 0);

  return {
    objects,
    totalBytes,
    numObjects: objects.length,
    // "Huérfanas" = todo lo que NO está activo (un re-upload nuevo deja la
    // subida anterior sin referencias hasta que se limpia).
    orphanBytes: totalBytes - activeBytes,
    orphanCount: objects.filter((o) => !uploadActive.has(`${o.chapterId}/${o.uploadId}`)).length,
    comics: comicsOut,
  };
};

/** Mide el bucket y arma el listado completo. */
export const fetchStorageUsage = async (): Promise<StorageUsage> => {
  if (!supabase) throw new Error('Supabase no está configurado');
  const [objects, comicsRes, chaptersRes] = await Promise.all([
    listPageObjects(),
    supabase.from('comics').select('id,title,cover_url'),
    supabase
      .from('chapters')
      .select('id,title,chapter_number,comic_id,pdf_url,pages'),
  ]);
  if (comicsRes.error) throw new Error(`No se pudo leer los cómics: ${comicsRes.error.message}`);
  if (chaptersRes.error) throw new Error(`No se pudo leer los tomos: ${chaptersRes.error.message}`);
  return buildUsage(
    objects,
    (comicsRes.data ?? []) as Array<{ id: string; title: string; cover_url: string }>,
    (chaptersRes.data ?? []) as Array<{
      id: string;
      title: string;
      chapter_number: number | null;
      comic_id: string;
      pdf_url: string | null;
      pages: string[] | null;
    }>,
  );
};

/**
 * Quita TODAS las páginas de un tomo (las activas y las huérfanas) y pone
 * chapters.pages = null. El tomo vuelve a leerse por su PDF de Drive.
 * La política SQL solo deja borrar a los emails del equipo.
 */
export const deleteChapterPages = async (chapterId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase no está configurado');
  const storage = supabase.storage.from('pages');

  // Junta los paths de todos los uploads de ese tomo.
  const paths: string[] = [];
  const walk = async (prefix: string): Promise<void> => {
    const { data, error } = await storage.list(prefix, { limit: 1000, offset: 0 });
    if (error) throw new Error(`No se pudo leer el bucket: ${error.message}`);
    for (const entry of data ?? []) {
      if (entry.id === null) await walk(`${prefix}${entry.name}/`);
      else paths.push(`${prefix}${entry.name}`);
    }
  };
  await walk(`chapters/${chapterId}/`);

  if (paths.length > 0) {
    const { error } = await storage.remove(paths);
    if (error) throw new Error(`No se pudo borrar del bucket: ${error.message}`);
  }

  const { error: dbError } = await supabase
    .from('chapters')
    .update({ pages: null })
    .eq('id', chapterId);
  if (dbError) throw new Error(`No se pudo actualizar el tomo: ${dbError.message}`);
};
