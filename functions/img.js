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

export const onRequestGet = async ({ request }) => {
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

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        'user-agent': BROWSER_UA,
        referer: `${parsed.protocol}//${parsed.hostname}/`,
        accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });
    if (!upstream.ok) {
      return jsonResponse(upstream.status, `El origen respondio ${upstream.status}`);
    }
    // Pasamos el body directo y dejamos que el edge cachee un mes.
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') || 'image/jpeg',
        'cache-control': 'public, max-age=2592000, s-maxage=2592000',
      },
    });
  } catch (err) {
    return jsonResponse(
      502,
      `No se pudo traer la imagen: ${err && err.message ? err.message : 'error desconocido'}`,
    );
  }
};
