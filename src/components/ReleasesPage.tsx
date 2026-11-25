/**
 * ReleasesPage (v0.11.0): calendario público de lanzamientos.
 * Muestra lo que viene agrupado por día (fecha + hora), con portada,
 * editorial y countdown. El equipo puede crear/editar/borrar anuncios.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CalendarX2,
  Clock,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { Comic } from '../types/comic';
import { useAuth } from '../context/AuthContext';
import { showToast } from './ui/Toast';
import { ReleaseFormModal } from './ReleaseFormModal';
import { proxyImageUrl } from '../lib/imageUrl';
import {
  COLOMBIA_TZ,
  colombiaDayKey,
  countdownLabel,
  deleteRelease,
  fetchReleases,
  releaseDateLabel,
  releaseTimeLabel,
  type ReleaseItem,
} from '../lib/releases';

interface ReleasesPageProps {
  comics: Comic[];
  onOpenComic: (comicId: string) => void;
  onBack: () => void;
}

const dayKey = (iso: string): string => colombiaDayKey(iso);

/** Clave de serie: mismo cómic (o mismo título sin el "Tomo #N"). */
const seriesKeyOf = (item: ReleaseItem): string => {
  if (item.comic_id) return `c:${item.comic_id}`;
  const base = item.title
    .replace(/\s*[-–—]\s*tomo\s*#?\s*\d+\s*$/i, '')
    .trim()
    .toLowerCase();
  return `t:${base || item.title.trim().toLowerCase()}`;
};

/** Número del tomo: de "… - Tomo #13", "#13 - …" o "#13". */
const chapterNumberOf = (item: ReleaseItem): number | null => {
  const m =
    item.title.match(/tomo\s*#\s*(\d+)/i) ??
    item.chapter_label?.match(/#\s*(\d+)/) ??
    item.title.match(/#\s*(\d+)/);
  return m ? Number(m[1]) : null;
};

interface TimelineEntry {
  primary: ReleaseItem;
  /** Cuántos tomos salieron juntos en ese mismo instante. */
  count: number;
  /** Números de esos tomos, de menor a mayor. */
  numbers: number[];
}

/**
 * Si varios tomos de la misma serie salen a la misma hora, se muestra uno solo:
 * el del número más alto (el último publicado). El resto queda como "+N tomos".
 */
const collapseBatches = (items: ReleaseItem[], order: 'asc' | 'desc' = 'asc'): TimelineEntry[] => {
  const map = new Map<string, ReleaseItem[]>();
  for (const item of items) {
    const key = `${seriesKeyOf(item)}|${colombiaDayKey(item.release_at)}|${releaseTimeLabel(item.release_at)}`;
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }

  const entries: TimelineEntry[] = [];
  for (const batch of map.values()) {
    let primary = batch[0];
    for (const item of batch) {
      const n = chapterNumberOf(item);
      const p = chapterNumberOf(primary);
      if (n !== null && (p === null || n > p)) primary = item;
    }
    const numbers = batch
      .map(chapterNumberOf)
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);
    entries.push({ primary, count: batch.length, numbers });
  }

  const dir = order === 'asc' ? 1 : -1;
  return entries.sort(
    (a, b) => (+new Date(a.primary.release_at) - +new Date(b.primary.release_at)) * dir,
  );
};

const groupEntriesByDay = (
  entries: TimelineEntry[],
): Array<{ key: string; label: string; entries: TimelineEntry[] }> => {
  const map = new Map<string, TimelineEntry[]>();
  for (const entry of entries) {
    const key = dayKey(entry.primary.release_at);
    const list = map.get(key);
    if (list) list.push(entry);
    else map.set(key, [entry]);
  }
  return Array.from(map.entries()).map(([key, list]) => ({
    key,
    label: releaseDateLabel(list[0].primary.release_at),
    entries: list,
  }));
};

const shortDateLabel = (iso: string): string =>
  new Date(iso).toLocaleDateString('es', {
    timeZone: COLOMBIA_TZ,
    day: 'numeric',
    month: 'short',
  });

const TimelineCard: React.FC<{
  entry: TimelineEntry;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpenComic: (comicId: string) => void;
  isPast?: boolean;
  isLast?: boolean;
}> = ({ entry, canManage, onEdit, onDelete, onOpenComic, isPast, isLast }) => {
  const item = entry.primary;
  const ownNumber = chapterNumberOf(item);
  const others = entry.numbers.filter((n) => n !== ownNumber);

  return (
    <article className="group relative pl-7 sm:pl-9">
      {/* Riel vertical */}
      <span
        aria-hidden
        className={`absolute left-[11px] top-0 w-px ${
          isLast ? 'h-9' : 'h-full'
        } ${isPast ? 'bg-line/70' : 'bg-gradient-to-b from-accent/50 via-line to-line/40'}`}
      />
      {/* Nodo */}
      <span
        aria-hidden
        className={`absolute left-[11px] top-9 z-10 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
          isPast
            ? 'border-line bg-bg'
            : 'border-accent bg-bg shadow-[0_0_0_4px_rgba(163,230,53,0.14)]'
        }`}
      />

      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface transition-all duration-200 hover:border-accent/40 hover:bg-raised/30">
        {!isPast && (
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-accent via-accent/40 to-transparent"
          />
        )}
        <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-3.5">
          {/* Portada */}
          <div className="shrink-0 w-16 sm:w-20">
            <div className="aspect-[2/3] rounded-xl overflow-hidden bg-bg border border-line shadow-lg shadow-black/40">
              {item.cover_url ? (
                <img
                  src={proxyImageUrl(item.cover_url)}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-faint" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1 py-0.5 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-accent">
                <Clock className="w-3 h-3" />
                {releaseTimeLabel(item.release_at)}
              </span>
              <span className="text-[10px] text-faint">· {shortDateLabel(item.release_at)}</span>
              {isPast ? (
                <span className="px-1.5 py-0.5 rounded-md bg-raised text-[9px] font-bold uppercase tracking-wide text-mute">
                  Publicado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/25 text-[9px] font-bold uppercase tracking-wide">
                  <CalendarClock className="w-2.5 h-2.5" />
                  {countdownLabel(item.release_at)}
                </span>
              )}
              {item.publisher && (
                <span className="px-1.5 py-0.5 rounded-md bg-raised text-[9px] font-bold text-mute uppercase tracking-wide">
                  {item.publisher}
                </span>
              )}
            </div>

            <h3
              className={`text-sm sm:text-[15px] font-bold leading-snug line-clamp-2 ${
                isPast ? 'text-ink/80' : 'text-ink'
              }`}
            >
              {item.title}
            </h3>

            <div className="flex flex-wrap items-center gap-1.5">
              {item.chapter_label && (
                <span className="px-2 py-0.5 rounded-lg bg-accent/10 border border-accent/25 text-[10px] font-bold text-accent">
                  {item.chapter_label}
                </span>
              )}
              {entry.count > 1 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-bg border border-line text-[10px] font-semibold text-mute"
                  title={others.length ? `También salieron: ${others.map((n) => `#${n}`).join(', ')}` : undefined}
                >
                  <Layers className="w-3 h-3" />
                  {entry.count} tomos juntos
                </span>
              )}
            </div>

            {item.notes && (
              <p className="text-[11px] text-faint leading-snug line-clamp-2">{item.notes}</p>
            )}

            {item.comic_id && (
              <button
                type="button"
                onClick={() => onOpenComic(item.comic_id as string)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:text-accent2 transition-colors pt-0.5"
              >
                <BookOpen className="w-3 h-3" /> Ver cómic
              </button>
            )}
          </div>
        </div>

        {canManage && (
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={onEdit}
              className="p-1.5 rounded-lg bg-bg/90 border border-line text-mute hover:text-accent hover:border-accent/40 transition-colors"
              title="Editar"
              aria-label="Editar lanzamiento"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 rounded-lg bg-bg/90 border border-line text-mute hover:text-accent2 hover:border-accent/40 transition-colors"
              title="Borrar"
              aria-label="Borrar lanzamiento"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
};

export const ReleasesPage: React.FC<ReleasesPageProps> = ({ comics, onOpenComic, onBack }) => {
  const { user, canManageContent } = useAuth();
  const [releases, setReleases] = useState<ReleaseItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ReleaseItem | null>(null);
  const [reloading, setReloading] = useState(false);

  const load = useCallback(async (spinner = false) => {
    if (spinner) setReloading(true);
    try {
      setReleases(await fetchReleases());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el calendario');
      setReleases([]);
    } finally {
      if (spinner) setReloading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const all = releases ?? [];
    return {
      upcoming: collapseBatches(all.filter((r) => new Date(r.release_at).getTime() >= now), 'asc'),
      past: collapseBatches(all.filter((r) => new Date(r.release_at).getTime() < now), 'desc').slice(
        0,
        20,
      ),
    };
  }, [releases]);

  const list = tab === 'upcoming' ? upcoming : past;
  const groups = useMemo(() => groupEntriesByDay(list), [list]);
  const next = upcoming[0]?.primary;
  const totalTomos = list.reduce((acc, entry) => acc + entry.count, 0);

  const handleDelete = async (item: ReleaseItem) => {
    if (!window.confirm(`¿Borrar el lanzamiento de "${item.title}"?`)) return;
    try {
      await deleteRelease(item.id);
      showToast('Lanzamiento borrado', 'info');
      void load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo borrar', 'error');
    }
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: ReleaseItem) => {
    setEditing(item);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface hover:bg-raised text-mute hover:text-ink border border-line transition-colors text-xs font-semibold group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-accent" />
          <span>Volver al Inicio</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void load(true)}
            disabled={reloading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface hover:bg-raised text-mute hover:text-ink border border-line transition-colors text-xs font-semibold disabled:opacity-60"
            title="Actualizar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reloading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          {canManageContent && user && (
            <button
              onClick={openNew}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent hover:bg-accent2 text-onaccent text-xs font-bold transition-colors shadow-lg shadow-accent/20"
            >
              <Plus className="w-3.5 h-3.5" /> Nuevo lanzamiento
            </button>
          )}
        </div>
      </div>

      {/* Encabezado */}
      <header className="relative overflow-hidden rounded-[2rem] border border-accent/25 bg-surface shadow-2xl">
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="relative p-6 sm:p-8 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-accent" />
            <span className="text-[11px] font-black uppercase tracking-widest text-accent">
              Calendario
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-ink leading-tight">
            Próximos lanzamientos
          </h1>
          <p className="text-xs sm:text-sm text-mute max-w-2xl">
            Día y hora de lo que viene en Crow Comics. Los tomos ya publicados quedan abajo, en
            «Pasados».
          </p>

          {next && (
            <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 px-3.5 py-2 rounded-2xl bg-bg/60 border border-line">
              <span className="text-[10px] font-bold uppercase tracking-wide text-faint">
                Próximo
              </span>
              <span className="text-sm font-bold text-ink">{next.title}</span>
              {next.chapter_label && (
                <span className="text-[11px] font-bold text-accent">{next.chapter_label}</span>
              )}
              <span className="inline-flex items-center gap-1 text-[11px] text-mute">
                <Clock className="w-3 h-3" />
                {releaseDateLabel(next.release_at)} · {releaseTimeLabel(next.release_at)}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 text-[9px] font-black uppercase tracking-wide">
                {countdownLabel(next.release_at)}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Pestañas */}
      <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-surface border border-line">
        <button
          onClick={() => setTab('upcoming')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            tab === 'upcoming' ? 'bg-accent text-onaccent' : 'text-mute hover:text-ink'
          }`}
        >
          Próximos {upcoming.length > 0 ? `(${upcoming.length})` : ''}
        </button>
        <button
          onClick={() => setTab('past')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            tab === 'past' ? 'bg-accent text-onaccent' : 'text-mute hover:text-ink'
          }`}
        >
          Pasados {past.length > 0 ? `(${past.length})` : ''}
        </button>
      </div>

      {/* Contenido */}
      {releases === null ? (
        <div className="py-16 flex flex-col items-center gap-3 text-mute">
          <Loader2 className="w-6 h-6 animate-spin text-accent2" />
          <p className="text-xs">Cargando calendario…</p>
        </div>
      ) : error ? (
        <div className="py-12 px-4 rounded-2xl border border-amber-800/60 bg-amber-950/30 text-center space-y-2">
          <CalendarX2 className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-sm font-bold text-amber-200">El calendario todavía no está activo</p>
          <p className="text-[11px] text-amber-200/80 max-w-md mx-auto">{error}</p>
          {canManageContent && (
            <p className="text-[11px] text-amber-200/80">
              Corré <code className="px-1 py-0.5 rounded bg-black/30">add-release-schedule.sql</code>{' '}
              en el SQL Editor de Supabase y recargá.
            </p>
          )}
        </div>
      ) : groups.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <CalendarX2 className="w-10 h-10 text-faint" />
          <p className="text-sm font-bold text-mute">
            {tab === 'upcoming' ? 'No hay lanzamientos programados' : 'Todavía no hay lanzamientos pasados'}
          </p>
          <p className="text-[11px] text-faint max-w-sm">
            {tab === 'upcoming'
              ? 'Cuando el equipo agregue fechas, van a aparecer acá ordenadas por día y hora.'
              : 'Los lanzamientos aparecen acá cuando pasa su fecha.'}
          </p>
          {canManageContent && user && tab === 'upcoming' && (
            <button
              onClick={openNew}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent2 text-onaccent text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar el primero
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-7">
          {totalTomos > list.length && (
            <p className="text-[11px] text-faint">
              Los tomos que salieron al mismo tiempo se muestran como uno solo, con el último
              número publicado.
            </p>
          )}
          {groups.map((group) => {
            const tomos = group.entries.reduce((acc, entry) => acc + entry.count, 0);
            return (
              <section key={group.key} className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-[11px] font-black uppercase tracking-widest text-mute whitespace-nowrap">
                    {group.label}
                  </h2>
                  <span className="flex-1 h-px bg-gradient-to-r from-line to-transparent" />
                  <span className="text-[10px] font-bold text-faint whitespace-nowrap">
                    {tomos} tomo{tomos === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {group.entries.map((entry, i) => (
                    <TimelineCard
                      key={entry.primary.id}
                      entry={entry}
                      canManage={canManageContent && Boolean(user)}
                      onEdit={() => openEdit(entry.primary)}
                      onDelete={() => void handleDelete(entry.primary)}
                      onOpenComic={onOpenComic}
                      isPast={tab === 'past'}
                      isLast={i === group.entries.length - 1}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <ReleaseFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        release={editing}
        comics={comics}
        onSaved={() => void load()}
      />
    </div>
  );
};
