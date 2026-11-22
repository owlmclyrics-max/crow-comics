/**
 * Imágenes de cómics (v0.11.0): portadas y banners optimizados.
 *
 * - Las portadas de Fandom NO se pueden hotlinkear (403), así que las
 *   descargamos por el proxy /fandom-image, las pasamos a WebP y las
 *   guardamos en el bucket `comic-images` (así cargan siempre y rápido).
 * - Si el bucket o la sesión de admin fallan, devolvemos el proxy como
 *   respaldo: la portada se ve igual, solo que servida al vuelo.
 *
 * Peso: una portada WebP de 900px ronda 60–150 KB. Cien cómics ≈ 10–15 MB,
 * nada frente al 1 GB del plan. Las páginas de los tomos son lo pesado.
 */
import { supabase, isSupabaseConfigured } from './supabase';

/** ¿Es una imagen alojada por Fandom/Wikia? */
export const isFandomImageUrl = (url: string): boolean =>
  /^https?:\/\/[a-z0-9.-]*wikia\.(nocookie\.net|com)\//i.test(url.trim());

/** URL del proxy de imágenes de Fandom (functions/fandom-image.js). */
export const fandomImageProxyUrl = (url: string): string =>
  `/fandom-image?u=${encodeURIComponent(url.trim())}`;

/** Re-encodea una imagen a WebP limitando el ancho (calidad fiel, poco peso). */
export const toWebpImage = async (
  blob: Blob,
  maxWidth: number,
  quality = 0.85,
): Promise<Blob> => {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, maxWidth / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no disponible');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const webp = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality),
    );
    if (!webp) throw new Error('No se pudo convertir la imagen');
    return webp;
  } finally {
    bitmap.close();
  }
};

/** Sube una imagen al bucket público `comic-images` y devuelve su URL. */
export const uploadComicImage = async (
  blob: Blob,
  folder: 'covers' | 'banners' | 'releases',
): Promise<string> => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
  const db = supabase;
  const { data: sessionData } = await db.auth.getSession();
  if (!sessionData.session) throw new Error('Necesitás sesión para subir imágenes');

  const name = `${folder}/${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}.webp`;

  const { error } = await db.storage.from('comic-images').upload(name, blob, {
    contentType: 'image/webp',
    upsert: false,
    cacheControl: '31536000',
  });
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);

  return db.storage.from('comic-images').getPublicUrl(name).data.publicUrl;
};

const fetchFandomCover = async (imageUrl: string): Promise<Blob> => {
  const res = await fetch(fandomImageProxyUrl(imageUrl));
  if (!res.ok) throw new Error('No se pudo descargar la portada de Fandom');
  return res.blob();
};

/**
 * Espeja una portada de Fandom en nuestro Storage (WebP, 900px).
 * Si algo falla devuelve el proxy para que igual se vea.
 */
export const mirrorFandomCover = async (imageUrl: string): Promise<string> => {
  try {
    const blob = await fetchFandomCover(imageUrl);
    const webp = await toWebpImage(blob, 900, 0.85);
    return await uploadComicImage(webp, 'covers');
  } catch {
    return fandomImageProxyUrl(imageUrl);
  }
};
