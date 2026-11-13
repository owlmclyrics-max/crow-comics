// ============================================================================
// v0.9.9.7: Proxy de imágenes externas para esquivar el bloqueo de hotlinks
// de Fandom (static.wikia.nocookie.net devuelve 403 de forma errática en
// pedidos sin caché → placeholder gris de imagen rota en celulares).
//
// Las URLs de la lista blanca se sirven via /img?u=... (function img.js de
// Cloudflare Pages, con caché de un mes). En localhost el dev server no tiene
// functions, así que ahí se usa la URL directa para no romper el desarrollo.
//
// IMPORTANTE: si agregás un dominio acá, agregalo también en ALLOWED_HOSTS
// de functions/img.js (y viceversa).
// ============================================================================

const PROXY_HOSTS = [
  'static.wikia.nocookie.net',
  'vignette.wikia.nocookie.net',
  'i.redd.it',
  'preview.redd.it',
  'external-preview.redd.it',
  'i.imgur.com',
  'upload.wikimedia.org',
];

/**
 * Devuelve la URL por la que la imagen se puede pedir de forma confiable.
 * - URL vacía → '' (los <img> ya manejan el fallback)
 * - Host de la lista blanca (y no estamos en localhost) → /img?u=<url>
 * - Cualquier otro caso → la URL original, intacta
 */
export const proxyImageUrl = (url: string | null | undefined): string => {
  const raw = (url ?? '').trim();
  if (!raw) return '';
  if (!PROXY_HOSTS.some((host) => raw.startsWith(`https://${host}/`))) return raw;
  if (
    typeof window !== 'undefined' &&
    /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
  ) {
    return raw;
  }
  return `/img?u=${encodeURIComponent(raw)}`;
};
