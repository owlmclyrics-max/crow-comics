// ============================================================================
// Preview de Discord/WhatsApp para tomos compartidos:
//   GET /comic/<slug>/tomo-<n>  →  OG tags con tomo, editorial y año
// ============================================================================
import { comicSlugOf, loadComics, loadChapters, embedPage, htmlResponse } from '../_shared.js';

export async function onRequestGet(context) {
  const { slug, chapter } = context.params;
  const origin = new URL(context.request.url).origin;
  const backToComic = `${origin}/#/comics`;
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
          redirect: backToComic,
        }),
      );
    }
    const slugUrl = comicSlugOf(comic, comics);
    const chapters = await loadChapters(comic.id).catch(() => []);
    const chapterSlug = (ch) => `tomo-${ch.chapter_number}`;
    const chapterRef = Array.isArray(chapter) ? chapter.join('/') : String(chapter ?? '');
    const chapterRow =
      chapters.find((ch) => ch.id === chapterRef) ??
      chapters.find((ch) => chapterSlug(ch) === chapterRef);

    const title = chapterRow
      ? `${comic.title} — Tomo #${chapterRow.chapter_number}`
      : comic.title;
    const meta = [
      comic.publisher,
      comic.year ? `Año ${comic.year}` : null,
      chapterRow && chapterRow.title ? chapterRow.title : null,
    ]
      .filter(Boolean)
      .join(' · ');
    return htmlResponse(
      embedPage({
        title,
        description: meta || 'Leelo online en Crow Comics',
        image: (chapterRow && chapterRow.cover_url) || comic.cover_url,
        redirect: chapterRow
          ? `${origin}/#/comic/${slugUrl}/${chapterSlug(chapterRow)}`
          : `${origin}/#/comic/${slugUrl}`,
      }),
    );
  } catch (err) {
    return htmlResponse(
      embedPage({
        title: 'Crow Comics',
        description: 'Catálogo de cómics para leer online.',
        image: `${origin}/crow-512.png`,
        redirect: `${origin}/#/inicio`,
      }),
    );
  }
}
