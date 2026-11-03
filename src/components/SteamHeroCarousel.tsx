import React, { useState, useEffect, useMemo } from 'react';
import type { Comic, ChapterWithComic } from '../types/comic';
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
  // Crear lista plana de capítulos con información del cómic
  const recentChapters = useMemo(() => {
    const allChapters: ChapterWithComic[] = [];
    comics.forEach(comic => {
      comic.chapters?.forEach(chapter => {
        allChapters.push(toChapterWithComic(chapter, comic));
      });
    });
    // Ordenar por fecha de lanzamiento y tomar los 5 más recientes
    return allChapters
      .sort((a, b) => new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime())
      .slice(0, 5);
  }, [comics]);

  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-slide cada 6 segundos
  useEffect(() => {
    if (recentChapters.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % recentChapters.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [recentChapters.length]);

  if (recentChapters.length === 0) {
    // Fallback: mostrar cómics directamente si no hay tomos cargados
    if (comics.length === 0) return null;
    return (
      <div className="relative rounded-3xl bg-zinc-900 border border-zinc-800/90 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={comics[0].cover_url}
            alt={comics[0].title}
            className="w-full h-full object-cover blur-2xl scale-125 opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/80 to-zinc-950/60" />
        </div>
        <div className="relative p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-8 z-10">
          <div className="aspect-[2/3] w-36 sm:w-44 rounded-2xl overflow-hidden border-2 border-zinc-700 shadow-2xl shrink-0">
            <img src={comics[0].cover_url} alt={comics[0].title} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 space-y-4 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-3 py-1 text-xs font-bold uppercase rounded-lg bg-amber-500 text-zinc-950">{comics[0].publisher}</span>
              <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-zinc-800 text-red-400 border border-red-500/30">{comics[0].tag}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{comics[0].title}</h2>
            <p className="text-sm text-zinc-300 leading-relaxed max-w-2xl line-clamp-3">{comics[0].synopsis}</p>
            <div className="flex items-center justify-center sm:justify-start gap-2 pt-2">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-xs border border-zinc-700">
                <BookOpen className="w-4 h-4" />
                Próximamente tomos disponibles
              </span>
              <button
                onClick={onExplorePublishers}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-zinc-950 text-xs font-bold transition-all"
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
    <div className="relative rounded-3xl bg-zinc-900 border border-zinc-800/90 shadow-2xl overflow-hidden group smooth-transition-slow">
      {/* Fondo cinemático desenfocado dinámico del cómic activo con parallax */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none parallax-container">
        <img
          key={current.id}
          src={current.cover_url || current.comic_cover_url}
          alt={current.title}
          className="w-full h-full object-cover blur-2xl scale-125 opacity-25 transition-all duration-700 ease-out parallax-layer animate-parallax-float"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/80 to-zinc-950/60" />
      </div>

      <div className="relative p-5 sm:p-8 md:p-10 flex flex-col lg:flex-row gap-6 sm:gap-8 items-center z-10 animate-fade-in">
        {/* LADO IZQUIERDO: Portada Principal Vertical con badge de Novedad */}
        <div
          onClick={() => onSelectChapter?.(current)}
          className="relative aspect-[2/3] w-48 sm:w-56 md:w-64 rounded-2xl overflow-hidden border-2 border-zinc-700/80 shadow-2xl bg-zinc-950 shrink-0 cursor-pointer group/cover transform hover:scale-[1.03] smooth-transition animate-scale-in"
        >
          <img
            src={current.cover_url || current.comic_cover_url}
            alt={current.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover/cover:scale-105"
          />

          {/* Badge de Novedad / Destacado estilo Steam */}
          <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
            <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-red-500 text-zinc-950 shadow-md flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-zinc-950" />
              Tomo #{current.chapter_number}
            </span>
            {current.comic_publisher && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-zinc-950/90 backdrop-blur-md text-amber-400 border border-amber-500/30">
                {current.comic_publisher}
              </span>
            )}
          </div>

          <div className="absolute bottom-3 right-3">
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-zinc-950/80 backdrop-blur-md text-zinc-200 border border-zinc-700">
              {current.comic_status}
            </span>
          </div>
        </div>

        {/* LADO DERECHO: Información, Sinopsis, Tomos y Botones */}
        <div className="flex-1 space-y-4 text-center lg:text-left">
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Recién Publicado · {current.comic_tag}
            </div>
            {current.comic_year && (
              <span className="text-xs text-zinc-400 font-mono">
                · {current.comic_year}
              </span>
            )}
          </div>

          <div>
            <h2
              onClick={() => onSelectChapter?.(current)}
              className="text-2xl sm:text-4xl font-black text-white tracking-tight cursor-pointer hover:text-red-400 transition-colors line-clamp-1 flex items-baseline gap-2 sm:gap-3"
            >
              <span className="text-red-400 group-hover:text-red-300 leading-none">#{current.chapter_number}</span>
              <span className="truncate">{current.title}</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 italic mt-0.5">
              {current.comic_title}
            </p>
          </div>

          {/* Sinopsis destacada */}
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed line-clamp-3 sm:line-clamp-4 max-w-2xl bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/80 text-left">
            {current.comic_synopsis}
          </p>

          {/* Metadata de Guión y Maquetación */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-zinc-400">
            <span>
              <strong className="text-zinc-300">Guion:</strong> {current.comic_writer}
            </span>
            <span>•</span>
            <span>
              <strong className="text-zinc-300">Maqueta:</strong> <span className="text-red-400">{current.comic_translator_typesetter}</span>
            </span>
            {current.pages_count && (
              <>
                <span>•</span>
                <span className="text-zinc-300 font-medium">
                  {current.pages_count} páginas
                </span>
              </>
            )}
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
            <button
              onClick={() => onSelectChapter?.(current)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-zinc-950 font-bold text-xs shadow-lg shadow-red-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <BookOpen className="w-4 h-4" />
              <span>Ver Tomo & Descargas</span>
            </button>

            <button
              onClick={onExplorePublishers}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold text-xs transition-colors border border-zinc-700"
            >
              <span>Ver por Editoriales</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Miniaturas Inferiores estilo Selector de Steam */}
      {recentChapters.length > 1 && (
        <div className="border-t border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none flex-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-2 shrink-0 hidden sm:inline">
              Últimas 5 Novedades:
            </span>
            {recentChapters.map((chapter, idx) => {
              const isActive = currentIndex === idx;
              return (
                <button
                  key={chapter.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all shrink-0 border ${
                    isActive
                      ? 'bg-zinc-800 border-red-500 text-white shadow-md'
                      : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <img
                    src={chapter.cover_url || chapter.comic_cover_url}
                    alt={chapter.title}
                    className="w-5 h-7 object-cover rounded shrink-0"
                  />
                  <span className="text-xs font-semibold truncate max-w-[120px] sm:max-w-[160px]">
                    {chapter.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Flechas de Navegación manual */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
              title="Anterior novedad"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
              title="Siguiente novedad"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
