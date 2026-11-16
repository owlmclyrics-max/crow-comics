// ============================================================================
// v0.9.9.9.5: Importador de datos desde Fandom (vía API oficial).
//
// El formulario de cómics pega un link de una página de cómic de Fandom
// (p. ej. https://dc.fandom.com/wiki/Red_Lanterns_Vol_1_1) y esta function
// devuelve { title, image, description, writer, artist }.
//
// v0.9.9.9.5: el scraping del HTML recibía 403 (Fandom bloquea IPs de
// datacenter). Ahora usamos api.php, la API MediaWiki oficial de Fandom:
//   1) action=query&prop=pageimages  → título + portada original
//   2) action=parse&prop=wikitext&section=0 → la plantilla de cómic trae
//      Writer1_1, Penciler1_1 y Synopsis1 estructurados → writer/artist/desc
//
// Solo se permiten páginas de *.fandom.com/wiki/ para que nadie use /fandom
// como proxy abierto.
// ============================================================================

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

/** GET con UA de navegador + reintentos cortos (Fandom a veces tira 429). */
const fetchApi = async (url) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 350 * attempt));
    try {
      const res = await fetch(url, {
        headers: {
          'user-agent': BROWSER_UA,
          accept: 'application/json',
          referer: 'https://crow-comics.pages.dev/',
        },
      });
      if (res.ok) return res;
      if (res.status !== 429 && res.status < 500) return res; // 4xx definitivo
    } catch {
      // reintenta
    }
  }
  return undefined;
};

/** Quita la sintaxis wiki de un valor de plantilla: [[enlaces]], {{plantillas}},
    comentarios y referencias dejan solo el texto legible. */
const cleanWikitext = (raw) =>
  raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<nowiki>[\s\S]*?<\/nowiki>/gi, '')
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1') // [[a|b]] → b
    .replace(/\[\[([^\]]+)\]\]/g, '$1')               // [[a]] → a
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

/** Primer valor de una lista de campos de plantilla tipo "| Writer1_1 = X".
    Acepta variantes de número (Writer1_1, Writer2_1, Penciler1_1…). */
const firstTemplateValue = (wikitext, fieldRegexes) => {
  for (const re of fieldRegexes) {
    const m = wikitext.match(re);
    if (m && m[1]) {
      const cleaned = cleanWikitext(m[1]);
      if (cleaned) return cleaned;
    }
  }
  return undefined;
};

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

  const title = decodeURIComponent(parsed.pathname.replace(/^\/wiki\//, '')).replace(/_/g, ' ');
  const apiBase = `${parsed.protocol}//${parsed.hostname}/api.php`;

  // 1) Título + portada original (pageimages)
  let image;
  const metaUrl =
    `${apiBase}?action=query&format=json&prop=pageimages` +
    `&piprop=original&titles=${encodeURIComponent(parsed.pathname.replace(/^\/wiki\//, ''))}`;
  const metaRes = await fetchApi(metaUrl);
  if (!metaRes || !metaRes.ok) {
    return jsonResponse(metaRes?.status ?? 502, 'Fandom no respondio a la API');
  }
  try {
    const metaJson = await metaRes.json();
    const pages = metaJson?.query?.pages ?? {};
    for (const page of Object.values(pages)) {
      const original = page?.original?.source || page?.thumbnail?.source;
      if (original) {
        image = original;
        break;
      }
    }
  } catch {
    // seguimos sin imagen — el admin la puede pegar a mano
  }

  // 2) Plantilla del tomo (wikitexto de la sección 0): writer, artist, synopsis
  let description;
  let writer;
  let artist;
  const parseUrl =
    `${apiBase}?action=parse&format=json&prop=wikitext&section=0&page=` +
    encodeURIComponent(parsed.pathname.replace(/^\/wiki\//, ''));
  const parseRes = await fetchApi(parseUrl);
  if (parseRes && parseRes.ok) {
    try {
      const parseJson = await parseRes.json();
      const wikitext = parseJson?.parse?.wikitext?.['*'] || '';
      if (wikitext) {
        description = firstTemplateValue(wikitext, [
          /\|\s*Synopsis1\s*=\s*([^\n]+)/i,
          /\|\s*StorySynopsis\s*=\s*([^\n]+)/i,
          /\|\s*Synopsis\s*=\s*([^\n]+)/i,
        ]);
        writer = firstTemplateValue(wikitext, [
          /\|\s*Writer1_1\s*=\s*([^\n]+)/i,
          /\|\s*Writer\d+_\d+\s*=\s*([^\n]+)/i,
          /\|\s*Writer\s*=\s*([^\n]+)/i,
        ]);
        artist = firstTemplateValue(wikitext, [
          /\|\s*Penciler1_1\s*=\s*([^\n]+)/i,
          /\|\s*Artist1_1\s*=\s*([^\n]+)/i,
          /\|\s*Penciler\d+_\d+\s*=\s*([^\n]+)/i,
          /\|\s*Artist\d+_\d+\s*=\s*([^\n]+)/i,
        ]);
      }
    } catch {
      // sin plantilla parseable — campos vacíos, el admin los completa
    }
  }

  const data = {
    title,
    image,
    description,
    writer,
    artist,
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
