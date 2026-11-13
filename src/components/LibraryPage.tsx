import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Library, Search, BookOpen, Feather } from 'lucide-react';
import type { Comic } from '../types/comic';
import { useAuth } from '../context/AuthContext';
import { getReadingProgress, type ReadingProgressRow } from '../lib/profile';
import { proxyImageUrl } from '../lib/imageUrl';
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

const GROUP_DOT: Record<ReadingStatus, string> = {
  leyendo: 'bg-accent border-accent',
  leido: 'bg-emerald-600 border-emerald-500',
  en_pausa: 'bg-amber-500 border-amber-500',
  abandonado: 'bg-zinc-600 border-zinc-500',
};

/**
 * v0.9: MI BIBLIOTECA — lo que marcaste con un estado (reading_status),
 * agrupado por estado con fichas compactas: portada + chips de tomo.
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

  // Mapa cómics por ID para no perder el título/portada
  const comicsById = useMemo(() => {
    const map = new Map<string, Comic>();
    comics.forEach((c) => map.set(c.id, c));
    return map;
  }, [comics]);

  // Grupos: { comic, tomos (con progreso) } por estado, orden alfabético
  const byStatus = useMemo(() => {
    const groups = new Map<ReadingStatus, ReadingProgressRow[]>();
    rows.forEach((r) => {
      if (!r.reading_status) return;
      const list = groups.get(r.reading_status) ?? [];
      list.push(r);
      groups.set(r.reading_status, list);
    });
    // Agrupar tomos por cómic: filas compactas = varios tomos colapsados en chips por estado
    groups.forEach((list, key) => {
      list.sort((a, b) => {
        if (a.comic_id !== b.comic_id) {
          const ca = comicsById.get(a.comic_id)?.title ?? '';
          const cb = comicsById.get(b.comic_id)?.title ?? '';
          return ca.localeCompare(cb);
        }
        return a.chapter_number - b.chapter_number;
      });
      groups.set(key, list);
    });
    return groups;
  }, [rows, comicsById]);

  const openRow = (r: ReadingProgressRow) => {
    const comic = comicsById.get(r.comic_id);
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
    <div className="space-y-8 animate-fade-in">
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
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Library className="w-7 h-7 text-accent" />
          </div>
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
          <div className="w-16 h-16 rounded-2xl bg-raised border border-line flex items-center justify-center">
            <Search className="w-7 h-7 text-mute" />
          </div>
          <h2 className="text-base font-bold text-ink">Tu biblioteca está vacía</h2>
          <p className="max-w-sm text-xs text-mute">
            Abrí un tomo y tocá <span className="font-bold text-ink">"Añadir a biblioteca"</span> para
            marcarlo como leyendo, leído, en pausa o abandonado.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {GROUPS.map(({ status, label }) => {
            const list = byStatus.get(status) ?? [];
            // Tomos del mismo cómic quedan juntos en una sola ficha
            const rowsByComic = new Map<string, ReadingProgressRow[]>();
            list.forEach((r) => {
              const arr = rowsByComic.get(r.comic_id) ?? [];
              arr.push(r);
              rowsByComic.set(r.comic_id, arr);
            });
            if (list.length === 0) return null;
            return (
              <section key={status} className="space-y-4">
                {/* Encabezado del estado */}
                <div className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full border-2 shrink-0 ${GROUP_DOT[status]}`} />
                  <h2 className="text-sm font-black text-ink">{label}</h2>
                  <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-mono text-mute">
                    {list.length}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-line to-transparent" />
                </div>

                {/* Fichas compactas */}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[...rowsByComic.entries()].map(([comicId, comicRows]) => {
                    const comic = comicsById.get(comicId);
                    return (
                      <article
                        key={comicId}
                        className="group flex gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-accent/40"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            comic ? onOpenComic(comic) : showToast('Cómic no disponible', 'info')
                          }
                          className="shrink-0"
                          aria-label={`Abrir ${comic?.title ?? 'cómic'}`}
                        >
                          {comic?.cover_url ? (
                            <img
                              src={proxyImageUrl(comic.cover_url)}
                              alt=""
                              className="h-24 w-16 rounded-lg border border-line object-cover transition-transform group-hover:scale-[1.03]"
                              onError={(e) => {
                                e.currentTarget.style.visibility = 'hidden';
                              }}
                            />
                          ) : (
                            <div className="flex h-24 w-16 items-center justify-center rounded-lg border border-line bg-raised">
                              <BookOpen className="w-4 h-4 text-faint" />
                            </div>
                          )}
                        </button>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <button
                            type="button"
                            onClick={() =>
                              comic ? onOpenComic(comic) : showToast('Cómic no disponible', 'info')
                            }
                            className="min-w-0 text-left"
                          >
                            <h3 className="truncate text-sm font-bold text-ink group-hover:text-accent transition-colors">
                              {comic?.title ?? 'Cómic'}
                            </h3>
                            {comic?.publisher && (
                              <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-mute">
                                <Feather className="w-3 h-3 text-amber-400" />
                                {comic.publisher}
                              </p>
                            )}
                          </button>

                          {/* Chips de tomo con marcador */}
                          <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                            {comicRows.slice(0, 5).map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => openRow(r)}
                                className="rounded-lg border border-line bg-raised/70 px-2 py-1 text-[10px] font-bold text-mute hover:border-accent/50 hover:text-accent transition-colors"
                                title={
                                  Number(r.page_number) > 0
                                    ? `Marcador guardado: página ${r.page_number}`
                                    : 'Abrir tomo'
                                }
                              >
                                T#{r.chapter_number}
                                {Number(r.page_number) > 0 && (
                                  <span className="ml-1 text-accent font-black">·p{r.page_number}</span>
                                )}
                              </button>
                            ))}
                            {comicRows.length > 5 && (
                              <span className="self-center text-[10px] text-faint">
                                +{comicRows.length - 5} más
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
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
