import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Layers,
  Lock,
  BookOpen,
  Star,
  MapPin,
  ListOrdered
} from 'lucide-react';
import type { Comic, ReadingEvent, ReadingEventItem } from '../types/comic';
import { getEventItemLabel, getEventItems } from '../lib/events';

interface EventDetailPageProps {
  event: ReadingEvent;
  comics: Comic[];
  onBack: () => void;
  onSelectComic: (comic: Comic) => void;
}

/**
 * Guía de lectura paso a paso (Sprint 5): orden de lectura de un
 * evento/crossover con crossovers entre series. Cada ítem une event_items
 * con la tabla comics vía comic_id; los números aún no maquetados se
 * muestran con candado y "Próximamente".
 */
export const EventDetailPage: React.FC<EventDetailPageProps> = ({
  event,
  comics,
  onBack,
  onSelectComic
}) => {
  const comicById = useMemo(() => new Map(comics.map((comic) => [comic.id, comic])), [comics]);

  const [items, setItems] = useState<ReadingEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Interruptor: ocultar los números marcados como opcionales
  const [showEssentialsOnly, setShowEssentialsOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setShowEssentialsOnly(false);

    getEventItems(event.id).then((loaded) => {
      if (!cancelled) {
        setItems(loaded);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [event.id]);

  const visibleItems = showEssentialsOnly
    ? items.filter((item) => !item.is_optional)
    : items;

  const availableCount = items.filter((item) => item.comic_id && comicById.has(item.comic_id)).length;

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Botón de Regresar */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors text-xs font-semibold group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-tranzinc-x-1 transition-transform text-red-400" />
          <span>Volver a las Guías</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* HEADER CON PORTADA, TÍTULO Y DESCRIPCIÓN                  */}
      {/* ======================================================== */}
      <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl">
        {/* Fondo con desenfoque de la portada */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {event.cover_url ? (
            <img
              src={event.cover_url}
              alt={event.title}
              className="w-full h-full object-cover blur-3xl scale-125 opacity-30"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
        </div>

        <div className="relative p-6 sm:p-10 flex flex-col md:flex-row items-center md:items-end gap-8 z-10">
          {/* Portada panoramica del evento */}
          <div className="relative w-full max-w-md md:w-96 aspect-video rounded-2xl overflow-hidden border-2 border-zinc-700/80 shadow-2xl bg-zinc-950 shrink-0">
            {event.cover_url ? (
              <img src={event.cover_url} alt={event.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-red-950/30">
                <ListOrdered className="w-14 h-14 text-zinc-700" />
              </div>
            )}
          </div>

          {/* Título + descripción + ficha */}
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              {event.publisher && (
                <span className="px-3.5 py-1 text-xs font-bold uppercase rounded-lg bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20">
                  {event.publisher}
                </span>
              )}
              <span
                className={`px-3 py-1 text-xs font-semibold uppercase rounded-lg border ${
                  event.is_complete
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}
              >
                {event.is_complete ? 'Saga completa' : 'En curso'}
              </span>
              {event.year && (
                <span className="px-3 py-1 text-xs text-zinc-300 bg-zinc-950/80 rounded-lg border border-zinc-800">
                  Año {event.year}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
              {event.title}
            </h1>

            {event.description && (
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-2xl bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/80">
                {event.description}
              </p>
            )}

            {/* Ficha rápida */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-xs text-zinc-300 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-red-400" />
                <span><strong className="text-zinc-400">Números:</strong> {items.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-red-400" />
                <span><strong className="text-zinc-400">Esenciales:</strong> {items.filter((item) => !item.is_optional).length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-red-400" />
                <span><strong className="text-zinc-400">Disponibles:</strong> <span className="text-red-400 font-bold">{availableCount}</span>/{items.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ORDEN DE LECTURA PASO A PASO                              */}
      {/* ======================================================== */}
      <div className="space-y-5">
        {/* Cabecera + interruptor "Mostrar solo esenciales" */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <h3 className="text-2xl font-black text-white flex items-center gap-2.5">
            <MapPin className="w-6 h-6 text-red-400" />
            <span>Orden de Lectura</span>
          </h3>

          {/* Interruptor estilo switch */}
          <button
            type="button"
            onClick={() => setShowEssentialsOnly((prev) => !prev)}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-red-500/40 transition-colors shrink-0"
            aria-pressed={showEssentialsOnly}
          >
            <span className="text-xs font-bold text-zinc-300">Mostrar solo esenciales</span>
            <span
              className={`relative w-9 h-5 rounded-full transition-colors ${
                showEssentialsOnly ? 'bg-red-500' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  showEssentialsOnly ? 'tranzinc-x-4' : ''
                }`}
              />
            </span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-8 justify-center">
            <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-zinc-400">Cargando orden de lectura...</p>
          </div>
        ) : visibleItems.length === 0 ? (
          <div
            className="p-12 text-center rounded-3xl bg-zinc-900/40 border border-zinc-800 text-zinc-400 text-sm"
            key="empty-items"
          >
            {items.length === 0
              ? 'Este evento aún no tiene números asignados en su orden de lectura.'
              : 'Los números opcionales están ocultos. Desactiva "Mostrar solo esenciales" para ver la guía completa.'}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleItems.map((item) => {
              const comic = item.comic_id ? comicById.get(item.comic_id) : undefined;
              const isAvailable = Boolean(comic);

              return (
                <div
                  key={item.id}
                  onClick={() => comic && onSelectComic(comic)}
                  className={`relative flex flex-col sm:flex-row sm:items-center gap-4 p-3 sm:p-4 rounded-2xl bg-zinc-900/60 border transition-all animate-scale-in ${
                    isAvailable
                      ? 'border-zinc-800 hover:border-red-500/50 cursor-pointer hover:bg-zinc-900'
                      : 'border-zinc-800/60 opacity-70 cursor-default'
                  }`}
                >
                  {/* Número de orden */}
                  <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 sm:order-first">
                    <span className="text-xl font-black text-red-400 font-mono">
                      {String(item.position).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Miniatura del cómic (une event_items con comics) */}
                  <div className="relative w-14 h-20 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 shrink-0">
                    {comic ? (
                      <img
                        src={comic.cover_url}
                        alt={comic.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-zinc-950">
                        <Lock className="w-4 h-4 text-zinc-600" />
                        <Layers className="w-5 h-5 text-zinc-700" />
                      </div>
                    )}
                  </div>

                  {/* Título + badge Esencial/Opcional */}
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`font-bold text-sm leading-snug line-clamp-1 ${
                        isAvailable ? 'text-white group-hover:text-red-400' : 'text-zinc-400'
                      }`}
                    >
                      {getEventItemLabel(item, comic?.title)}
                    </h4>
                    <span
                      className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase rounded-md border ${
                        item.is_optional
                          ? 'bg-zinc-800/80 text-zinc-400 border-zinc-700'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {item.is_optional ? 'Opcional' : 'Esencial'}
                    </span>
                  </div>

                  {/* Botón Leer / estado Próximamente */}
                  {isAvailable && comic ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectComic(comic);
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-400 text-zinc-950 border border-red-500/40 transition-all shadow-md shadow-red-950/40 active:scale-95 shrink-0"
                      title={`Abrir ${comic.title}`}
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Leer</span>
                    </button>
                  ) : (
                    <div className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 text-zinc-500 border border-zinc-800 shrink-0">
                      <Lock className="w-4 h-4" />
                      <span>Próximamente</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
