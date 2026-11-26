/**
 * ReleasesPage (v0.11.0): calendario público de lanzamientos.
 * Muestra lo que viene agrupado por día (fecha + hora), con portada,
 * editorial y countdown. El equipo puede crear/editar/borrar anuncios.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  LayoutList,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import type { Comic } from '../types/comic';
import { useAuth } from '../context/AuthContext';
import { showToast } from './ui/Toast';
import { ReleaseFormModal } from './ReleaseFormModal';
import { Modal } from './ui/Modal';
import { proxyImageUrl } from '../lib/imageUrl';
import {
  COLOMBIA_TZ,
  colombiaDayKey,
  colombiaDayNumber,
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

/* Paleta del timeline (se repite a lo largo del riel). */
const TIMELINE_COLORS = ['#a3e635', '#38bdf8', '#fb7185', '#facc15', '#fb923c', '#a78bfa'];

const HEX_CLIP = 'polygon(24% 0%, 76% 0%, 100% 50%, 76% 100%, 24% 100%, 0% 50%)';

const pad2 = (n: number) => String(n).padStart(2, '0');

const CAL_WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const TimelineColumn: React.FC<{
  entry: TimelineEntry;
  color: string;
  nextColor: string;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpenComic: (comicId: string) => void;
  isPast?: boolean;
  dayLabel?: string | null;
}> = ({
  entry,
  color,
  nextColor,
  canManage,
  onEdit,
  onDelete,
  onOpenComic,
  isPast,
  dayLabel,
}) => {
  const item = entry.primary;
  const ownNumber = chapterNumberOf(item);
  const others = entry.numbers.filter((n) => n !== ownNumber);
  const dayNumber = colombiaDayNumber(item.release_at);
  const monthLabel = new Date(item.release_at)
    .toLocaleDateString('es', { timeZone: COLOMBIA_TZ, month: 'short' })
    .replace('.', '');

  return (
    <div className="relative w-[132px] sm:w-[156px] shrink-0 snap-start">
      {/* Día (solo en la primera tarjeta del grupo) */}
      <div className="h-5 mb-1.5 flex items-center justify-center">
        {dayLabel && (
          <span className="text-[9px] font-black uppercase tracking-widest text-faint whitespace-nowrap">
            {dayLabel}
          </span>
        )}
      </div>

      {/* Hexágono con la fecha */}
      <div
        className="relative mx-auto h-[54px] w-[88px] transition-transform duration-300 hover:-translate-y-0.5"
        style={{ clipPath: HEX_CLIP, background: isPast ? `${color}66` : color }}
      >
        <div
          className="absolute inset-[2px] flex flex-col items-center justify-center bg-bg"
          style={{ clipPath: HEX_CLIP }}
        >
          <span
            className="text-lg font-black leading-none"
            style={{ color: isPast ? 'var(--color-mute)' : color }}
          >
            {dayNumber}
          </span>
          <span className="text-[8px] font-bold uppercase tracking-widest text-faint mt-0.5">
            {monthLabel}
          </span>
        </div>
      </div>

      {/* Riel + conectores */}
      <div className="relative h-10">
        <span
          aria-hidden
          className="absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2"
          style={{ background: color, opacity: 0.45 }}
        />
        <span
          aria-hidden
          className="absolute -left-2 -right-2 top-1/2 h-[3px] -translate-y-1/2"
          style={{ background: `linear-gradient(90deg, ${color}, ${nextColor})` }}
        />
        <span
          aria-hidden
          className="absolute left-1/2 bottom-0 h-1/2 w-px -translate-x-1/2"
          style={{ background: color, opacity: 0.45 }}
        />
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-bg"
          style={{
            borderColor: isPast ? 'var(--color-line)' : color,
            boxShadow: isPast ? undefined : `0 0 0 3px ${color}22`,
          }}
        />
      </div>

      {/* Tarjeta */}
      <div
        className="group/card relative mt-1 overflow-hidden rounded-2xl border bg-surface transition-colors hover:border-accent/40"
        style={{ borderColor: `${color}55` }}
      >
        <div className="relative aspect-[2/3] overflow-hidden bg-bg">
          {item.cover_url ? (
            <img
              src={proxyImageUrl(item.cover_url)}
              alt={item.title}
              className={`w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-[1.04] ${
                isPast ? 'opacity-90' : ''
              }`}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-faint" />
            </div>
          )}

          {item.chapter_label && (
            <span className="absolute left-1.5 top-1.5 max-w-[calc(100%-12px)] truncate px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[9px] font-bold text-white">
              {item.chapter_label}
            </span>
          )}

          {!isPast && (
            <span
              className="absolute right-1.5 top-1.5 max-w-[calc(100%-12px)] truncate px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wide shadow-lg"
              style={{ background: color, color: '#0b0b0b' }}
            >
              {countdownLabel(item.release_at)}
            </span>
          )}

          {entry.count > 1 && (
            <span
              className="absolute right-1.5 bottom-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[9px] font-bold text-white"
              title={
                others.length
                  ? `También salieron: ${others.map((n) => `#${n}`).join(', ')}`
                  : undefined
              }
            >
              <Layers className="w-2.5 h-2.5" />
              {entry.count} tomos
            </span>
          )}

          {isPast && (
            <span className="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[8px] font-bold uppercase tracking-wide text-white/80">
              Publicado
            </span>
          )}
        </div>

        <div className="p-2 space-y-1">
          <h3
            className={`text-[11px] font-bold leading-tight line-clamp-2 ${
              isPast ? 'text-mute' : 'text-ink'
            }`}
          >
            {item.title}
          </h3>

          <div className="flex items-center justify-between gap-1 text-[10px]">
            <span className="inline-flex items-center gap-1 font-bold" style={{ color }}>
              <Clock className="w-2.5 h-2.5" />
              {releaseTimeLabel(item.release_at)}
            </span>
            {item.publisher && (
              <span className="text-[8px] font-bold uppercase tracking-wide text-faint truncate">
                {item.publisher}
              </span>
            )}
          </div>

          <div className="flex items-end justify-between gap-1 pt-0.5">
            {item.comic_id ? (
              <button
                type="button"
                onClick={() => onOpenComic(item.comic_id as string)}
                className="inline-flex items-center gap-1 text-[10px] font-bold hover:text-accent2 transition-colors"
                style={{ color }}
              >
                <BookOpen className="w-2.5 h-2.5" /> Ver cómic
              </button>
            ) : (
              <span />
            )}

            {canManage && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onEdit}
                  className="p-1 rounded-md bg-bg border border-line text-mute hover:text-accent hover:border-accent/40 transition-colors"
                  title="Editar"
                  aria-label="Editar lanzamiento"
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="p-1 rounded-md bg-bg border border-line text-mute hover:text-accent2 hover:border-accent/40 transition-colors"
                  title="Borrar"
                  aria-label="Borrar lanzamiento"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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
  const [view, setView] = useState<'timeline' | 'calendar'>('timeline');
  const [dayOpen, setDayOpen] = useState<string | null>(null);

  const todayKey = colombiaDayKey(new Date().toISOString());
  const [cursor, setCursor] = useState(() => {
    const [y, m] = colombiaDayKey(new Date().toISOString()).split('-').map(Number);
    return { year: y, month: m - 1 };
  });

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
  const flat = useMemo(
    () =>
      groups.flatMap((group) =>
        group.entries.map((entry, i) => ({ entry, dayLabel: i === 0 ? group.label : null })),
      ),
    [groups],
  );

  /* ── Vista calendario ─────────────────────────────────────────────── */
  const allEntries = useMemo(() => collapseBatches(releases ?? [], 'asc'), [releases]);

  const byDay = useMemo(() => {
    const map = new Map<string, TimelineEntry[]>();
    for (const entry of allEntries) {
      const key = colombiaDayKey(entry.primary.release_at);
      const list = map.get(key);
      if (list) list.push(entry);
      else map.set(key, [entry]);
    }
    return map;
  }, [allEntries]);

  const calendar = useMemo(() => {
    const { year, month } = cursor;
    const first = new Date(Date.UTC(year, month, 1));
    const lead = (first.getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const cells: Array<{ key: string; day: number | null }> = [];
    for (let i = 0; i < lead; i += 1) cells.push({ key: `lead-${i}`, day: null });
    for (let d = 1; d <= days; d += 1) {
      cells.push({ key: `${year}-${pad2(month + 1)}-${pad2(d)}`, day: d });
    }
    while (cells.length % 7 !== 0) cells.push({ key: `tail-${cells.length}`, day: null });
    return {
      cells,
      label: first.toLocaleDateString('es', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    };
  }, [cursor]);

  const dayEntries = dayOpen ? (byDay.get(dayOpen) ?? []) : [];

  const shiftMonth = (delta: number) => {
    setCursor(({ year, month }) => {
      const d = new Date(Date.UTC(year, month + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });
  };

  const goToday = () => {
    const [y, m] = todayKey.split('-').map(Number);
    setCursor({ year: y, month: m - 1 });
  };
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

      {/* Pestañas + selector de vista */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {view === 'timeline' ? (
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
        ) : (
          <p className="text-[11px] text-faint">
            Tocá un día con portada para ver sus lanzamientos.
          </p>
        )}

        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-surface border border-line">
          <button
            onClick={() => setView('timeline')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              view === 'timeline' ? 'bg-accent text-onaccent' : 'text-mute hover:text-ink'
            }`}
            aria-pressed={view === 'timeline'}
          >
            <LayoutList className="w-3.5 h-3.5" /> Timeline
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              view === 'calendar' ? 'bg-accent text-onaccent' : 'text-mute hover:text-ink'
            }`}
            aria-pressed={view === 'calendar'}
          >
            <CalendarDays className="w-3.5 h-3.5" /> Calendario
          </button>
        </div>
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
      ) : allEntries.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <CalendarX2 className="w-10 h-10 text-faint" />
          <p className="text-sm font-bold text-mute">No hay lanzamientos programados</p>
          <p className="text-[11px] text-faint max-w-sm">
            Cuando el equipo agregue fechas, van a aparecer acá en el timeline y en el calendario.
          </p>
          {canManageContent && user && (
            <button
              onClick={openNew}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent2 text-onaccent text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar el primero
            </button>
          )}
        </div>
      ) : view === 'calendar' ? (
        <div className="rounded-3xl border border-line bg-surface p-3 sm:p-5 space-y-4">
          {/* Navegación de mes */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => shiftMonth(-1)}
                className="p-2 rounded-xl bg-bg border border-line text-mute hover:text-ink hover:bg-raised transition-colors"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="min-w-[9.5rem] text-center text-sm sm:text-base font-black text-ink capitalize">
                {calendar.label}
              </h2>
              <button
                onClick={() => shiftMonth(1)}
                className="p-2 rounded-xl bg-bg border border-line text-mute hover:text-ink hover:bg-raised transition-colors"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={goToday}
              className="px-3 py-1.5 rounded-xl bg-bg border border-line text-[11px] font-bold text-mute hover:text-accent hover:border-accent/40 transition-colors"
            >
              Hoy
            </button>
          </div>

          {/* Días de la semana + grilla */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {CAL_WEEKDAYS.map((d) => (
              <div
                key={d}
                className="pb-1 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-faint"
              >
                {d}
              </div>
            ))}

            {calendar.cells.map((cell) => {
              if (!cell.day) return <div key={cell.key} aria-hidden />;
              const dayList = byDay.get(cell.key) ?? [];
              const latest = dayList[dayList.length - 1];
              const has = dayList.length > 0;
              const isToday = cell.key === todayKey;
              const isPastDay = cell.key < todayKey;

              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={!has}
                  onClick={() => setDayOpen(cell.key)}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl transition-colors ${
                    has ? 'cursor-pointer hover:bg-raised/50' : 'cursor-default'
                  }`}
                  aria-label={
                    has ? `Ver ${dayList.length} lanzamiento(s) del día ${cell.day}` : undefined
                  }
                >
                  <span
                    className={`relative flex items-center justify-center overflow-hidden rounded-full ${
                      has
                        ? 'w-10 h-10 sm:w-14 sm:h-14'
                        : 'w-8 h-8 sm:w-10 sm:h-10 border border-line/60'
                    } ${isToday ? 'ring-2 ring-accent' : has ? 'ring-1 ring-line' : ''} ${
                      !has && isPastDay ? 'opacity-40' : ''
                    }`}
                  >
                    {has && latest.primary.cover_url && (
                      <img
                        src={proxyImageUrl(latest.primary.cover_url)}
                        alt=""
                        className={`absolute inset-0 h-full w-full object-cover ${
                          isPastDay ? 'opacity-70' : ''
                        }`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    {has && <span className="absolute inset-0 bg-black/45" />}
                    <span
                      className={`relative font-black leading-none ${
                        has ? 'text-sm sm:text-base text-white' : 'text-[11px] sm:text-xs text-mute'
                      } ${isToday && !has ? 'text-accent' : ''}`}
                    >
                      {cell.day}
                    </span>
                  </span>

                  {dayList.length > 1 && (
                    <span className="absolute right-0.5 top-0.5 sm:right-1 sm:top-1 min-w-[15px] h-[15px] px-1 rounded-full bg-accent text-onaccent text-[8px] font-black flex items-center justify-center">
                      {dayList.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : groups.length === 0 ? (
        <div className="py-12 flex flex-col items-center gap-2 text-center">
          <CalendarX2 className="w-8 h-8 text-faint" />
          <p className="text-sm font-bold text-mute">
            {tab === 'upcoming'
              ? 'No hay lanzamientos próximos'
              : 'Todavía no hay lanzamientos pasados'}
          </p>
          <p className="text-[11px] text-faint">
            {tab === 'upcoming'
              ? 'Probá la vista Calendario o programá uno nuevo.'
              : 'Los lanzamientos aparecen acá cuando pasa su fecha.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {totalTomos > list.length && (
            <p className="text-[11px] text-faint">
              Los tomos que salieron al mismo tiempo se muestran como una sola tarjeta, con el
              último número publicado.
            </p>
          )}

          <div className="overflow-x-auto pb-4 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex items-stretch min-w-max">
              {flat.map(({ entry, dayLabel }, index) => (
                <TimelineColumn
                  key={entry.primary.id}
                  entry={entry}
                  color={TIMELINE_COLORS[index % TIMELINE_COLORS.length]}
                  nextColor={TIMELINE_COLORS[(index + 1) % TIMELINE_COLORS.length]}
                  canManage={canManageContent && Boolean(user)}
                  onEdit={() => openEdit(entry.primary)}
                  onDelete={() => void handleDelete(entry.primary)}
                  onOpenComic={onOpenComic}
                  isPast={tab === 'past'}
                  dayLabel={dayLabel}
                />
              ))}
            </div>
          </div>

          {list.length > 3 && (
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-faint">
              <ArrowRight className="w-3 h-3" /> Deslizá para ver el resto del timeline
            </p>
          )}
        </div>
      )}

      {/* Ficha del día */}
      <Modal
        isOpen={dayOpen !== null}
        onClose={() => setDayOpen(null)}
        className="max-w-lg"
        closeOnBackdrop
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-line">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-accent">
              Lanzamientos del día
            </p>
            <h3 className="text-base sm:text-lg font-black text-ink capitalize leading-tight">
              {dayOpen ? releaseDateLabel(`${dayOpen}T12:00:00-05:00`) : ''}
            </h3>
            <p className="text-[11px] text-faint">
              {dayEntries.length} lanzamiento{dayEntries.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDayOpen(null)}
            className="shrink-0 p-2 rounded-xl bg-bg border border-line text-mute hover:text-ink hover:border-accent/40 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-2 overflow-y-auto">
          {dayEntries.map((entry) => {
            const item = entry.primary;
            const isPastItem = new Date(item.release_at).getTime() < Date.now();
            return (
              <div
                key={item.id}
                className="flex gap-3 p-2.5 rounded-2xl border border-line bg-bg/40"
              >
                <div className="w-14 shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-bg border border-line">
                  {item.cover_url ? (
                    <img
                      src={proxyImageUrl(item.cover_url)}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-faint" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-accent">
                      <Clock className="w-3 h-3" />
                      {releaseTimeLabel(item.release_at)}
                    </span>
                    {isPastItem ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-raised text-[9px] font-bold uppercase tracking-wide text-mute">
                        Publicado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/25 text-[9px] font-bold uppercase tracking-wide">
                        <CalendarClock className="w-2.5 h-2.5" />
                        {countdownLabel(item.release_at)}
                      </span>
                    )}
                    {entry.count > 1 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-bg border border-line text-[9px] font-bold text-mute">
                        <Layers className="w-2.5 h-2.5" />
                        {entry.count} tomos
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-ink leading-snug line-clamp-2">
                    {item.title}
                  </h4>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-faint">
                    {item.chapter_label && (
                      <span className="font-bold text-accent">{item.chapter_label}</span>
                    )}
                    {item.publisher && (
                      <span className="uppercase tracking-wide">{item.publisher}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    {item.comic_id ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDayOpen(null);
                          onOpenComic(item.comic_id as string);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent2 transition-colors"
                      >
                        <BookOpen className="w-3 h-3" /> Ver cómic
                      </button>
                    ) : (
                      <span />
                    )}

                    {canManageContent && user && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setDayOpen(null);
                            openEdit(item);
                          }}
                          className="p-1.5 rounded-lg bg-bg border border-line text-mute hover:text-accent hover:border-accent/40 transition-colors"
                          title="Editar"
                          aria-label="Editar lanzamiento"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item)}
                          className="p-1.5 rounded-lg bg-bg border border-line text-mute hover:text-accent2 hover:border-accent/40 transition-colors"
                          title="Borrar"
                          aria-label="Borrar lanzamiento"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

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
