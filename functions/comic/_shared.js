// ============================================================================
// Lógica compartida de los previews de Discord/WhatsApp (embeds OG).
// Este archivo NO crea rutas: lo importan los handlers de functions/comic/.
//
// El slug se calcula del título IGUAL que en src/lib/slug.ts (frontend) —
// si lo cambiás allí, cambialo acá también.
// ============================================================================

const SUPABASE_URL = 'https://zllafdlsatueezldoxlh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yu_ioWEZU3TS0302OrHSfA_cu1zNVv1';
const SITE_NAME = 'Crow Comics';

const slugify = (value) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Slug de un cómic (con sufijo -2, -3 si hay títulos repetidos). */
export const comicSlugOf = (comic, comics) => {
  const base = slugify(comic.title) || 'comic';
  const sameBase = comics.filter((c) => (slugify(c.title) || 'comic') === base);
  if (sameBase.length <= 1) return base;
  const index = sameBase.findIndex((c) => c.id === comic.id);
  return index <= 0 ? base : `${base}-${index + 1}`;
};

/** Descarga el catálogo (es público y chico) para resolver el slug. */
export const loadComics = async () => {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/comics?select=id,title,cover_url,publisher,year,synopsis,tag,status&order=created_at.asc`,
    { headers: { apikey: SUPABASE_KEY } },
  );
  if (!res.ok) throw new Error(`comics ${res.status}`);
  return res.json();
};

/** Descarga los tomos de una serie. */
export const loadChapters = async (comicId) => {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/chapters?select=id,chapter_number,title,cover_url&comic_id=eq.${comicId}&order=chapter_number.asc`,
    { headers: { apikey: SUPABASE_KEY } },
  );
  if (!res.ok) throw new Error(`chapters ${res.status}`);
  return res.json();
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const trim = (value, max) => {
  const text = String(value ?? '').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

/**
 * Página HTML mínima para crawlers (Discord, Twitter, WhatsApp):
 * meta tags OG con portada/nombre/editorial/año/tomo + salto automático a la
 * app (el link de compartir usa PATH porque el # nunca llega al servidor).
 */
export const embedPage = ({ title, description, image, redirect }) => {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safeRedirect = escapeHtml(redirect);
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:type" content="website">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDescription}">
${safeImage ? `<meta property="og:image" content="${safeImage}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDescription}">
${safeImage ? `<meta name="twitter:image" content="${safeImage}">` : ''}
<meta http-equiv="refresh" content="0;url=${safeRedirect}">
<script>location.replace(${JSON.stringify(redirect).replace(/</g, '\\u003c')});</script>
<style>body{background:#0c0a09;color:#fafafa;font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;text-align:center}a{color:#ec4899}</style>
</head>
<body>
<p>Abrir en Crow Comics…<br><a href="${safeRedirect}">Continuar</a></p>
</body>
</html>`;
};

/** Respuesta ya lista para el handler. */
export const htmlResponse = (html) =>
  new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
