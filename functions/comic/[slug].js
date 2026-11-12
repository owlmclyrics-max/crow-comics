// ============================================================================
// Preview de Discord/WhatsApp para links de cómics compartidos:
//   GET /comic/<slug>  →  HTML con OG tags + salto a #/comic/<slug>
// ============================================================================
import { comicSlugOf, loadComics, loadChapters, trim, embedPage, htmlResponse } from './_shared.js';

export async function onRequestGet(context) {
  const slug = context.params.slug;
  const origin = new URL(context.request.url).origin;
  try {
    const comics = await loadComics();
    const comic =
      comics.find((c) => c.id === slug) ??
      comics.find((c) => comicSlugOf(c, comics) === slug);
    if (!comic) {
      return htmlResponse(
        embedPage({
          title: 'Cómic no encontrado — Crow Comics',
          description: 'Ese link no corresponde a ningún cómic del catálogo.',
          image: `${origin}/crow-512.png`,
          redirect: `${origin}/#/comics`,
        }),
      );
    }
    const slugUrl = comicSlugOf(comic, comics);
    const count = await loadChapters(comic.id).catch(() => []);
    const parts = [
      comic.publisher,
      comic.year ? `Año ${comic.year}` : null,
      count.length ? `${count.length} ${count.length === 1 ? 'tomo' : 'tomos'}` : null,
    ].filter(Boolean);
    return htmlResponse(
      embedPage({
        title: comic.title,
        description:
          trim(comic.synopsis, 160) ||
          `${parts.join(' · ')} — leélo en Crow Comics`,
        image: comic.cover_url,
        redirect: `${origin}/#/comic/${slugUrl}`,
      }),
    );
  } catch (err) {
    return htmlResponse(
      embedPage({
        title: 'Crow Comics',
        description: `Error: ${err instanceof Error ? err.message : String(err)} (v3)`,
        image: `${origin}/crow-512.png`,
        redirect: `${origin}/#/inicio`,
      }),
    );
  }
}
