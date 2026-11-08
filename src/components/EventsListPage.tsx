import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ListOrdered, Layers, Calendar, Plus, Pencil } from 'lucide-react';
import type { Comic, ReadingEvent } from '../types/comic';
import { getEventItems, getEvents } from '../lib/events';
import { useAuth } from '../context/AuthContext';
import { EventsAdminModal } from './EventsAdminModal';

interface EventsListPageProps {
  comics: Comic[];
  onSelectEvent: (event: ReadingEvent) => void;
}

/**
 * Catálogo de "Guías de Lectura" (Sprint 5): cuadrícula de eventos/crossovers
 * al estilo de ComicCard. Cada tarjeta calcula cuántos cómics del evento
 * existen realmente en la tabla comics y muestra una barra de progreso
 * ("X de Y disponibles").
 */
export const EventsListPage: React.FC<EventsListPageProps> = ({
  comics,
  onSelectEvent
}) => {
  const [events, setEvents] = useState<ReadingEvent[]>([]);
  const [itemsByEvent, setItemsByEvent] = useState<Record<string, Array<string | null>>>({});
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const loaded = await getEvents();
    const itemResults = await Promise.all(loaded.map((event) => getEventItems(event.id)));
    setEvents(loaded);
    setItemsByEvent(
      Object.fromEntries(
        loaded.map((event, i) => [event.id, itemResults[i].map((item) => item.comic_id)])
      )
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      if (cancelled) return;
      await reload();
    };

    void fetchAll();
    return () => { cancelled = true; };
  }, [reload]);

  const comicIds = useMemo(() => new Set(comics.map((comic) => comic.id)), [comics]);

  // "X de Y disponibles": Y = números del evento; X = los que existen en comics
  const availability = useMemo(() => {
    const byId = new Map<string, { total: number; available: number }>();
    for (const event of events) {
      const ids = itemsByEvent[event.id] ?? [];
      const available = ids.filter((comicId) => comicId && comicIds.has(comicId)).length;
      byId.set(event.id, { total: ids.length, available });
    }
    return byId;
  }, [events, itemsByEvent, comicIds]);

  // Contenido central: spinner / vacío / cuadrícula. El botón admin se muestra
  // SIEMPRE arriba (lo contrario impedía crear la primera guía).
  let content: React.ReactNode;
  if (loading) {
    content = (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-mute">Cargando guías de lectura...</p>
      </div>
    );
  } else if (events.length === 0) {
    content = (
      <div className="py-20 text-center rounded-3xl bg-surface/40 border border-line/60 p-8 space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-raised text-mute">
          <ListOrdered className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-ink">Aún no hay guías de lectura</h3>
        <p className="text-xs text-mute max-w-md mx-auto">
          {isAdmin
            ? 'Usa el botón "Crear Guía de Lectura" para publicar la primera saga o crossover.'
            : 'Cuando se publique la primera saga o crossover, la encontrarás aquí con su orden de lectura paso a paso.'}
        </p>
      </div>
    );
  } else {
    content = (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {events.map((event) => {
        const { total, available } = availability.get(event.id) ?? { total: 0, available: 0 };
        const pct = total > 0 ? Math.round((available / total) * 100) : 0;

        return (
          <article
            key={event.id}
            onClick={() => onSelectEvent(event)}
            role="button"
            tabIndex={0}
            aria-label={`Abrir guía de lectura: ${event.title}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectEvent(event);
              }
            }}
            className="group relative flex flex-col bg-surface border border-line rounded-xl overflow-hidden hover:border-accent/40 hover:shadow-lg smooth-transition cursor-pointer hover:-translate-y-1"
          >
            {/* Portada ancha del evento (aspect-video) */}
            <div className="relative aspect-video w-full overflow-hidden bg-bg">
              {event.cover_url ? (
                <img
                  src={event.cover_url}
                  alt={event.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-bg via-surface to-accent/30">
                  <ListOrdered className="w-12 h-12 text-faint" />
                </div>
              )}

              {/* Gradiente oscuro sobre la portada */}
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

              {/* Badges de editorial y estado de la saga */}
              <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                {event.publisher && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-bg/90 backdrop-blur-md text-amber-400 border border-amber-500/30 shadow-sm">
                    {event.publisher}
                  </span>
                )}
              </div>

              <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5">
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-md backdrop-blur-md shadow-sm border ${
                    event.is_complete
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      : 'bg-surface/80 text-mute border-line'
                  }`}
                >
                  {event.is_complete ? 'Saga completa' : 'En curso'}
                </span>
              </div>

              {/* Contador de números del evento */}
              <div className="absolute bottom-2.5 right-2.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md bg-bg/90 text-ink backdrop-blur-md border border-line">
                  <Layers className="w-3.5 h-3.5 text-accent" />
                  {total} {total === 1 ? 'número' : 'números'}
                </span>
              </div>

              {event.year && (
                <div className="absolute bottom-2.5 left-2.5">
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-bg/90 text-mute backdrop-blur-md border border-line">
                    <Calendar className="w-3 h-3 text-mute" />
                    {event.year}
                  </span>
                </div>
              )}
            </div>

            {/* Información del evento */}
            <div className="p-4 flex flex-col flex-1 gap-3">
              <div className="flex-1">
                <h3 className="font-bold text-ink text-base leading-snug line-clamp-2 group-hover:text-accent smooth-transition">
                  {event.title}
                </h3>
                {event.description && (
                  <p className="text-xs text-mute line-clamp-2 mt-1">
                    {event.description}
                  </p>
                )}
              </div>

              {/* Barra de progreso "X de Y disponibles" */}
              <div className="space-y-1.5 border-t border-line/80 pt-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-mute font-semibold">
                    {available} de {total} disponibles
                  </span>
                  <span className="text-faint font-mono">{pct}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-raised overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      pct >= 100
                        ? 'bg-emerald-500'
                        : 'bg-gradient-to-r from-accent to-accent2'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          </article>
        );
      })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra admin: crear / administrar guías (siempre visible para admins) */}
      {isAdmin && (
        <div className="flex justify-end">
          <button
            onClick={() => setIsAdminModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-accent hover:bg-accent2 text-onaccent border border-accent/30 transition-all shadow-md shadow-accent/20 active:scale-95"
          >
            {events.length === 0 ? (
              <>
                <Plus className="w-4 h-4" />
                <span>Crear Guía de Lectura</span>
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4" />
                <span>Administrar Guías</span>
              </>
            )}
          </button>
        </div>
      )}

      {content}

      {/* Modal admin de guías (recarga la lista al guardar/borrar) */}
      <EventsAdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSaved={reload}
      />
    </div>
  );
};
