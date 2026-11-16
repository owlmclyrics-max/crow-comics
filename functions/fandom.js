// ============================================================================
// v0.9.9.9.4: Importador de datos desde Fandom.
//
// El formulario de cómics pega un link de una página de cómic de Fandom
// (p. ej. https://dc.fandom.com/wiki/Red_Lanterns_Vol_1_1) y esta function
// le lee las meta-tags Open Graph (título, portada, sinopsis) para que el
// admin no tenga que copiar campo por campo.
//
// Solo se permiten páginas de *.fandom.com/wiki/ para que nadie use /fandom
// como proxy abierto. Devuelve JSON con { title, image, description }.
// ============================================================================

// UA de navegador: Fandom rechaza clientes "raros" (curl, bots).
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const jsonResponse = (status, message) =>
  new Response(message, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });

const isAllowedFandomUrl = (parsed) =>
  parsed.protocol === 'https:' &&
  (parsed.hostname === 'fandom.com' || parsed.hostname.endsWith('.fandom.com')) &&
  parsed.pathname.startsWith('/wiki/');

/** Extrae el content de una meta property/content (en cualquiera de los dos
    órdenes de atributos) de un HTML. */
const pickMeta = (html, prop) => {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${prop}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return m[1];
  }
  return undefined;
};

// Las meta-tags vienen con entidades HTML básicas (&amp; &#39; etc.).
const decodeEntities = (text) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x0?27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');

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
  if (!isAllowedFandomUrl(parsed)) {
    return jsonResponse(400, 'Solo se permiten paginas de wiki de Fandom');
  }

  let html;
  try {
    const res = await fetch(parsed.toString(), {
      headers: {
        'user-agent': BROWSER_UA,
        referer: 'https://crow-comics.pages.dev/',
        accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    if (!res.ok) return jsonResponse(res.status, `Fandom respondio ${res.status}`);
    html = await res.text();
  } catch {
    return jsonResponse(502, 'No se pudo traer la pagina de Fandom');
  }

  const image = pickMeta(html, 'og:image') || pickMeta(html, 'twitter:image');
  // og:image suele traer una versión reducida (scale-to-width-down); si hay
  // variantes, preferimos la original quitando ese sufijo cuando existe.
  const cleanedImage = image ? image.replace(/\/scale-to-width-down\/\d+/, '') : undefined;

  const data = {
    title: decodeEntities(pickMeta(html, 'og:title') || ''),
    image: cleanedImage,
    description: decodeEntities(pickMeta(html, 'og:description') || ''),
  };

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=86400, s-maxage=86400',
      'access-control-allow-origin': '*',
    },
  });
};
