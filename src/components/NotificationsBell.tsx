/**
 * NotificationsBell (v0.11.1): UNA sola campana para todo.
 *
 * Junta en el mismo lugar:
 *  - Nuevos tomos (capítulos subidos desde tu última visita, con prioridad
 *    a los cómics que seguís).
 *  - Seguidores, mensajes, likes y comentarios (tabla notifications).
 *
 * Panel estilo Instagram: chips de filtro, lista con avatar/miniatura y
 * agrupado por Hoy / Ayer / fecha. El globo del botón suma ambos mundos.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BookOpen, CheckCheck, X } from 'lucide-react';
import type { Chapter, Comic } from '../types/comic';
import { useAuth } from '../context/AuthContext';
import { useComics } from '../context/ComicsContext';
import { useFollows } from '../context/FollowsContext';
import { avatarOrFallback } from '../lib/avatarFallback';
import { proxyImageUrl } from '../lib/imageUrl';
import {
  fetchNotifications,
  fetchUnreadNotificationsCount,
  markAllNotificationsRead,
  subscribeToNotifications,
  type NotificationItem,
} from '../lib/notifications';

const SEEN_KEY = 'crow_seen_chapters_at';

const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d`;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
};

const dayLabel = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86_400_000);
  if (diff <= 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7) return `Hace ${diff} días`;
  return d.toLocaleDateString('es', { day: 'numeric', month: 'long' });
};

const readSeenAt = (): Date | null => {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? new Date(raw) : null;
  } catch {
    return null;
  }
};

type Filter = 'todas' | 'seguidores' | 'mensajes' | 'likes' | 'comentarios' | 'tomos';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'todas', label: 'Todas' },
  { id: 'seguidores', label: 'Seguidores' },
  { id: 'mensajes', label: 'Mensajes' },
  { id: 'likes', label: 'Me gusta' },
  { id: 'comentarios', label: 'Comentarios' },
  { id: 'tomos', label: 'Tomos' },
];

interface ChapterRow {
  chapter: Chapter;
  comic: Comic;
  date: Date;
}

type Row =
  | { kind: 'social'; at: string; id: string; n: NotificationItem }
  | { kind: 'chapter'; at: string; id: string; chapter: Chapter; comic: Comic };

interface NotificationsBellProps {
  /** follow → perfil del actor. */
  onSelectProfile: (profileId: string) => void;
  /** message → pantalla de Mensajes. */
  onOpenMessages: () => void;
  /** like/comment → feed de Momentos. */
  onOpenFeed: () => void;
  /** tomo nuevo → ficha del cómic. */
  onSelectComic: (comic: Comic) => void;
}

