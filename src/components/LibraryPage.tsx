import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Library, Search, BookOpen } from 'lucide-react';
import type { Comic } from '../types/comic';
import { useAuth } from '../context/AuthContext';
import { getReadingProgress, type ReadingProgressRow } from '../lib/profile';
import type { ReadingStatus } from '../lib/readingStatus';
import { showToast } from './ui/Toast';

interface LibraryPageProps {
  comics: Comic[];
  onOpenComic: (comic: Comic) => void;
  /** Abre el tomo directamente (vuelve a "Continuar Leyendo"). */
  onOpenChapter: (comicId: string, chapterId: string) => void;
  onOpenAuth: () => void;
  onBack: () => void;
}

interface LibraryGroup {
  status: ReadingStatus;
  label: string;
}

const GROUPS: LibraryGroup[] = [
  { status: 'leyendo', label: 'Leyendo' },
  { status: 'leido', label: 'Leído' },
  { status: 'en_pausa', label: 'En pausa' },
  { status: 'abandonado', label: 'Abandonado' },
];

/**
 * v0.7: MI BIBLIOTECA — todo lo que el lector marcó con un estado
 * (reading_status en reading_progress), agrupado por estado.
 */
export const LibraryPage: React.FC<LibraryPageProps> = ({
  comics,
  onOpenComic,
  onOpenChapter,
  onOpenAuth,
  onBack,
}) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<ReadingProgressRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    if (!user?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    getReadingProgress(user.id)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Agrupar por estado; dentro de cada estado, por cómic con su tomo más alto
  const chaptersByComic = useMemo(() => {
    const map = new Map<string, Comic>();
    comics.forEach((c) => map.set(c.id, c));
    return map;
  }, [comics]);

  const byStatus = useMemo(() => {
    const groups = new Map<ReadingStatus, ReadingProgressRow[]>();
    rows.forEach((r) => {
      if (!r.reading_status) return;
      const list = groups.get(r.reading_status) ?? [];
      list.push(r);
      groups.set(r.reading_status, list);
    });
    // Dentro de cada grupo: los tomos del mismo cómic quedan juntos
    groups.forEach((list, key) => {
      list.sort((a, b) => {
        if (a.comic_id !== b.comic_id) {
          const ca = chaptersByComic.get(a.comic_id)?.title ?? '';
          const cb = chaptersByComic.get(b.comic_id)?.title ?? '';
          return ca.localeCompare(cb);
        }
        return a.chapter_number - b.chapter_number;
      });
      groups.set(key, list);
    });
    return groups;
  }, [rows, chaptersByComic]);

  const openRow = (r: ReadingProgressRow) => {
    const comic = chaptersByComic.get(r.comic_id);
    if (!comic) {
      showToast('Este cómic ya no está disponible', 'info');
      return;
    }
    const chapter = comic.chapters?.find((ch) => ch.id === r.chapter_id);
    if (chapter) {
      onOpenChapter(r.comic_id, r.chapter_id);
    } else {
      onOpenComic(comic);
    }
  };

  const totalItems = rows.filter((r) => r.reading_status).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-mute hover:bg-raised hover:text-ink transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 text-accent group-hover:-translate-x-1 transition-transform" />
          Volver
        </button>
        <div className="text-right">
          <h1 className="flex items-center justify-end gap-2 text-xl sm:text-2xl font-black text-ink">
            <Library className="w-5 h-5 text-accent" />
            Mi Biblioteca
          </h1>
          {user && !loading && (
            <p className="text-[11px] text-mute mt-0.5">
              {totalItems} tomo{totalItems === 1 ? '' : 's'} con estado
            </p>
          )}
        </div>
      </div>

      {!user ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-line/60 bg-surface/40 px-6 py-16 text-center space-y-4">
          <Library className="w-10 h-10 text-mute" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-ink">Iniciá sesión para tu biblioteca</h2>
            <p className="max-w-sm text-xs text-mute">
              Guardá lo que leés, lo que vas a retomar y lo que dejaste, sincronizado en tu cuenta.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAuth}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-black text-onaccent transition-all hover:bg-accent2 active:scale-95"
          >
            <BookOpen className="w-4 h-4" />
            Iniciar sesión
          </button>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-xs text-mute">Cargando tu biblioteca…</p>
        </div>
      ) : totalItems === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-line/60 bg-surface/40 px-6 py-16 text-center space-y-3">
          <Search className="w-10 h-10 text-mute" />
          <h2 className="text-base font-bold text-ink">Tu biblioteca está vacía</h2>
          <p className="max-w-sm text-xs text-mute">
            Abrí un tomo y tocá <span className="font-bold text-ink">"Añadir a biblioteca"</span> para
            marcarlo como leyendo, leído, en pausa o abandonado.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {GROUPS.map(({ status, label }) => {
            const list = byStatus.get(status) ?? [];
            const rowsByComic = new Map<string, ReadingProgressRow[]>();
            list.forEach((r) => {
              const arr = rowsByComic.get(r.comic_id) ?? [];
              arr.push(r);
              rowsByComic.set(r.comic_id, arr);
            });
            if (list.length === 0) return null;
            return (
              <section key={status} className="space-y-4">
                <h2 className="flex items-center gap-2 text-sm font-black text-ink">
                  <span
                    className={`w-3 h-3 rounded-full border-2 ${
                      status === 'leyendo'
                        ? 'bg-accent border-accent'
                        : status === 'leido'
                          ? 'bg-emerald-600 border-emerald-500'
                          : status === 'en_pausa'
                            ? 'bg-amber-500 border-amber-500'
                            : 'bg-raised border-line'
                    }`}
                  />
                  {label}
                  <span className="text-[10px] font-mono text-faint">{list.length}</span>
                </h2>

                <div className="space-y-3">
                  {[...rowsByComic.entries()].map(([comicId, comicRows]) => {
                    const comic = chaptersByComic.get(comicId);
                    const main = comicRows[0];
                    return (
                      <div
                        key={comicId}
                        className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-accent/40"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            comic ? onOpenComic(comic) : showToast('Cómic no disponible', 'info')
                          }
                          className="shrink-0"
                          aria-label={`Abrir ${comic?.title ?? 'cómic'}`}
                        >
                          <img
                            src={comic?.cover_url}
                            alt=""
                            className="h-16 w-12 rounded-lg border border-line object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </button>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-ink">
                            {comic?.title ?? 'Cómic'}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {comicRows.slice(0, 8).map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => openRow(r)}
                                className="rounded-lg border border-line bg-raised/60 px-2 py-1 text-[10px] font-bold text-mute hover:text-accent hover:border-accent/40 transition-colors"
                                title={r.page_number ? `Marcador: página ${r.page_number}` : 'Abrir tomo'}
                              >
                                Tomo #{r.chapter_number}
                                {r.page_number ? ` · p${r.page_number}` : ''}
                              </button>
                            ))}
                            {comicRows.length > 8 && (
                              <span className="text-[10px] text-faint">
                                +{comicRows.length - 8} más
                              </span>
                            )}
                          </div>
                        </div>

                        {main.page_number && (
                          <span className="hidden sm:inline text-[10px] text-faint whitespace-nowrap">
                            Continúa en pág. {main.page_number}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
