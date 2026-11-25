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

const groupByDay = (items: ReleaseItem[]): Array<{ key: string; label: string; items: ReleaseItem[] }> => {
  const map = new Map<string, ReleaseItem[]>();
  for (const item of items) {
    const key = dayKey(item.release_at);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return Array.from(map.entries()).map(([key, list]) => ({
    key,
    label: releaseDateLabel(list[0].release_at),
    items: list,
  }));
};

const ReleaseCard: React.FC<{
  item: ReleaseItem;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpenComic: (comicId: string) => void;
  isPast?: boolean;
}> = ({ item, canManage, onEdit, onDelete, onOpenComic, isPast }) => {
  const d = new Date(item.release_at);
  return (
    <article className="group relative flex gap-3 sm:gap-4 p-3 rounded-2xl border border-line bg-surface hover:border-accent/40 transition-colors">
      {/* Bloque de fecha */}
      <div className="shrink-0 w-14 sm:w-16 rounded-xl bg-bg border border-line flex flex-col items-center justify-center py-2">
        <span className="text-[9px] uppercase font-bold tracking-wider text-faint">
          {d.toLocaleDateString('es', { timeZone: COLOMBIA_TZ, month: 'short' }).replace('.', '')}
        </span>
        <span className={`text-xl font-black leading-none ${isPast ? 'text-mute' : 'text-accent'}`}>
          {colombiaDayNumber(item.release_at)}
        </span>
        <span className="text-[9px] text-faint mt-0.5">
          {d.toLocaleDateString('es', { timeZone: COLOMBIA_TZ, weekday: 'short' }).replace('.', '')}
        </span>
      </div>

      {/* Portada */}
      <div className="shrink-0 w-14 sm:w-16 aspect-[2/3] rounded-lg overflow-hidden bg-bg border border-line">
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
            <BookOpen className="w-5 h-5 text-faint" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 py-0.5 space-y-1">
        <div className="flex items-start gap-2">
          <h3 className={`text-sm font-bold leading-snug ${isPast ? 'text-mute' : 'text-ink'}`}>
            {item.title}
          </h3>
          {item.publisher && (
            <span className="hidden sm:inline-flex shrink-0 px-1.5 py-0.5 rounded-md bg-raised text-[9px] font-bold text-mute uppercase tracking-wide">
              {item.publisher}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-mute">
          {item.chapter_label && <span className="font-semibold text-accent">{item.chapter_label}</span>}
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {releaseTimeLabel(item.release_at)}
          </span>
          {!isPast && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/25 text-[9px] font-bold uppercase tracking-wide">
              <CalendarClock className="w-2.5 h-2.5" />
              {countdownLabel(item.release_at)}
            </span>
          )}
        </div>
        {item.notes && <p className="text-[11px] text-faint leading-snug line-clamp-2">{item.notes}</p>}
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
      upcoming: all
        .filter((r) => new Date(r.release_at).getTime() >= now)
        .sort((a, b) => +new Date(a.release_at) - +new Date(b.release_at)),
      past: all
        .filter((r) => new Date(r.release_at).getTime() < now)
        .sort((a, b) => +new Date(b.release_at) - +new Date(a.release_at))
        .slice(0, 20),
    };
  }, [releases]);

  const list = tab === 'upcoming' ? upcoming : past;
  const groups = useMemo(() => groupByDay(list), [list]);
  const next = upcoming[0];

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
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key} className="space-y-2.5">
              <div className="flex items-center gap-2">
                <h2 className="text-[11px] font-black uppercase tracking-widest text-mute">
                  {group.label}
                </h2>
                <span className="flex-1 h-px bg-line" />
                <span className="text-[10px] font-bold text-faint">
                  {group.items.length} lanzamiento{group.items.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <ReleaseCard
                    key={item.id}
                    item={item}
                    canManage={canManageContent && Boolean(user)}
                    onEdit={() => openEdit(item)}
                    onDelete={() => void handleDelete(item)}
                    onOpenComic={onOpenComic}
                    isPast={tab === 'past'}
                  />
                ))}
              </div>
            </section>
          ))}
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
