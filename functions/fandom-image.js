// ============================================================================
// v0.11.0: proxy para imágenes de Fandom (portadas).
//
// Fandom bloquea el hotlink directo (403 si el Referer no es de ellos), por
// eso la portada importada se veía rota. Esta function descarga la imagen
// con UA de navegador + Referer de Fandom y la sirve con CORS habilitado.
//
// El formulario la usa para "espejar" la portada en nuestro Storage
// (bucket comic-images) y, si eso falla, deja este proxy como respaldo.
//
// Solo se permiten hosts de imágenes de Fandom para no ser un proxy abierto.
// ============================================================================

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const isAllowedImageUrl = (parsed) =>
  parsed.protocol === 'https:' &&
  (parsed.hostname === 'static.wikia.nocookie.net' ||
    parsed.hostname.endsWith('.wikia.nocookie.net') ||
    parsed.hostname === 'static.wikia.com');

// Fandom /revision/latest responde 404 desde el worker y el archivo directo
// llega en 200px. wsrv.nl sí entrega la original completa (sin agrandar).
const plainFandomUrl = (parsed) => {
  const idx = parsed.pathname.indexOf('/revision/');
  if (idx < 0) return null;
  const plain = new URL(parsed.toString());
  plain.pathname = parsed.pathname.slice(0, idx);
  plain.search = '';
  return plain;
};

const wsrvFandomUrl = (parsed) => {
  const plain = (plainFandomUrl(parsed) ?? parsed).toString().replace(/^https?:\/\//, '');
  return `https://wsrv.nl/?url=${encodeURIComponent(plain)}&w=1200&we&output=webp&q=85`;
};

const fetchImage = async (parsed) => {
  const headers = {
    'user-agent': BROWSER_UA,
    accept: 'image/avif,image/webp,image/png,image/jpeg,*/*',
    referer: 'https://crow-comics.pages.dev/',
  };
  const plain = plainFandomUrl(parsed);
  const candidates = [wsrvFandomUrl(parsed)];
  if (plain) candidates.push(plain.toString());
  candidates.push(parsed.toString());
  let last = null;
  for (const candidate of candidates) {
    const res = await fetch(candidate, { headers });
    const type = res.headers.get('content-type') || '';
    if (res.ok && res.body && type.startsWith('image/')) return res;
    last = res;
  }
  return last;
};

export const onRequestGet = async ({ request }) => {
  const url = new URL(request.url);
  const target = (url.searchParams.get('u') || '').trim();

  if (!target) {
    return new Response('Falta el parametro u', { status: 400 });
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return new Response('URL invalida', { status: 400 });
  }
  if (!isAllowedImageUrl(parsed)) {
    return new Response('Solo se permiten imagenes de Fandom', { status: 400 });
  }

  let upstream;
  try {
    upstream = await fetchImage(parsed);
  } catch {
    return new Response('No se pudo descargar la imagen', { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response('Fandom no devolvio la imagen', { status: upstream.status || 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'image/jpeg',
      'cache-control': 'public, max-age=604800, s-maxage=604800, immutable',
      'access-control-allow-origin': '*',
    },
  });
};
