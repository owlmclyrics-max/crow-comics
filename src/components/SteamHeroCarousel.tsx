import React, { useState, useEffect, useMemo } from 'react';
import type { Comic, Chapter, ChapterWithComic } from '../types/comic';
import { toChapterWithComic } from '../lib/comicUtils';
import { proxyImageUrl } from '../lib/imageUrl';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Play,
  Pause,
  Info
} from 'lucide-react';

interface SteamHeroCarouselProps {
  comics: Comic[];
  onSelectChapter?: (chapter: ChapterWithComic) => void;
  /** "Más info": abre la ficha completa de la serie (opcional por compat). */
  onSelectComic?: (comic: Comic) => void;
  /** En desuso: se mantiene para no romper a quien ya lo pasaba. */
  onExplorePublishers?: () => void;
}

export const SteamHeroCarousel: React.FC<SteamHeroCarouselProps> = ({
  comics,
  onSelectChapter,
  onSelectComic,
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
  // Control de la rotación automática (WCAG 2.2.2: el movimiento automático
  // debe poder pausarse) y respeto a prefers-reduced-motion.
  const [isPaused, setIsPaused] = useState(false);

  // Auto-slide cada 6 segundos (se reinicia al navegar manualmente)
  useEffect(() => {
    if (recentChapters.length <= 1 || isPaused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % recentChapters.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [recentChapters.length, activeIndex, isPaused]);

  const handleNext = () => setActiveIndex((prev) => (prev + 1) % recentChapters.length);
  const handlePrev = () =>
    setActiveIndex((prev) => (prev - 1 + recentChapters.length) % recentChapters.length);

  if (recentChapters.length === 0) {
    // Fallback cuando no hay tomos publicados (o datos aún cargando):
    // mismo lenguaje full-bleed, destacando el primer cómic del catálogo.
    if (comics.length === 0) return null;
    const fallbackComic = comics[0];
    const fallbackChapter = fallbackComic.chapters?.[0] ?? null;

    return (
      <section
        aria-label="Cómic destacado"
        className="relative overflow-hidden w-[calc(100%_+_1.5rem)] -mx-3 sm:w-[calc(100%_+_3rem)] sm:-mx-6 lg:w-[calc(100%_+_4rem)] lg:-mx-8 h-[70svh] min-h-[500px] bg-surface border-b border-line"
      >
        {fallbackComic.banner_url?.trim() ? (
          <img
            src={proxyImageUrl(fallbackComic.banner_url)}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
        ) : (
          <>
            <img
              src={proxyImageUrl(fallbackComic.cover_url)}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-3xl scale-150 opacity-75"
            />
            <div className="absolute inset-y-0 right-0 h-full w-[68%] sm:w-[48%] lg:w-[42%] max-w-[820px] overflow-hidden [mask-image:linear-gradient(to_right,transparent_0%,black_26%,black_100%)] [mask-repeat:no-repeat] [mask-size:100%_100%]">
              <img
                src={proxyImageUrl(fallbackComic.cover_url)}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover object-top"
              />
            </div>
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/60 to-bg/10" />
        <div className="relative h-full flex flex-col justify-end p-6 sm:p-12 lg:px-16 space-y-3 sm:space-y-4 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-bg/70 backdrop-blur-md border border-line text-ink">
            <Sparkles className="w-3 h-3 text-accent" />
            Del catálogo Crow Comics
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-ink tracking-tight">
            {fallbackComic.title}
          </h2>
          <p className="text-xs sm:text-sm text-mute leading-relaxed line-clamp-3 break-words">
            {fallbackComic.synopsis}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {fallbackChapter && (
              <button
                type="button"
                onClick={() => {
                  if (fallbackChapter) onSelectChapter?.(toChapterWithComic(fallbackChapter, fallbackComic));
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent hover:bg-accent2 text-onaccent text-xs font-bold shadow-lg shadow-accent/20 smooth-transition active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                Leer ahora
              </button>
            )}
            {onSelectComic && (
              <button
                type="button"
                onClick={() => onSelectComic(fallbackComic)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-bg/60 hover:bg-bg/80 backdrop-blur-md border border-line text-ink text-xs font-bold smooth-transition active:scale-95"
              >
                <Info className="w-4 h-4" />
                Más info
              </button>
            )}
            <button
              type="button"
              onClick={() => onExplorePublishers?.()}
              className="inline-flex items-center gap-1.5 px-2 py-2.5 text-xs font-bold text-accent hover:text-accent2 smooth-transition"
            >
              Ver por editoriales
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  const current = recentChapters[activeIndex];
  // Completamos la ficha con datos del cómic padre (editorial, tomos, estado).
  const parentComic = comics.find((c) => c.id === current.comic_id) ?? null;
  const capCount = parentComic?.chapters?.length ?? 0;

  return (
    <section
      aria-label="Novedades destacadas"
      className="group relative overflow-hidden w-[calc(100%_+_1.5rem)] -mx-3 sm:w-[calc(100%_+_3rem)] sm:-mx-6 lg:w-[calc(100%_+_4rem)] lg:-mx-8 h-[86svh] max-h-[950px] min-h-[620px] border-b border-line bg-surface"
    >
      {/* Fondo cinemático: TODAS las capas apiladas con crossfade.
          Nada se desmonta al cambiar de slide (remounts con blur/transform
          salen como "fantasmas" en Chromium).
          ── v0.6b: si el cómic tiene banner horizontal se usa a sangre; si no,
          la portada vertical se ANCLA a la derecha (object-contain) y se
          rellena el resto con una copia difuminada — nunca se estira.
          v0.9.9.4: el banner llena toda la pantalla también en celular
          (object-cover): antes quedaban franjas del fondo a los costados. ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-bg">
        {recentChapters.map((chapter, idx) => {
          const parent = comics.find((c) => c.id === chapter.comic_id);
          const banner = parent?.banner_url?.trim();
          const cover = proxyImageUrl(chapter.cover_url || chapter.comic_cover_url);
          return (
            <div
              key={chapter.id}
              aria-hidden="true"
              className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
                activeIndex === idx ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {banner ? (
                <img
                  src={proxyImageUrl(banner)}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <>
                  {/* Relleno difuminado (evita el pixelado de estirar la portada) */}
                  <img
                    src={cover}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover blur-3xl scale-150 opacity-75 saturate-125"
                  />
                  {/* Portada nítida: panel pegado al borde DERECHO, altura
                      completa (sin cortes abajo) y fundido SOLO en su borde
                      izquierdo para que se disuelva con el relleno. */}
                  <div className="absolute inset-y-0 right-0 h-full w-[68%] sm:w-[48%] lg:w-[42%] max-w-[820px] overflow-hidden [mask-image:linear-gradient(to_right,transparent_0%,black_26%,black_100%)] [mask-repeat:no-repeat] [mask-size:100%_100%]">
                    <img
                      src={cover}
                      alt=""
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}
        {/* Velo legibilidad: gradiente lateral + base hacia el fondo del sitio */}
        <div className="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/60 to-bg/10 sm:from-bg/90 sm:via-bg/45 sm:to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-bg via-bg/55 to-transparent" />
      </div>

      {/* Contador + pausa del autoplay (WCAG 2.2.2) arriba a la derecha */}
      <div className="absolute top-4 right-4 z-30 sm:top-6 sm:right-8 flex items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-line bg-bg/60 px-3 py-1 font-mono text-[11px] font-bold tracking-widest text-ink/90 shadow-md backdrop-blur-md">
          {String(activeIndex + 1).padStart(2, '0')}
          <span className="mx-1 text-faint">/</span>
          {String(recentChapters.length).padStart(2, '0')}
        </span>
        <button
          type="button"
          onClick={() => setIsPaused((v) => !v)}
          aria-label={isPaused ? 'Reanudar rotación automática' : 'Pausar rotación automática'}
          title={isPaused ? 'Reanudar' : 'Pausar'}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-bg/60 text-ink/90 shadow-md backdrop-blur-md transition-all duration-200 active:scale-90 hover:border-accent hover:bg-accent hover:text-onaccent"
        >
          {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
        </button>
      </div>

      {/* Flechas de navegación: siempre en móvil, aparecen al hover en desktop */}
      {recentChapters.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Novedad anterior"
            title="Anterior"
            className="absolute left-2 sm:left-4 top-1/2 z-20 flex h-10 w-10 sm:h-12 sm:w-12 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-bg/60 text-ink shadow-lg backdrop-blur-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 active:scale-95 hover:bg-accent hover:border-accent hover:text-onaccent"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Novedad siguiente"
            title="Siguiente"
            className="absolute right-2 sm:right-4 top-1/2 z-20 flex h-10 w-10 sm:h-12 sm:w-12 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-bg/60 text-ink shadow-lg backdrop-blur-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 active:scale-95 hover:bg-accent hover:border-accent hover:text-onaccent"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </>
      )}

      {/* ── CONTENIDO: título gigante + ficha + CTAs, abajo a la izquierda.
          Re-anima suavemente al cambiar de slide (key = slide activo). ── */}
      <div
        key={current.id}
        className="absolute left-0 bottom-28 sm:bottom-36 px-5 sm:px-10 lg:px-16 max-w-xl sm:max-w-2xl space-y-2.5 sm:space-y-4 text-left animate-fade-in"
      >
        {/* Ranking factual (posición en novedades) + género del tomo */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg/70 backdrop-blur-md border border-line text-[10px] font-black uppercase tracking-wider text-ink">
            <Sparkles className="w-3 h-3 text-accent" />
            #{activeIndex + 1} en novedades
          </span>
          {current.comic_tag && (
            <span className="px-2.5 py-1 rounded-full border border-accent/40 bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider">
              {current.comic_tag}
            </span>
          )}
        </div>

        {/* Título del CÓMIC (no del tomo) — el tomo va en el chip inferior */}
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-ink tracking-tight leading-[1.05] drop-shadow-sm">
          {current.comic_title}
        </h2>

        {/* Meta factual: tomo actual · año · editorial · tomos · estado */}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs text-mute font-semibold">
          <span className="px-2 py-0.5 rounded-md bg-accent/15 border border-accent/40 text-accent font-black uppercase tracking-wide">
            Tomo #{current.chapter_number}
          </span>
          {current.comic_year && <span>{current.comic_year}</span>}
          {current.comic_year && parentComic?.publisher && <span className="text-faint">·</span>}
          {parentComic?.publisher && <span className="text-accent">{parentComic.publisher}</span>}
          {(current.comic_year || parentComic?.publisher) && <span className="text-faint">·</span>}
          <span>{capCount} {capCount === 1 ? 'tomo' : 'tomos'}</span>
          <span className="text-faint">·</span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                parentComic?.status === 'En curso' ? 'bg-accent' : 'bg-faint'
              }`}
              aria-hidden="true"
            />
            {parentComic?.status ?? current.comic_status}
          </span>
        </p>

        {/* Sinopsis (sin caja: texto directo, estilo Netflix) */}
        <p className="hidden sm:block text-xs lg:text-sm text-mute leading-relaxed line-clamp-3 break-words drop-shadow">
          {current.comic_synopsis}
        </p>

        {/* CTAs: leer el tomo / ficha completa de la serie */}
        <div className="pt-1 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onSelectChapter?.(current)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent hover:bg-accent2 text-onaccent text-xs sm:text-sm font-bold shadow-lg shadow-accent/20 smooth-transition hover:scale-[1.03] active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            Leer ahora
          </button>
          {onSelectComic && parentComic && (
            <button
              type="button"
              onClick={() => onSelectComic(parentComic)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-bg/60 hover:bg-bg/80 backdrop-blur-md border border-line text-ink text-xs sm:text-sm font-bold smooth-transition hover:scale-[1.03] active:scale-95"
            >
              <Info className="w-4 h-4" />
              Más info
            </button>
          )}
        </div>
      </div>

      {/* ── TIRA DE MINIATURAS (la navegación principal, estilo Netflix):
          #1–#5, la activa resaltada con su título debajo.
          v0.9.4: el contenedor invisible de esta zona tapaba los CTAs
          "Leer ahora / Más info" en celular (la zona se superpone) — ahora
          el contenedor NO captura toques (pointer-events-none) y solo la
          tira de miniaturas sí los captura (pointer-events-auto). ── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-5 sm:px-10 lg:px-14 pb-3 sm:pb-4 pt-10 bg-gradient-to-t from-bg/90 via-bg/50 to-transparent">
        <div className="pointer-events-auto flex items-end gap-2 sm:gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {recentChapters.map((chapter, idx) => {
            const isActive = idx === activeIndex;
            const parent = comics.find((c) => c.id === chapter.comic_id);
            const thumb = proxyImageUrl(parent?.banner_url?.trim() || chapter.cover_url || chapter.comic_cover_url);
            return (
              <button
                key={chapter.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Ver novedad #${idx + 1}: ${chapter.comic_title}, tomo ${chapter.chapter_number}`}
                aria-current={isActive || undefined}
                className="group/thumb w-28 sm:w-36 shrink-0 text-left"
              >
                <span
                  className={`block aspect-video rounded-lg overflow-hidden bg-bg border smooth-transition ${
                    isActive
                      ? 'border-accent ring-2 ring-accent/40'
                      : 'border-line opacity-55 hover:opacity-100'
                  }`}
                >
                  <img
                    src={thumb}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-105"
                  />
                </span>
                <span
                  className={`block mt-1.5 text-[10px] font-bold truncate ${
                    isActive ? 'text-ink' : 'text-faint group-hover/thumb:text-mute'
                  }`}
                >
                  {chapter.comic_title}
                  <span className="text-accent"> · T{chapter.chapter_number}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
