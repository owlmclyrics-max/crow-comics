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
 * Trae la imagen del origen con reintentos: Fandom (Fastly) limita las
 * ráfagas — si el home pide 8 portadas a la vez, alguna responde 403/429.
 * Reintenta 2 veces con espera creciente en esos casos.
 */
const fetchUpstream = async (target) => {
  const headers = {
    'user-agent': BROWSER_UA,
    referer: 'https://crow-comics.pages.dev/',
    accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  };
  let lastStatus = 502;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
    try {
      const res = await fetch(target, { headers });
      if (res.ok) return res;
      lastStatus = res.status;
      // 4xx definitivos (400/404/etc.) no mejoran con reintento
      if (res.status !== 403 && res.status !== 429 && res.status < 500) return res;
    } catch {
      lastStatus = 502;
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

  const upstream = await fetchUpstream(parsed.toString());
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
