/**
 * Pipeline de páginas para el visor propio (v0.9.9.9.6).
 *
 * El admin sube un CBZ (ZIP de imágenes, 100% soportado) o un CBR (RAR,
 * best-effort con la librería unrar de la oficial de rarlab) en el
 * formulario de tomos. Este módulo, TODO en el navegador del admin:
 *
 *   1. Abre el archivo y extrae las imágenes (en orden natural: 1,2,…,10).
 *   2. Las re-encodea a WebP (ancho máx. 1600px, calidad 0.8).
 *   3. Las sube al bucket público "pages" de Supabase Storage con la sesión
 *      del admin (política SQL: solo los emails del equipo).
 *   4. Devuelve la lista de URLs para guardarla en chapters.pages.
 */
import { unzip } from 'fflate';
import { supabase } from './supabase';

export interface ArchivePage {
  name: string;
  blob: Blob;
}

const IMAGE_RE = /\.(jpe?g|png|webp|gif|bmp|avif|tiff?)$/i;
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 0.8;

export const isCbzFile = (file: File): boolean => /\.(cbz|zip)$/i.test(file.name);
export const isCbrFile = (file: File): boolean => /\.(cbr|rar)$/i.test(file.name);

/** Orden natural de nombres: "p2.jpg" < "p10.jpg" (el orden alfabético
    simple pondría el 10 antes que el 2). */
const naturalCompare = (a: string, b: string): number =>
  a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });

const isJunkPath = (name: string): boolean =>
  name.startsWith('__MACOSX/') || name.split('/').pop()?.startsWith('.') === true;

const blobTypeOf = (name: string): string => {
  if (/\.jpe?g$/i.test(name)) return 'image/jpeg';
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.webp$/i.test(name)) return 'image/webp';
  if (/\.gif$/i.test(name)) return 'image/gif';
  return 'application/octet-stream';
};

const fromZip = (file: File): Promise<ArchivePage[]> =>
  new Promise((resolve, reject) => {
    void (async () => {
      try {
        const buffer = new Uint8Array(await file.arrayBuffer());
        unzip(buffer, (err, entries) => {
          if (err) {
            reject(new Error('No se pudo abrir el CBZ'));
            return;
          }
          const pages = Object.entries(entries)
            .filter(([name, data]) => IMAGE_RE.test(name) && data.length > 0 && !isJunkPath(name))
            .map(([name, data]) => ({
              name,
              blob: new Blob([data], { type: blobTypeOf(name) }),
            }))
            .sort((a, b) => naturalCompare(a.name, b.name));
          if (pages.length === 0) {
            reject(new Error('El CBZ no tiene imágenes adentro'));
            return;
          }
          resolve(pages);
        });
      } catch {
        reject(new Error('No se pudo abrir el CBZ'));
      }
    })();
  });

const fromRar = async (file: File): Promise<ArchivePage[]> => {
  // Dynamic import: solo quien usa CBR carga la librería (~0.2MB wasm aparte).
  const { createExtractorFromData } = await import('node-unrar-js');
  const wasmRes = await fetch('/unrar/unrar.wasm');
  if (!wasmRes.ok) throw new Error('No se pudo cargar el extractor de RAR');
  const wasmBinary = await wasmRes.arrayBuffer();
  const data = await file.arrayBuffer();

  const extractor = await createExtractorFromData({ data, wasmBinary });
  const extracted = extractor.extract();
  const pages: ArchivePage[] = [];
  for (const entry of extracted.files) {
    if (!entry.extraction) continue;
    const name = entry.fileHeader.name.replace(/\\/g, '/');
    if (!IMAGE_RE.test(name) || isJunkPath(name)) continue;
    pages.push({
      name,
      blob: new Blob([entry.extraction as unknown as BlobPart], { type: blobTypeOf(name) }),
    });
  }
  pages.sort((a, b) => naturalCompare(a.name, b.name));
  if (pages.length === 0) {
    throw new Error('El CBR no tiene imágenes legibles (probá pasarlo a CBZ con WinRAR)');
  }
  return pages;
};

/** Abre un CBZ o CBR y devuelve sus imágenes ordenadas como páginas. */
export const openComicArchive = async (file: File): Promise<ArchivePage[]> => {
  if (isCbzFile(file)) return fromZip(file);
  if (isCbrFile(file)) return fromRar(file);
  throw new Error('Formato no soportado (usá CBZ o CBR)');
};

/** Re-encodea cada imagen a WebP (ancho máx. 1600px, calidad 0.8) —
    misa calidad fiel, peso mínimo. */
export const toWebpPages = async (
  pages: ArchivePage[],
  onProgress?: (done: number, total: number) => void,
): Promise<Blob[]> => {
  const out: Blob[] = [];
  for (const [i, page] of pages.entries()) {
    const bitmap = await createImageBitmap(page.blob);
    try {
      const scale = Math.min(1, MAX_WIDTH / bitmap.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas no disponible');
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const webp = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY),
      );
      if (!webp) throw new Error('No se pudo convertir la página a WebP');
      out.push(webp);
    } finally {
      bitmap.close();
    }
    onProgress?.(i + 1, pages.length);
  }
  return out;
};

/** Sube las páginas al bucket público "pages" de Supabase Storage y devuelve
    las URLs públicas en orden. La subida viaja con la sesión del admin y la
    política SQL solo deja subir a los emails del equipo. */
export const uploadChapterPages = async (
  chapterId: string,
  blobs: Blob[],
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> => {
  if (!supabase) throw new Error('Supabase no está configurado');
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error('Necesitás sesión de admin para subir páginas');
  }

  const bucket = supabase.storage.from('pages');
  const uploadId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const urls: string[] = [];

  for (const [i, blob] of blobs.entries()) {
    const name = `p${String(i + 1).padStart(3, '0')}.webp`;
    const path = `chapters/${chapterId}/${uploadId}/${name}`;
    const { error } = await bucket.upload(path, blob, {
      contentType: 'image/webp',
      upsert: false,
    });
    if (error) {
      throw new Error(`Falló la subida de la página ${i + 1}: ${error.message}`);
    }
    const { data: pub } = bucket.getPublicUrl(path);
    urls.push(pub.publicUrl);
    onProgress?.(i + 1, blobs.length);
  }
  return urls;
};
