import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellRing, BookOpen, X } from 'lucide-react';
import type { Chapter, Comic } from '../types/comic';
import { proxyImageUrl } from '../lib/imageUrl';
import { useComics } from '../context/ComicsContext';
import { useFollows } from '../context/FollowsContext';

// ============================================================================
// CAMPANA DE NUEVOS TOMOS (todos los usuarios)
// Detecta capítulos subidos DESPUÉS de la última visita del lector y los
// lista en un dropdown. El estado "ya vi estos" se guarda en localStorage
// (marca de tiempo), así cada navegador lleva su propio registro.
// El catálogo se refresca cada 5 min para enterarse de tomos nuevos.
// ============================================================================

const SEEN_KEY = 'crow_seen_chapters_at';

interface ChapterWithMeta {
  chapter: Chapter;
  comic: Comic;
  date: Date;
}

const readSeenAt = (): Date | null => {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? new Date(raw) : null;
  } catch {
    return null;
  }
};

/** Etiqueta amable: "hace un rato", "ayer", o fecha corta. */
const friendlyDate = (date: Date): string => {
  const now = new Date();
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

interface NewChaptersBellProps {
  comics: Comic[];
  onSelectComic: (comic: Comic) => void;
}

export const NewChaptersBell: React.FC<NewChaptersBellProps> = ({ comics, onSelectComic }) => {
  const { refreshComics } = useComics();
  const { follows } = useFollows();
  const [isOpen, setIsOpen] = useState(false);
  const [seenAt, setSeenAt] = useState<Date | null>(() => readSeenAt());
  const containerRef = useRef<HTMLDivElement>(null);
  // Pestaña activa; null = aún no se decide (siguiendo si ya sigues algo).
  const [tab, setTab] = useState<'siguiendo' | 'todos' | null>(null);
  const activeTab = tab ?? (follows.size > 0 ? 'siguiendo' : 'todos');

  // Todos los capítulos con fecha, del más nuevo al más viejo.
  const allChapters = useMemo<ChapterWithMeta[]>(() => {
    const list: ChapterWithMeta[] = [];
    for (const comic of comics) {
      for (const chapter of comic.chapters ?? []) {
        if (!chapter.created_at) continue;
        const date = new Date(chapter.created_at);
        if (Number.isNaN(date.getTime())) continue;
        list.push({ chapter, comic, date });
      }
    }
    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [comics]);

  // Primera visita: marcar todo lo existente como "ya visto" para no
  // inundar al lector con el catálogo completo como si fuera nuevo.
  useEffect(() => {
    if (seenAt || allChapters.length === 0) return;
    const newest = allChapters[0].date;
    try {
      localStorage.setItem(SEEN_KEY, newest.toISOString());
    } catch { /* noop */ }
    setSeenAt(newest);
  }, [allChapters, seenAt]);

  // Cantidad de capítulos nuevos desde la última vez que vio la campana.
  const newChapters = useMemo(() => {
    if (!seenAt) return [];
    const seenTime = seenAt.getTime();
    return allChapters.filter((entry) => entry.date.getTime() > seenTime);
  }, [allChapters, seenAt]);

  // Capítulos nuevos SOLO de los cómics que sigues (vs tu última visita a cada uno).
  const followedNew = useMemo(() => {
    if (follows.size === 0) return [];
    return allChapters.filter((entry) => {
      const lastSeen = follows.get(entry.comic.id);
      if (!lastSeen) return false;
      const seen = new Date(lastSeen).getTime();
      return !Number.isNaN(seen) && entry.date.getTime() > seen;
    });
  }, [allChapters, follows]);

  // Si sigues cómics, la campana cuenta solo SUS novedades; si no, todo.
  const badgeCount = follows.size > 0 ? followedNew.length : newChapters.length;
  const visibleChapters = activeTab === 'siguiendo' ? followedNew : newChapters;

  const markAllSeen = useCallback(() => {
    const now = new Date();
    try {
      localStorage.setItem(SEEN_KEY, now.toISOString());
    } catch { /* noop */ }
    setSeenAt(now);
  }, []);

  // v0.9.9.4: marcar como visto AL CERRAR la campana, no al abrir. Antes se
  // marcaba en el mismo click de abrir y la lista se vaciaba ANTES de
  // mostrarse (el panel abría siempre en "Ya viste todo" aunque el badge
  // tuviera número).
  const closeBell = useCallback(() => {
    setIsOpen(false);
    if (newChapters.length > 0) markAllSeen();
  }, [newChapters.length, markAllSeen]);

  // Refresco silencioso cada 5 min: sube tomo nuevo → la campana despierta.
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshComics();
    }, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [refreshComics]);

  // Cerrar al hacer clic fuera.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeBell();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, closeBell]);

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          if (isOpen) {
            closeBell();
          } else {
            setIsOpen(true);
          }
        }}
        className={`relative p-2 rounded-xl bg-surface hover:bg-raised border border-line transition-colors ${
          badgeCount > 0 ? 'text-accent' : 'text-mute hover:text-ink'
        }`}
        title={follows.size > 0 ? 'Nuevos tomos de tus cómics seguidos' : 'Nuevos tomos'}
        aria-label={`Nuevos tomos${badgeCount > 0 ? ` (${badgeCount} sin ver)` : ''}`}
      >
        <Bell className="w-4 h-4" />
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-accent text-onaccent text-[9px] font-black flex items-center justify-center shadow-md shadow-accent/20">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </button>

      {isOpen && (
        /* v0.9.7: la campana vive al FONDO del sidebar — en desktop el panel
           se abre hacia ARRIBA y hacia la DERECHA (left-full) para no salirse
           del viewport en ninguno de los dos ejes. En móvil (campana en la
           barra superior) se abre hacia abajo como siempre. */
        <div className="absolute z-50 w-80 bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden animate-fade-in max-lg:right-0 max-lg:top-full max-lg:mt-2 lg:bottom-full lg:left-full lg:ml-2">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-bold text-ink">Nuevos tomos</span>
              {badgeCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-accent/15 text-accent text-[10px] font-bold border border-accent/30">
                  {badgeCount} sin ver
                </span>
              )}
            </div>
            <button
              onClick={closeBell}
              className="p-1 rounded text-faint hover:text-mute transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pestañas: prioriza lo que SIGUES; "Todos" muestra todo el sitio */}
          {follows.size > 0 && (
            <div className="flex gap-1 p-1.5 border-b border-line bg-raised/40">
              <button
                type="button"
                onClick={() => setTab('siguiendo')}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  activeTab === 'siguiendo'
                    ? 'bg-accent text-onaccent shadow-sm'
                    : 'text-mute hover:text-ink'
                }`}
              >
                <BellRing className="w-3.5 h-3.5" />
                Siguiendo ({follows.size})
              </button>
              <button
                type="button"
                onClick={() => setTab('todos')}
                className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  activeTab === 'todos'
                    ? 'bg-accent text-onaccent shadow-sm'
                    : 'text-mute hover:text-ink'
                }`}
              >
                Todos
              </button>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto divide-y divide-line">
            {visibleChapters.length === 0 ? (
              activeTab === 'siguiendo' ? (
                <div className="p-6 text-center text-xs text-faint">
                  {follows.size === 0
                    ? 'No sigues ningún cómic aún — toca la campanita en una tarjeta o ficha 🐦'
                    : 'Sin tomos nuevos en tus cómics seguidos 🐦'}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-faint">
                  Ya viste todo lo subido. ¡Cuando llegue un tomo nuevo te avisamos aquí! 🐦
                </div>
              )
            ) : (
              visibleChapters.slice(0, 20).map(({ chapter, comic, date }) => (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => {
                    onSelectComic(comic);
                    closeBell();
                  }}
                  className="w-full text-left p-3 hover:bg-raised/80 cursor-pointer transition-colors flex items-center gap-3 group"
                >
                  <img
                    src={proxyImageUrl(chapter.cover_url || comic.cover_url)}
                    alt={comic.title}
                    className="w-9 h-13 object-cover rounded-md border border-line shrink-0"
                    onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-ink truncate group-hover:text-accent transition-colors">
                      {comic.title}
                    </p>
                    <p className="text-[11px] text-mute truncate mt-0.5">
                      Cap. {chapter.chapter_number} — {chapter.title}
                    </p>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-accent shrink-0">
                    {friendlyDate(date)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
