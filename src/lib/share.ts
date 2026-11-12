import type { Comic, Chapter } from '../types/comic';
import { comicSlug, chapterSlug } from './slug';
import { showToast } from '../components/ui/Toast';

// ============================================================================
// v0.9.9.5: COMPARTIR CON EMBED DE DISCORD
// Los links que se comparten son de PATH (sin #): crow-comics.pages.dev/comic/
// <slug>/tomo-<n>. Así Discord/Twitter pueden leerlos del servidor y armar el
// embed con portada, nombre, editorial y año (lo hace functions/comic/...).
// El link de la barra de direcciones (#/comic/...) también funciona, pero el
// hash nunca viaja al servidor, por eso no genera embed.
// ============================================================================

/** Base del sitio: origen + carpeta (ej. https://crow-comics.pages.dev/). */
const siteBase = (): string =>
  window.location.origin + window.location.pathname.replace(/[^/]*$/, '');

export const comicShareUrl = (comic: Comic, comics: Comic[]): string =>
  `${siteBase()}comic/${comicSlug(comic, comics)}`;

export const chapterShareUrl = (
  chapter: Chapter,
  comic: Comic,
  comics: Comic[],
): string =>
  `${comicShareUrl(comic, comics)}/${chapterSlug(chapter)}`;

/**
 * Comparte un link: WhatsApp/Discord nativo si el dispositivo lo soporta,
 * si no copia al portapapeles y avisa con toast.
 */
export const shareLink = async (url: string, title: string): Promise<void> => {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, url });
      return;
    } catch (err) {
      // El usuario canceló la hoja de compartir: no es un error.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.warn('navigator.share falló, se copia al portapapeles:', err);
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copiado para compartir 🦅', 'success');
  } catch {
    showToast('No se pudo copiar el link', 'error');
  }
};
