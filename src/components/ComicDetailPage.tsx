import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Comic, Chapter } from '../types/comic';
import { CrowAmbience } from './ui/CrowAmbience';
import {
  ArrowLeft,
  User,
  Feather,
  ExternalLink,
  Download,
  Edit3,
  Trash2,
  Layers,
  Sparkles,
  Star,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useComics } from '../context/ComicsContext';
import { CommentsSection } from './CommentsSection';
import { StarRating } from './ui/StarRating';
import { FavoriteButton, OPEN_AUTH_EVENT } from './FavoriteButton';
import { FollowButton } from './FollowButton';
import { useFollows } from '../context/FollowsContext';
import { newChaptersOf } from '../lib/follows';
import { AddToListModal } from './AddToListModal';
import { getReadingProgressForComic } from '../lib/profile';
import { ListPlus, Bookmark, Share2 } from 'lucide-react';
import { ChaptersModal } from './ChaptersModal';
import { comicShareUrl } from '../lib/share';
import { ShareModal } from './ShareModal';

interface ComicDetailPageProps {
  comic: Comic;
  onBack: () => void;
  onEdit?: (comic: Comic) => void;
  onDelete?: (comic: Comic) => void;
  onOpenChapter?: (chapter: Chapter, comic: Comic) => void;
}

