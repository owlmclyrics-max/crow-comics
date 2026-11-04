import React, { useState, useEffect, useMemo } from 'react';
import type { Comic, Chapter, ChapterWithComic } from '../types/comic';
import { toChapterWithComic } from '../lib/comicUtils';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Flame,
  ArrowRight,
  BookOpen
} from 'lucide-react';

interface SteamHeroCarouselProps {
  comics: Comic[];
  onSelectChapter?: (chapter: ChapterWithComic) => void;
  onExplorePublishers: () => void;
}

export const SteamHeroCarousel: React.FC<SteamHeroCarouselProps> = ({
  comics,
  onSelectChapter,
  onExplorePublishers
}) => {
  // Crear lista plana de capítulos con información del cómic.
  // REGLAS:
  //  - Recencia = fecha más confiable disponible (release_date > created_at).
  //    Así, un capítulo sin release_date asignado NO queda al fondo.
  //  - SOLO UN capítulo por cómic: el más reciente de cada serie. Si se
  //    publican 3 tomos seguidos del mismo cómic, el carrusel no se satura.
  const recentChapters = useMemo(() => {
    type RecentChapter = ChapterWithComic & { _ts: number };

    const chapterTs = (c: Chapter): number => {
      const rd = c.release_date ? new Date(c.release_date).getTime() : 0;
      const ca = c.created_at ? new Date(c.created_at).getTime() : 0;
      return Math.max(rd, ca);
    };

    const latestByComic = new Map<string, RecentChapter>();
    comics.forEach(comic => {
      comic.chapters?.forEach(chapter => {
        const ts = chapterTs(chapter);
        const existing = latestByComic.get(comic.id);
        const isBetter =
          !existing ||
          ts > existing._ts ||
          (ts === existing._ts && chapter.chapter_number > existing.chapter_number);
        if (isBetter) {
          latestByComic.set(comic.id, { ...toChapterWithComic(chapter, comic), _ts: ts });
        }
      });
    });

    // Ordenar por fecha de lanzamiento y tomar los 5 más recientes
    return Array.from(latestByComic.values())
      .sort((a, b) =>
        b._ts - a._ts ||
        b.chapter_number - a.chapter_number ||
        a.comic_title.localeCompare(b.comic_title),
      )
      .slice(0, 5);
  }, [comics]);

  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-slide cada 6 segundos (se reinicia al navegar manualmente)
  useEffect(() => {
    if (recentChapters.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % recentChapters.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [recentChapters.length, activeIndex]);

  if (recentChapters.length === 0) {
    // Fallback: mostrar cómics directamente si no hay tomos cargados
    if (comics.length === 0) return null;
    return (
      <div className="relative rounded-3xl bg-surface border border-line/90 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={comics[0].cover_url}
            alt={comics[0].title}
            className="w-full h-full object-cover blur-2xl scale-125 opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-surface/80 to-bg/60" />
        </div>
        <div className="relative p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-8 z-10">
          <div className="aspect-[2/3] w-36 sm:w-44 rounded-2xl overflow-hidden border-2 border-line shadow-2xl shrink-0">
            <img src={comics[0].cover_url} alt={comics[0].title} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 space-y-4 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-3 py-1 text-xs font-bold uppercase rounded-lg bg-amber-500 text-zinc-950">{comics[0].publisher}</span>
              <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-raised text-accent border border-accent/30">{comics[0].tag}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight">{comics[0].title}</h2>
            <p className="text-sm text-mute leading-relaxed max-w-2xl line-clamp-3">{comics[0].synopsis}</p>
            <div className="flex items-center justify-center sm:justify-start gap-2 pt-2">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-raised text-mute text-xs border border-line">
                <BookOpen className="w-4 h-4" />
                Próximamente tomos disponibles
              </span>
              <button
                onClick={onExplorePublishers}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent2 text-onaccent text-xs font-bold transition-all"
              >
                <ArrowRight className="w-4 h-4" />
                Ver Catálogo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentIndex = Math.min(activeIndex, recentChapters.length - 1);
  const current = recentChapters[currentIndex];

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % recentChapters.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + recentChapters.length) % recentChapters.length);
  };

  return (
    <div className="relative rounded-3xl bg-surface border border-accent/25 shadow-2xl overflow-hidden group smooth-transition-slow">
      {/* Línea de luz superior del acento (marco "neón" del card) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />

      {/* Contador de posición estilo gestor de UI (01 / 05) */}
      <div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
        <span className="inline-flex items-center rounded-full border border-white/15 bg-black/40 px-3 py-1 font-mono text-[11px] font-bold tracking-widest text-white/90 shadow-lg backdrop-blur-md">
          {String(currentIndex + 1).padStart(2, '0')}
          <span className="mx-1 text-white/40">/</span>
          {String(recentChapters.length).padStart(2, '0')}
        </span>
      </div>

      {/* Fondo cinemático desenfocado dinámico del cómic activo con parallax */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none parallax-container">
        <img
          key={current.id}
          src={current.cover_url || current.comic_cover_url}
          alt={current.title}
          className="w-full h-full object-cover blur-2xl scale-125 opacity-25 transition-all duration-700 ease-out parallax-layer animate-parallax-float"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-surface/80 to-bg/60" />
      </div>

      {/* ── Flechas de navegación flotantes a media altura ── */}
      {/* Discos glass grandes al costado del card, estilo Steam/gestor de   */}
      {/* UI: en escritorio aparecen al pasar el cursor; en móvil siempre    */}
      {/* visibles. Al hover se visten del acento. */}
      {recentChapters.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Anterior novedad"
            title="Anterior"
            className="absolute left-2 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/90 shadow-xl backdrop-blur-md transition-all duration-200 opacity-100 active:scale-95 hover:scale-110 hover:border-accent hover:bg-accent hover:text-onaccent hover:shadow-accent/50 sm:left-4 sm:h-12 sm:w-12 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Siguiente novedad"
            title="Siguiente"
            className="absolute right-2 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/90 shadow-xl backdrop-blur-md transition-all duration-200 opacity-100 active:scale-95 hover:scale-110 hover:border-accent hover:bg-accent hover:text-onaccent hover:shadow-accent/50 sm:right-4 sm:h-12 sm:w-12 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </>
      )}

      <div className="relative p-5 sm:p-8 md:p-10 flex flex-col lg:flex-row gap-6 sm:gap-8 items-center z-10 animate-fade-in">
        {/* LADO IZQUIERDO: Portada Principal Vertical con badge de Novedad */}
        <div
          key={current.id}
          onClick={() => onSelectChapter?.(current)}
          className="relative aspect-[2/3] w-48 sm:w-56 md:w-64 rounded-2xl overflow-hidden border-2 border-accent/30 shadow-2xl bg-bg shrink-0 cursor-pointer group/cover transform hover:scale-[1.03] smooth-transition animate-scale-in"
        >
          <img
            src={current.cover_url || current.comic_cover_url}
            alt={current.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover/cover:scale-105"
          />

          {/* Badge de Novedad / Destacado estilo Steam */}
          <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
            <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-accent text-onaccent shadow-md flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-onaccent" />
              Tomo #{current.chapter_number}
            </span>
            {current.comic_publisher && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-bg/90 backdrop-blur-md text-amber-400 border border-amber-500/30">
                {current.comic_publisher}
              </span>
            )}
          </div>

          <div className="absolute bottom-3 right-3">
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-bg/80 backdrop-blur-md text-ink border border-line">
              {current.comic_status}
            </span>
          </div>
        </div>

        {/* LADO DERECHO: Información, Sinopsis, Tomos y Botones (re-anima al cambiar de slide) */}
        <div key={current.id} className="flex-1 space-y-4 text-center lg:text-left animate-fade-in">
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Recién Publicado · {current.comic_tag}
            </div>
            {current.comic_year && (
              <span className="text-xs text-mute font-mono">
                · {current.comic_year}
              </span>
            )}
          </div>

          <div>
            <h2
              onClick={() => onSelectChapter?.(current)}
              className="text-2xl sm:text-4xl font-black text-ink tracking-tight cursor-pointer hover:text-accent2 transition-colors line-clamp-1 flex items-baseline gap-2 sm:gap-3"
            >
              <span className="text-accent group-hover:text-accent2 leading-none">#{current.chapter_number}</span>
              <span className="truncate">{current.title}</span>
            </h2>
            <p className="text-xs sm:text-sm text-mute italic mt-0.5">
              {current.comic_title}
            </p>
          </div>

          {/* Sinopsis destacada */}
          <p className="text-xs sm:text-sm text-mute leading-relaxed line-clamp-3 sm:line-clamp-4 max-w-2xl bg-bg/40 p-4 rounded-2xl border border-line/80 text-left">
            {current.comic_synopsis}
          </p>

          {/* Metadata de Guión y Maquetación */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-mute">
            <span>
              <strong className="text-mute">Guion:</strong> {current.comic_writer}
            </span>
            <span>•</span>
            <span>
              <strong className="text-mute">Maqueta:</strong> <span className="text-accent">{current.comic_translator_typesetter}</span>
            </span>
            {current.pages_count && (
              <>
                <span>•</span>
                <span className="text-mute font-medium">
                  {current.pages_count} páginas
                </span>
              </>
            )}
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
            <button
              onClick={() => onSelectChapter?.(current)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent2 text-onaccent font-bold text-xs shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95"
            >
              <BookOpen className="w-4 h-4" />
              <span>Ver Tomo & Descargas</span>
            </button>

            <button
              onClick={onExplorePublishers}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-raised hover:bg-ink/10 text-mute hover:text-ink font-semibold text-xs transition-colors border border-line"
            >
              <span>Ver por Editoriales</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Miniaturas Inferiores estilo Selector de Steam */}
      {recentChapters.length > 1 && (
        <div className="border-t border-accent/20 bg-bg/70 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none flex-1">
            <span className="text-[11px] font-bold text-mute uppercase tracking-wider mr-2 shrink-0 hidden sm:inline">
              Últimas 5 Novedades:
            </span>
            {recentChapters.map((chapter, idx) => {
              const isActive = currentIndex === idx;
              return (
                <button
                  key={chapter.id}
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Ir a ${chapter.title}`}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all shrink-0 border active:scale-95 ${
                    isActive
                      ? 'bg-raised border-accent text-ink shadow-md shadow-accent/20'
                      : 'bg-surface/60 border-line/80 text-mute hover:text-ink hover:bg-raised'
                  }`}
                >
                  <img
                    src={chapter.cover_url || chapter.comic_cover_url}
                    alt={chapter.title}
                    className={`w-5 h-7 object-cover rounded shrink-0 transition-all ${isActive ? 'ring-1 ring-accent' : 'opacity-70'}`}
                  />
                  <span className="text-xs font-semibold truncate max-w-[120px] sm:max-w-[160px]">
                    {chapter.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
