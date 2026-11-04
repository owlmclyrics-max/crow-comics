import React, { useEffect, useState } from 'react';
import { Play, History, BookX, X, Bookmark } from 'lucide-react';
import type { Chapter, Comic } from '../types/comic';
import { useAuth } from '../context/AuthContext';
import { useComics } from '../context/ComicsContext';
import { getReadingProgress, deleteReadingProgressRow, type ReadingProgressRow } from '../lib/profile';
import { showToast } from './ui/Toast';

interface ContinueReadingRowProps {
  onSelectChapter: (chapter: Chapter, comic: Comic) => void;
  /** Fallback si el tomo guardado ya no existe en el catálogo: abre la serie. */
  onSelectComic: (comic: Comic) => void;
}

/**
 * Fila estilo Netflix "Continuar Leyendo" — Sprint 2.
 * Consulta los últimos 5 capítulos abiertos por el usuario (tabla
 * reading_progress) y los une con el catálogo para mostrar portada,
 * serie, tomo y botón Continuar.
 *
 * Si no hay sesión o no hay historial, renderiza null (invisible).
 */
export const ContinueReadingRow: React.FC<ContinueReadingRowProps> = ({ onSelectChapter, onSelectComic }) => {
  const { user } = useAuth();
  const comics = useComics().comics;
  const [progress, setProgress] = useState<ReadingProgressRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setProgress([]);
      return;
    }

    getReadingProgress(user.id).then((rows) => {
      if (!cancelled) setProgress(rows.slice(0, 5)); // últimos 5 capítulos
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Invisible si no hay sesión o historial
  if (!user || progress.length === 0) return null;

  // Unir progreso con el catálogo resuelto
  const entries = progress
    .map((row) => {
      const comic = comics.find((item) => item.id === row.comic_id);
      if (!comic) return null;
      const chapter = comic.chapters?.find((item) => item.id === row.chapter_id) ?? null;
      return { row, comic, chapter };
    })
    .filter((entry): entry is { row: ReadingProgressRow; comic: Comic; chapter: Chapter | null } => entry !== null);

  if (entries.length === 0) return null;

  const handleContinue = (entry: { comic: Comic; chapter: Chapter | null }) => {
    if (entry.chapter) {
      onSelectChapter(entry.chapter, entry.comic);
    } else {
      // El tomo ya no existe en el catálogo; al menos llevamos a la serie
      onSelectComic(entry.comic);
    }
  };

  // Sprint 2.5: quita este registro del historial en Supabase y de la vista
  const handleRemove = async (rowId: string) => {
    // Optimista: la tarjeta desaparece al instante
    setProgress((prev) => prev.filter((r) => r.id !== rowId));
    await deleteReadingProgressRow(rowId);
    showToast('Tomado fuera de "Continuar Leyendo"');
  };

  return (
    <section className="space-y-4 animate-fade-in" aria-label="Continuar leyendo">
      {/* Encabezado */}
      <div className="flex items-center gap-2.5">
        <History className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-black text-ink tracking-tight">Continuar Leyendo</h3>
        <span className="text-[11px] text-faint ml-2">últimos capítulos que abriste</span>
      </div>

      {/* Carrusel horizontal con scroll tipo Netflix */}
      <div className="-mx-1 flex gap-3 overflow-x-auto pb-3 px-1 snap-x snap-mandatory [scrollbar-width:thin]">
        {entries.map(({ row, comic, chapter }) => {
          const chapterTitle = chapter ? chapter.title : `Capítulo ${row.chapter_number}`;
          // Muchos tomos comparten el título con su serie (p. ej. "Winter Guard (2021)").
          // En ese caso el número de tomo es lo que distingue: lo mostramos grande
          // sobre la portada en lugar de repetir el nombre de la serie.
          const isTitleDuplicate = chapterTitle.trim().toLowerCase() === comic.title.trim().toLowerCase();

          return (
            <div
              key={row.id}
              className="group/card relative snap-start w-36 sm:w-44 shrink-0"
            >
              <button
                type="button"
                onClick={() => handleContinue({ comic, chapter })}
                className="group flex w-full flex-col text-left rounded-2xl bg-surface border border-line hover:border-accent/50 overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/40 cursor-pointer"
              >
                {/* Portada del capítulo (no la de la serie); fallback a la del cómic */}
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-bg">
                  <img
                    src={chapter?.cover_url || comic.cover_url}
                    alt={chapter ? chapter.title : comic.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />

                  {/* Número de tomo flotante */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-accent text-onaccent shadow-md">
                    Tomo {row.chapter_number}
                  </span>

                  {/* Nombre del capítulo sobre la portada; si coincide con el de la
                      serie, mostramos el número de tomo grande en su lugar */}
                  {isTitleDuplicate ? (
                    <p className="absolute bottom-2 left-2.5 right-2.5 drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                      <span className="block text-base font-black text-ink leading-tight">
                        Tomo #{row.chapter_number}
                      </span>
                      <span className="block text-[10px] text-mute truncate">
                        {comic.title}
                      </span>
                    </p>
                  ) : (
                    <p className="absolute bottom-2 left-2.5 right-2.5 text-[11px] font-bold text-ink line-clamp-2 drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                      {chapterTitle}
                    </p>
                  )}
                </div>

                {/* Pie: serie a la que pertenece + recordatorio del tomo + botón Continuar */}
                <div className="p-2.5 space-y-1.5 flex flex-col flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <BookX className="w-3 h-3 text-faint shrink-0" />
                    <p className="text-[11px] text-mute truncate">
                      {comic.title}
                    </p>
                  </div>
                  {/* Sprint 3.5: marcar de página (el tomo ya se indica arriba) */}
                  {row.page_number && row.page_number > 0 && (
                    <p className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400">
                      <Bookmark className="w-2.5 h-2.5 fill-amber-400/40" />
                      Quedaste en la página {row.page_number}
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl bg-accent group-hover:bg-accent2 text-onaccent text-[11px] font-bold transition-all active:scale-95">
                    <Play className="w-3 h-3 fill-current" />
                    <span>Continuar</span>
                  </div>
                </div>
            </button>

              {/* Sprint 2.5: botón circular "X" para quitar de "Continuar Leyendo".
                  stopPropagation evita que el clic navegue al capítulo. */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleRemove(row.id);
                }}
                title="Quitar de Continuar Leyendo"
                aria-label={`Quitar ${comic.title} Tomo ${row.chapter_number} de Continuar Leyendo`}
                className="absolute top-1.5 right-1.5 z-10 p-1.5 rounded-full bg-bg/85 border border-line text-mute hover:bg-accent hover:border-accent hover:text-onaccent transition-all shadow-lg opacity-0 group-hover/card:opacity-100 focus:opacity-100 active:scale-90"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
