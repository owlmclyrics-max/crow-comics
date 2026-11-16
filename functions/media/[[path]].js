// ============================================================================
// v0.9.9.9.6: Storage de páginas de tomo en Cloudflare R2.
//
// Los tomos pueden leerse con el visor propio (páginas WebP) además del PDF
// de Drive. Este endpoint sirve Y recibe las imágenes del bucket R2:
//
//   GET  /media/chapters/<comicId>/<uploadId>/pNNN.webp  → sirve la imagen
//        (cache edge 1 año: las páginas nunca cambian de path, un re-upload
//        nuevo usa otro uploadId → cache siempre válido).
//   PUT  /media?path=<path>   → sube UNA página (solo admins verificados).
//
// Requiere el binding R2 "MEDIA" (bucket crow-media) en Settings → Bindings
// de la Pages project.
// ============================================================================

const SUPABASE_URL = 'https://zllafdlsatueezldoxlh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yu_ioWEZU3TS0302OrHSfA_cu1zNVv1';

// Quien puede subir páginas: mismos roles que el formulario de cómics.
const ALLOWED_EMAILS = new Set([
  'owlmclyrics@gmail.com',
  'mabner112@gmail.com',
  'crow.comics.01@gmail.com',
]);

const jsonResponse = (status, message) =>
  new Response(message, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });

const jsonOk = (data) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

/** Verifica el token de sesión de Supabase que manda el cliente y confirma
    que el email es admin/colaborador. Devuelve el email o null. */
const verifyAdmin = async (request) => {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = await res.json();
    const email = String(user?.email || '').toLowerCase();
    return ALLOWED_EMAILS.has(email) ? email : null;
  } catch {
    return null;
  }
};

/** Paths válidos: chapters/<comicId>/<uploadId>/pNNN.webp — el id admite
    UUIDs de la base y los ids temporales de tomos recién creados en el form
    (new_ch_...), que reciben UUID real al guardar pero conservan las URLs. */
const validPath = (path) =>
  /^chapters\/[A-Za-z0-9_-]+\/[a-z0-9]+\/p\d{3,4}\.webp$/.test(path);

/** Ruta limpia dentro del bucket (sin /media/ ni query). */
const objectPathOf = (url) => {
  const segments = url.pathname.split('/').filter(Boolean); // ['media', ...path]
  return segments.slice(1).join('/');
};

export const onRequestGet = async ({ request, env, waitUntil }) => {
  const bucket = env.MEDIA;
  if (!bucket) return jsonResponse(500, 'Falta el binding MEDIA (bucket R2)');

  const path = objectPathOf(new URL(request.url));
  if (!validPath(path)) return jsonResponse(400, 'Path invalido');

  // Cache en el edge: las páginas son inmutables (uploadId en el path).
  const cache = caches.default;
  try {
    const cached = await cache.match(request);
    if (cached) return cached;
  } catch {
    // sin caché disponible, seguimos directo
  }

  const object = await bucket.get(path);
  if (!object) return jsonResponse(404, 'No encontrado');

  const response = new Response(object.body, {
    status: 200,
    headers: {
      'content-type': 'image/webp',
      'cache-control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
  });
  try {
    const put = cache.put(request, response.clone());
    if (typeof waitUntil === 'function') waitUntil(put);
    else await put;
  } catch {
    // si no se pudo cachear, la imagen igual sale
  }
  return response;
};

export const onRequestPut = async ({ request, env }) => {
  const bucket = env.MEDIA;
  if (!bucket) return jsonResponse(500, 'Falta el binding MEDIA (bucket R2)');

  const admin = await verifyAdmin(request);
  if (!admin) return jsonResponse(403, 'Solo admins pueden subir paginas');

  const url = new URL(request.url);
  const path = (url.searchParams.get('path') || '').trim();
  if (!validPath(path)) return jsonResponse(400, 'Path invalido');

  const body = await request.arrayBuffer();
  // Tocho sano: una página WebP ~200KB; rechazamos basura gigante.
  if (body.byteLength === 0) return jsonResponse(400, 'Body vacio');
  if (body.byteLength > 3 * 1024 * 1024) return jsonResponse(413, 'Pagina demasiado grande (max 3MB)');

  await bucket.put(path, body);
  return jsonOk({ ok: true, path });
};