export const NotificationsBell: React.FC<NotificationsBellProps> = ({
  onSelectProfile,
  onOpenMessages,
  onOpenFeed,
  onSelectComic,
}) => {
  const { user } = useAuth();
  const { comics, refreshComics } = useComics();
  const { follows } = useFollows();
  const meId = user?.id ?? null;
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('todas');
  const [seenAt, setSeenAt] = useState<Date | null>(() => readSeenAt());
  const ref = useRef<HTMLDivElement>(null);

  /* ── Tomos nuevos desde la última visita ── */
  const allChapters = useMemo<ChapterRow[]>(() => {
    const list: ChapterRow[] = [];
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

  // Primera visita: no inundar con todo el catálogo como "nuevo".
  useEffect(() => {
    if (seenAt || allChapters.length === 0) return;
    const newest = allChapters[0].date;
    try {
      localStorage.setItem(SEEN_KEY, newest.toISOString());
    } catch {
      /* noop */
    }
    setSeenAt(newest);
  }, [allChapters, seenAt]);

  const newChapters = useMemo(() => {
    if (!seenAt) return [];
    const t = seenAt.getTime();
    return allChapters.filter((entry) => entry.date.getTime() > t);
  }, [allChapters, seenAt]);

  const followedNew = useMemo(() => {
    if (follows.size === 0) return [];
    return allChapters.filter((entry) => {
      const lastSeen = follows.get(entry.comic.id);
      if (!lastSeen) return false;
      const seen = new Date(lastSeen).getTime();
      return !Number.isNaN(seen) && entry.date.getTime() > seen;
    });
  }, [allChapters, follows]);

  const chapterBadge = follows.size > 0 ? followedNew.length : newChapters.length;

  const markChaptersSeen = useCallback(() => {
    const now = new Date();
    try {
      localStorage.setItem(SEEN_KEY, now.toISOString());
    } catch {
      /* noop */
    }
    setSeenAt(now);
  }, []);

  /* ── Avisos sociales ── */
  const loadCount = useCallback(async () => {
    if (!meId) return;
    setUnread(await fetchUnreadNotificationsCount(meId));
  }, [meId]);

  const loadList = useCallback(async () => {
    if (!meId) {
      setItems([]);
      return;
    }
    try {
      setItems(await fetchNotifications(meId));
    } catch {
      setItems([]);
    }
  }, [meId]);

  // Invitado: no hay avisos sociales, pero los tomos nuevos siguen contando.
  useEffect(() => {
    if (!meId) setItems([]);
  }, [meId]);

  useEffect(() => {
    if (!meId) return;
    void loadCount();
    const unsubscribe = subscribeToNotifications(meId, () => void loadCount());
    const poll = window.setInterval(() => void loadCount(), 60_000);
    return () => {
      unsubscribe();
      window.clearInterval(poll);
    };
  }, [meId, loadCount]);

  // Refresco silencioso del catálogo: un tomo nuevo despierta la campana.
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshComics();
    }, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [refreshComics]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeBell();
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, newChapters.length]);

  const closeBell = () => {
    setOpen(false);
    if (newChapters.length > 0) markChaptersSeen();
  };

  const toggle = () => {
    if (open) {
      closeBell();
      return;
    }
    setOpen(true);
    void loadList();
  };

  const handleOpenSocial = (n: NotificationItem) => {
    if (n.type === 'follow') onSelectProfile(n.actor_id);
    else if (n.type === 'message') onOpenMessages();
    else onOpenFeed();
    closeBell();
  };

  const handleOpenChapter = (comic: Comic) => {
    onSelectComic(comic);
    closeBell();
  };

  const handleMarkAll = async () => {
    if (meId) {
      await markAllNotificationsRead(meId);
      setUnread(0);
      setItems((prev) =>
        (prev ?? []).map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
      );
    }
    markChaptersSeen();
  };

  /* ── Filas unificadas ── */
  const rows = useMemo<Row[]>(() => {
    const socialRows: Row[] = (items ?? []).map((n) => ({
      kind: 'social',
      at: n.created_at,
      id: n.id,
      n,
    }));
    // Tomos: los de cómics seguidos pesan más, pero se muestran todos los nuevos.
    const chapterRows: Row[] = newChapters.slice(0, 20).map((entry) => ({
      kind: 'chapter',
      at: entry.date.toISOString(),
      id: `ch-${entry.chapter.id}`,
      chapter: entry.chapter,
      comic: entry.comic,
    }));

    let list: Row[];
    switch (filter) {
      case 'seguidores':
        list = socialRows.filter((r) => r.kind === 'social' && r.n.type === 'follow');
        break;
      case 'mensajes':
        list = socialRows.filter((r) => r.kind === 'social' && r.n.type === 'message');
        break;
      case 'likes':
        list = socialRows.filter((r) => r.kind === 'social' && r.n.type === 'like');
        break;
      case 'comentarios':
        list = socialRows.filter((r) => r.kind === 'social' && r.n.type === 'comment');
        break;
      case 'tomos':
        list = chapterRows;
        break;
      default:
        list = [...socialRows, ...chapterRows];
    }
    return list.sort((a, b) => +new Date(b.at) - +new Date(a.at));
  }, [items, newChapters, filter]);

  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of rows) {
      const label = dayLabel(row.at);
      const list = map.get(label);
      if (list) list.push(row);
      else map.set(label, [row]);
    }
    return Array.from(map.entries());
  }, [rows]);

  if (!meId && followedNew.length === 0 && newChapters.length === 0) {
    // Invitado sin tomos nuevos: no mostramos campana vacía.
    return null;
  }

  const totalUnread = unread + chapterBadge;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Notificaciones"
        aria-expanded={open}
        title="Notificaciones"
        className={`relative p-2 rounded-xl bg-surface hover:bg-raised text-mute hover:text-ink border transition-all active:scale-90 ${
          totalUnread > 0 ? 'border-accent/40 text-accent' : 'border-line'
        }`}
      >
        <Bell className="w-4 h-4" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-accent2 text-onaccent text-[9px] font-black">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 w-[22rem] max-w-[calc(100vw-1.5rem)] bg-bg border border-line rounded-2xl shadow-2xl overflow-hidden animate-fade-in max-lg:fixed max-lg:top-[4.5rem] max-lg:right-3 max-lg:left-3 max-lg:w-auto lg:bottom-full lg:left-0 lg:mb-2">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="w-4 h-4 text-accent shrink-0" />
              <span className="text-sm font-black text-ink truncate">Notificaciones</span>
              {totalUnread > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-accent/15 text-accent text-[9px] font-bold border border-accent/30">
                  {totalUnread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => void handleMarkAll()}
                disabled={totalUnread === 0}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-mute hover:text-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Marcar todas como leídas"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Marcar leídas</span>
              </button>
              <button
                type="button"
                onClick={closeBell}
                className="p-1 rounded text-faint hover:text-mute transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Chips estilo IG */}
          <div className="flex gap-1.5 px-3 py-2 border-b border-line bg-raised/30 overflow-x-auto [scrollbar-width:none]">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                  filter === f.id
                    ? 'bg-accent text-onaccent'
                    : 'bg-bg border border-line text-mute hover:text-ink'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="max-h-[65vh] overflow-y-auto">
            {items === null && filter !== 'tomos' ? (
              <div className="py-10 text-center">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : rows.length === 0 ? (
              <div className="py-10 px-6 text-center space-y-2">
                <Bell className="w-6 h-6 text-faint mx-auto" />
                <p className="text-[11px] text-mute">
                  {filter === 'tomos'
                    ? 'No hay tomos nuevos desde tu última visita 🐦'
                    : 'Todo tranquilo por acá 🦅'}
                </p>
              </div>
            ) : (
              groups.map(([label, list]) => (
                <div key={label}>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-faint">
                    {label}
                  </p>
                  {list.map((row) =>
                    row.kind === 'social' ? (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => handleOpenSocial(row.n)}
                        className={`w-full flex items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-raised/60 ${
                          row.n.read_at ? '' : 'bg-accent/5'
                        }`}
                      >
                        <img
                          src={avatarOrFallback(row.n.actor_avatar, row.n.actor_id)}
                          alt={row.n.actor_username}
                          className="w-9 h-9 rounded-full object-cover border border-line shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] leading-snug text-mute">
                            <span className="font-bold text-ink">@{row.n.actor_username}</span>{' '}
                            {row.n.type === 'follow' && 'empezó a seguirte.'}
                            {row.n.type === 'message' && `te escribió: ${row.n.body.slice(0, 70)}`}
                            {row.n.type === 'like' && 'le gustó tu momento.'}
                            {row.n.type === 'comment' && `comentó: ${row.n.body.slice(0, 70)}`}
                            <span className="text-faint"> {relativeTime(row.at)}</span>
                          </span>
                        </span>
                        {!row.n.read_at && (
                          <span className="w-2 h-2 rounded-full bg-accent2 shrink-0 mt-1.5" />
                        )}
                      </button>
                    ) : (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => handleOpenChapter(row.comic)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-raised/60"
                      >
                        <img
                          src={proxyImageUrl(row.chapter.cover_url || row.comic.cover_url)}
                          alt={row.comic.title}
                          className="w-9 h-12 rounded-md object-cover border border-line shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.visibility = 'hidden';
                          }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] leading-snug text-mute">
                            Nuevo tomo de{' '}
                            <span className="font-bold text-ink">{row.comic.title}</span>
                          </span>
                          <span className="block text-[10px] text-mute truncate mt-0.5">
                            Cap. {row.chapter.chapter_number} — {row.chapter.title}
                          </span>
                          <span className="block text-[9px] text-faint mt-0.5">
                            {relativeTime(row.at)}
                          </span>
                        </span>
                        <BookOpen className="w-3.5 h-3.5 text-accent shrink-0" />
                      </button>
                    ),
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
