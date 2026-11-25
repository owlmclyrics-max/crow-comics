// ============================================================================
// v0.9.9.7: Proxy de imágenes externas.
//
// Fandom (static.wikia.nocookie.net) bloquea los hotlinks de forma errática:
// la misma URL responde 200 en un dispositivo (con la imagen ya en caché) y
// 403 en otro (pedido fresco), apareciendo el placeholder gris de imagen
// rota. Esta function hace de puente: el navegador pide /img?u=<url> a
// NUESTRO dominio, nosotros traemos la imagen del origen con cabeceras de
// navegador y la servimos con caché larga (el navegador y el edge de
// Cloudflare la guardan un mes; las portadas no cambian).
//
// Solo se permiten hosts de la lista blanca para que nadie use /img como
// proxy abierto. Si agregás otra fuente de imágenes (p. ej. otro hosting),
// sumá su dominio acá Y en PROXY_HOSTS de src/lib/imageUrl.ts.
// ============================================================================

const ALLOWED_HOSTS = new Set([
  'static.wikia.nocookie.net',
  'vignette.wikia.nocookie.net',
  'i.redd.it',
  'preview.redd.it',
  'external-preview.redd.it',
  'i.imgur.com',
  'upload.wikimedia.org',
  'blogger.googleusercontent.com',
  'lh3.googleusercontent.com',
  'i.pinimg.com',
  'static.comicvine.com',
  'comicvine.gamespot.com',
  'm.media-amazon.com',
  'images-na.ssl-images-amazon.com',
  'i.annihil.us',
  'images.unsplash.com',
]);

// UA de navegador: algunos orígenes rechazan clientes "raros" (curl, bots).
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const jsonResponse = (status, message) =>
  new Response(message, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });

/**
 * URLs de Fandom del tipo ".../We3_TPB.jpg/revision/latest?cb=..." responden
 * 404 cuando las pide el worker (el endpoint "revision" de Fastly bloquea
 * IPs de datacenter), pero el archivo original ".../We3_TPB.jpg" sí responde
 * 200. Devolvemos esa variante como respaldo.
 */
const plainFandomUrl = (parsed) => {
  if (!parsed.hostname.endsWith('wikia.nocookie.net')) return null;
  const idx = parsed.pathname.indexOf('/revision/');
  if (idx < 0) return null;
  const plain = new URL(parsed.toString());
  plain.pathname = parsed.pathname.slice(0, idx);
  plain.search = '';
  return plain.toString();
};

/**
 * Fandom le entrega al worker una versión diminuta (200px) de la portada.
 * wsrv.nl (proxy de imágenes público) sí obtiene la original completa, así
 * que para Fandom pedimos por ahí. `we` evita agrandar: si la original mide
 * 465px, devuelve 465px nítidos en vez de un upscale borroso.
 */
const wsrvFandomUrl = (parsed) => {
  const plain = plainFandomUrl(parsed) ?? parsed.toString();
  const noScheme = plain.replace(/^https?:\/\//, '');
  return `https://wsrv.nl/?url=${encodeURIComponent(noScheme)}&w=1200&we&output=webp&q=85`;
};

const isImageResponse = (res) =>
  res.ok && (res.headers.get('content-type') || '').startsWith('image/');

/**
 * Trae la imagen del origen con reintentos: Fandom (Fastly) limita las
 * ráfagas — si el home pide 8 portadas a la vez, alguna responde 403/429.
 * Reintenta 2 veces con espera creciente en esos casos.
 */
const fetchUpstream = async (url) => {
  const headers = {
    'user-agent': BROWSER_UA,
    referer: 'https://crow-comics.pages.dev/',
    accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  };

  // Fandom: wsrv primero (la original completa), después el archivo directo.
  const candidates = [];
  if (url.hostname.endsWith('wikia.nocookie.net')) {
    candidates.push(wsrvFandomUrl(url));
  }
  const fallback = plainFandomUrl(url);
  if (fallback) candidates.push(fallback);
  candidates.push(url.toString());

  let lastStatus = 502;
  for (const candidate of candidates) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
      try {
        const res = await fetch(candidate, { headers });
        if (isImageResponse(res)) return res;
        lastStatus = res.status;
        // 4xx definitivos (400/404/etc.) no mejoran con reintento
        if (res.status !== 403 && res.status !== 429 && res.status < 500) break;
      } catch {
        lastStatus = 502;
      }
    }
  }
  return new Response(null, { status: lastStatus });
};

export const onRequestGet = async ({ request, waitUntil }) => {
  const url = new URL(request.url);
  const target = (url.searchParams.get('u') || '').trim();

  if (!target) return jsonResponse(400, 'Falta el parametro u');
  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return jsonResponse(400, 'URL invalida');
  }
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return jsonResponse(400, 'Host no permitido');
  }

  // Caché en el edge de Cloudflare: cada URL se trae del origen UNA vez y
  // después se sirve directo del edge (y el navegador la guarda un mes).
  const cache = caches.default;
  try {
    const cached = await cache.match(request);
    if (cached) return cached;
  } catch {
    // sin caché disponible, seguimos directo
  }

  const upstream = await fetchUpstream(parsed);
  if (!upstream.ok) {
    return jsonResponse(upstream.status, `El origen respondio ${upstream.status}`);
  }

  const response = new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'image/jpeg',
      'cache-control': 'public, max-age=2592000, s-maxage=2592000',
    },
  });
  try {
    if (typeof waitUntil === 'function') {
      waitUntil(cache.put(request, response.clone()));
    } else {
      await cache.put(request, response.clone());
    }
  } catch {
    // si no se pudo cachear, la imagen igual sale
  }
  return response;
};