export const ComicDetailPage: React.FC<ComicDetailPageProps> = ({
  comic,
  onBack,
  onEdit,
  onDelete,
  onOpenChapter
}) => {
  const { canManageContent, user } = useAuth();
  const { follows, markSeen } = useFollows();
  const { comics } = useComics();

  // Estado para la calificación del usuario
  const [userRating, setUserRating] = useState(0);

  // Sprint 3: modal de "Añadir a lista"
  const [isAddListOpen, setAddListOpen] = useState(false);

  // Modal de capítulos
  const [isChaptersModalOpen, setIsChaptersModalOpen] = useState(false);
  // v0.9.9.5: modal de compartir (link + copiar)
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Fila horizontal de capítulos (igual que el reparto de personajes):
  // flechas ← → que se muestran solo si hay capítulos fuera de la vista.
  const chaptersScrollerRef = useRef<HTMLDivElement>(null);
  const [chapterScroll, setChapterScroll] = useState({ left: false, right: false });

  const updateChapterScroll = useCallback(() => {
    const el = chaptersScrollerRef.current;
    if (!el) return;

    setChapterScroll({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    const el = chaptersScrollerRef.current;
    if (!el) return;

    updateChapterScroll();
    el.addEventListener('scroll', updateChapterScroll, { passive: true });

    const observer = new ResizeObserver(updateChapterScroll);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', updateChapterScroll);
      observer.disconnect();
    };
  }, [updateChapterScroll, comic.chapters?.length]);

  // Cómic seguido: al VISITARLO, sus capítulos actuales dejan de ser "nuevos"
  // (limpia el pendiente de la campana y de las tarjetas).
  const pendingNew = newChaptersOf(comic, follows.get(comic.id)).length;
  useEffect(() => {
    if (pendingNew > 0) markSeen(comic.id);
  }, [comic.id, pendingNew, markSeen]);

  const scrollChapters = (direction: -1 | 1) => {
    const el = chaptersScrollerRef.current;
    if (!el) return;

    el.scrollBy({
      left: direction * Math.max(el.clientWidth * 0.8, 240),
      behavior: 'smooth',
    });
  };

  // Sprint 3.5: marcadores de lectura por capítulo (page_number por chapter_id)
  // y el capítulo abierto más recientemente → "Continúas aquí"
  const [chapterMarkers, setChapterMarkers] = useState<Record<string, number | undefined>>({});
  const [lastReadChapterId, setLastReadChapterId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setChapterMarkers({});
    setLastReadChapterId(null);
    if (!user?.id) return;

    getReadingProgressForComic(user.id, comic.id).then((rows) => {
      if (cancelled || rows.length === 0) return;
      const markers: Record<string, number | undefined> = {};
      rows.forEach((row) => { markers[row.chapter_id] = row.page_number; });
      setChapterMarkers(markers);
      setLastReadChapterId(rows[0].chapter_id); // rows[0] = actualizado más reciente
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, comic.id]);

  // Scroll to top al montar la página
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const hasFullPack = Boolean(comic.full_download_links && comic.full_download_links.length > 0);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Botón de Regresar Superior */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface hover:bg-raised text-mute hover:text-ink border border-line transition-colors text-xs font-semibold group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-accent" />
          <span>Volver al Directorio</span>
        </button>

        {canManageContent && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit?.(comic)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface hover:bg-raised text-ink text-xs font-semibold transition-colors border border-line"
            >
              <Edit3 className="w-3.5 h-3.5 text-accent" />
              Editar Cómic y Tomos
            </button>
            <button
              onClick={() => onDelete?.(comic)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent/10 hover:bg-accent/15 text-accent2 text-xs font-semibold transition-colors border border-accent/30"
            >
              <Trash2 className="w-3.5 h-3.5 text-accent2" />
              Eliminar Cómic
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* HERO BANNER CON FICHA COMPLETA + DESCARGA + ESTRELLAS      */}
      {/* ======================================================== */}
      <div className="relative rounded-3xl overflow-hidden border border-accent/25 bg-surface shadow-2xl smooth-transition-slow">
        <CrowAmbience glow="right" tint="bold" />
        {/* Fondo con desenfoque de la misma portada con parallax */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none parallax-container">
          <img
            src={comic.cover_url}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover blur-3xl scale-125 opacity-30 parallax-layer animate-parallax-float"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/60 to-transparent" />
        </div>

        <div className="relative p-6 sm:p-10 md:p-12 flex flex-col md:flex-row items-center md:items-end gap-8 z-10 animate-slide-in-left">
          {/* Corazón + Añadir a lista (esquina superior derecha del hero) */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-start gap-2">
            <FavoriteButton comicId={comic.id} size="lg" />
            <FollowButton comicId={comic.id} size="lg" />
            <button
              type="button"
              onClick={() => setIsShareOpen(true)}
              aria-label="Compartir"
              className="w-11 h-11 inline-flex items-center justify-center rounded-full bg-bg/70 backdrop-blur-md border border-line hover:border-accent/50 active:scale-90 transition-all"
              title="Compartir (copia un link con vista previa en Discord)"
            >
              <Share2 className="w-5 h-5 text-mute hover:text-accent transition-colors" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  window.dispatchEvent(new CustomEvent(OPEN_AUTH_EVENT));
                  return;
                }
                setAddListOpen(true);
              }}
              aria-label="Añadir a lista"
              className="w-11 h-11 inline-flex items-center justify-center rounded-full bg-bg/70 backdrop-blur-md border border-line hover:border-accent/50 active:scale-90 transition-all"
              title="Añadir a lista"
            >
              <ListPlus className="w-5.5 h-5.5 text-mute hover:text-accent transition-colors" />
            </button>
          </div>

          {/* Portada Principal Flotante 2:3 */}
          <div className="relative aspect-[2/3] w-48 sm:w-60 md:w-64 rounded-2xl overflow-hidden border-2 border-line shadow-2xl bg-bg shrink-0 transform -rotate-1 hover:rotate-0 smooth-transition">
            <img
              src={comic.cover_url}
              alt={comic.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Información del Cómic */}
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              {comic.publisher && (
                <span className="px-3.5 py-1 text-xs font-bold uppercase rounded-lg bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20">
                  {comic.publisher}
                </span>
              )}
              <span className="px-3 py-1 text-xs font-semibold uppercase rounded-lg bg-surface/90 text-accent border border-accent/30">
                {comic.tag}
              </span>
              <span
                className={`px-3 py-1 text-xs font-medium rounded-lg border ${
                  comic.status === 'En curso'
                    ? 'bg-accent/10 text-accent border-accent/40'
                    : 'bg-raised text-mute border-line'
                }`}
              >
                {comic.status}
              </span>
              {comic.year && (
                <span className="px-3 py-1 text-xs text-mute bg-bg/80 rounded-lg border border-line">
                  Año {comic.year}
                </span>
              )}
            </div>

            <div>
              <h1 className="text-3xl sm:text-5xl font-black text-ink tracking-tight drop-shadow-md">
                {comic.title}
              </h1>
              {comic.original_title && (
                <p className="text-sm sm:text-base text-mute italic mt-1 drop-shadow-sm">
                  {comic.original_title}
                </p>
              )}
            </div>

            <p className="text-xs sm:text-sm text-mute leading-relaxed max-w-3xl bg-bg/60 p-4 sm:p-5 rounded-2xl border border-line text-left break-words">
              {comic.synopsis}
            </p>

            {/* Ficha Técnica Rápida */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-xs text-mute pt-2 border-t border-line">
              <div className="flex items-center gap-1.5">
                <Feather className="w-4 h-4 text-accent" />
                <span><strong className="text-mute">Guion:</strong> {comic.writer}</span>
              </div>
              {comic.artist && (
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span><strong className="text-mute">Arte:</strong> {comic.artist}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-accent" />
                <span><strong className="text-mute">Maqueta / Fansub:</strong> <span className="text-accent font-bold">{comic.translator_typesetter}</span></span>
              </div>
              {/* Rating Display */}
              {comic.average_rating !== undefined && comic.average_rating > 0 && (
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span><strong className="text-mute">Rating:</strong> <span className="text-amber-400 font-bold">{comic.average_rating.toFixed(1)}</span> <span className="text-faint">({comic.total_ratings})</span></span>
                </div>
              )}
              {comic.download_count !== undefined && comic.download_count > 0 && (
                <div className="flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-accent" />
                  <span><strong className="text-mute">Descargas:</strong> <span className="text-accent font-bold">{comic.download_count.toLocaleString()}</span></span>
                </div>
              )}
            </div>

            {/* Botón de Descarga Completa y Estrellas */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {hasFullPack && comic.full_download_links && comic.full_download_links.length > 0 && (
                <a
                  href={comic.full_download_links[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-accent hover:bg-accent2 text-onaccent transition-all shadow-xl shadow-accent/20 hover:scale-105 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Serie Completa</span>
                  <ExternalLink className="w-4 h-4 ml-1 opacity-70" />
                </a>
              )}

              {/* Calificación por estrellas inline */}
              <div className="flex items-center gap-2 bg-bg/60 px-4 py-2 rounded-xl border border-line">
                <span className="text-xs text-mute font-medium">Calificar:</span>
                <StarRating value={userRating} onChange={setUserRating} size="md" showValue />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECCIÓN 1: FILA ÚNICA DE TOMOS INDIVIDUALES               */}
      {/* ======================================================== */}
      <div className="space-y-6">
        <div className="border-b border-line pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-2xl font-black text-ink flex items-center gap-2.5">
              <Layers className="w-6 h-6 text-accent" />
              <span>Tomos y Capítulos Individuales ({comic.chapters?.length || 0})</span>
            </h3>
          </div>
          {comic.chapters && comic.chapters.length > 1 && (
            <button
              onClick={() => setIsChaptersModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-accent hover:bg-accent2 text-onaccent border border-accent/40 transition-all shadow-md shadow-accent/20 group active:scale-95 shrink-0"
            >
              <Layers className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Ver Todos los Capítulos</span>
            </button>
          )}
        </div>
        <p className="text-xs sm:text-sm text-mute">
          Haz clic en cualquier tomo para ver su página exclusiva con detalles y descargas. Desliza con las flechas para explorar la colección completa.
        </p>

        {(!comic.chapters || comic.chapters.length === 0) ? (
          <div className="p-12 text-center rounded-3xl bg-surface/40 border border-line text-mute text-sm">
            Aún no se han publicado tomos individuales para este cómic.
          </div>
        ) : (
          /* Fila Única de Tomos con flechas (como el reparto de personajes) */
          <div className="flex items-center gap-2">
            {(chapterScroll.left || chapterScroll.right) && (
              <button
                type="button"
                onClick={() => scrollChapters(-1)}
                disabled={!chapterScroll.left}
                aria-label="Ver tomos anteriores"
                className="shrink-0 p-2 rounded-full bg-raised hover:bg-raised text-mute disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <div
              ref={chaptersScrollerRef}
              className="flex flex-1 gap-4 sm:gap-6 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {comic.chapters.map((chapter: Chapter) => (
                <article
                  key={chapter.id}
                  onClick={() => onOpenChapter?.(chapter, comic)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Abrir Tomo #${chapter.chapter_number}: ${chapter.title}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenChapter?.(chapter, comic);
                    }
                  }}
                  className="group relative w-40 sm:w-44 shrink-0 rounded-2xl bg-surface border border-line hover:border-accent/40 overflow-hidden smooth-transition flex flex-col cursor-pointer"
                >
                  {/* Portada del Tomo Vertical 2:3 */}
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-bg">
                    <img
                      src={chapter.cover_url || comic.cover_url}
                      alt={chapter.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent opacity-80" />

                    {/* Número del Tomo */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 text-xs font-black uppercase rounded-lg bg-bg/90 text-accent border border-accent/30 backdrop-blur-md">
                        Tomo #{chapter.chapter_number}
                      </span>
                    </div>

                    {/* Sprint 3.5: marcador de lectura sobre la ficha */}
                    {chapter.id === lastReadChapterId ? (
                      <span className="absolute bottom-3 left-3 right-3 inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-black uppercase rounded-lg bg-amber-500 text-zinc-950 shadow-lg">
                        <Bookmark className="w-3 h-3 shrink-0 fill-zinc-950" />
                        Continúas aquí{chapterMarkers[chapter.id] ? ` · pág. ${chapterMarkers[chapter.id]}` : ''}
                      </span>
                    ) : chapterMarkers[chapter.id] ? (
                      <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-bg/90 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                        <Bookmark className="w-2.5 h-2.5" />
                        pág. {chapterMarkers[chapter.id]}
                      </span>
                    ) : null}
                  </div>

                  {/* Título del Tomo */}
                  <div className="p-3 sm:p-4">
                    <h4 className="font-bold text-ink text-sm leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                      {chapter.title}
                    </h4>
                    <p className="text-[11px] text-faint mt-1">
                      Ver detalles
                    </p>
                  </div>
                </article>
              ))}
            </div>

            {(chapterScroll.left || chapterScroll.right) && (
              <button
                type="button"
                onClick={() => scrollChapters(1)}
                disabled={!chapterScroll.right}
                aria-label="Ver más tomos"
                className="shrink-0 p-2 rounded-full bg-raised hover:bg-raised text-mute disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECCIÓN 2: COMENTARIOS DE LA COMUNIDAD                    */}
      {/* ======================================================== */}
      <CommentsSection
        comicId={comic.id}
        rating={userRating}
        onRatingChange={setUserRating}
      />

      {/* Modal "Añadir a lista" (Sprint 3) */}
      <AddToListModal
        isOpen={isAddListOpen}
        onClose={() => setAddListOpen(false)}
        comic={comic}
      />

      {/* v0.9.9.5: compartir con embed de Discord */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        url={comicShareUrl(comic, comics)}
        title={comic.title}
      />

      {/* Modal de Capítulos */}
      {comic.chapters && (
        <ChaptersModal
          isOpen={isChaptersModalOpen}
          chapters={comic.chapters}
          onClose={() => setIsChaptersModalOpen(false)}
          onSelectChapter={(selectedChapter) => {
            setIsChaptersModalOpen(false);
            onOpenChapter?.(selectedChapter, comic);
          }}
        />
      )}
    </div>
  );
};
