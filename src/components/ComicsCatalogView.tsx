import React, { useState } from 'react';
import type { Comic, ComicPublisher, ReadingEvent } from '../types/comic';
import { PUBLISHER_FILTERS } from '../lib/constants';
import { ComicCard } from './ComicCard';
import { EventsListPage } from './EventsListPage';
import { BookOpen, Sparkles, LayoutGrid, ListOrdered } from 'lucide-react';

// Pestañas de la vista catálogo: Volúmenes (cómics) y Guías de Lectura (eventos)
type CatalogTab = 'volumenes' | 'guias';

interface ComicsCatalogViewProps {
  comics: Comic[];
  onSelectComic: (comic: Comic) => void;
  onSelectEvent?: (event: ReadingEvent) => void;
}

export const ComicsCatalogView: React.FC<ComicsCatalogViewProps> = ({
  comics,
  onSelectComic,
  onSelectEvent
}) => {
  const [selectedPublisher, setSelectedPublisher] = useState<ComicPublisher | 'Todas'>('Todas');
  const [activeTab, setActiveTab] = useState<CatalogTab>('volumenes');

  // Filtrado por editorial
  const filteredComics = comics.filter((comic) => {
    return selectedPublisher === 'Todas' || comic.publisher === selectedPublisher;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Sistema de Pestañas [ Volúmenes | Guías de Lectura ] */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 w-fit max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab('volumenes')}
          className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'volumenes'
              ? 'bg-red-500 text-zinc-950 shadow-lg shadow-red-950/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Volúmenes
        </button>
        <button
          onClick={() => setActiveTab('guias')}
          className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'guias'
              ? 'bg-red-500 text-zinc-950 shadow-lg shadow-red-950/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          Guías de Lectura
        </button>
      </div>

      {activeTab === 'guias' ? (
        /* ======================================================== */
        /* PESTAÑA: GUÍAS DE LECTURA (EVENTOS / CROSSOVERS)          */
        /* ======================================================== */
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Crossovers y Sagas
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Guías de <span className="text-red-400">Lectura</span>
            </h2>
            <p className="text-sm text-zinc-400 max-w-2xl">
              El orden correcto para leer sagas que cruzan varias series. Cada guía marca qué cómics ya están disponibles y cuáles esperan maquetación.
            </p>
          </div>

          <EventsListPage comics={comics} onSelectEvent={onSelectEvent ?? (() => {})} />
        </div>
      ) : (
        /* ======================================================== */
        /* PESTAÑA: VOLÚMENES (CATÁLOGO POR EDITORIAL)               */
        /* ======================================================== */
        <>

      {/* Cabecera de la Sección Cómics */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Archivo General de Maquetaciones
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Explorar por <span className="text-red-400">Editorial</span> & Sello
        </h2>
        <p className="text-sm text-zinc-400 max-w-2xl">
          Selecciona tu editorial favorita para filtrar los cómics disponibles o explora los proyectos de editoriales independientes y de culto.
        </p>
      </div>

      {/* Selector de Editoriales con Pills Grandes */}
      <div className="space-y-3 p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800">
        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
          Editorial / Sello Editorial:
        </span>
        <div className="flex flex-wrap gap-2">
          {PUBLISHER_FILTERS.map((pub) => {
            const isSelected = selectedPublisher === pub;
            const count = pub === 'Todas' 
              ? comics.length 
              : comics.filter(c => c.publisher === pub).length;

            return (
              <button
                key={pub}
                onClick={() => setSelectedPublisher(pub)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/25 scale-105'
                    : 'bg-zinc-950/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800'
                }`}
              >
                <span>{pub}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                    isSelected ? 'bg-zinc-950/30 text-zinc-950 font-black' : 'bg-zinc-900 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Resultados y Cuadrícula */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
          <span>
            Mostrando <strong className="text-zinc-200">{filteredComics.length}</strong> cómics
            {selectedPublisher !== 'Todas' && (
              <> de <strong className="text-amber-400">{selectedPublisher}</strong></>
            )}
          </span>
          {selectedPublisher !== 'Todas' && (
            <button
              onClick={() => {
                setSelectedPublisher('Todas');
              }}
              className="text-xs text-red-400 hover:underline font-semibold"
            >
              Restablecer filtros
            </button>
          )}
        </div>

        {filteredComics.length === 0 ? (
          <div className="py-20 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800/60 p-8 space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800 text-zinc-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">
              No hay cómics de {selectedPublisher} en esta categoría
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Puedes agregar nuevos títulos de {selectedPublisher} o probar con otra editorial.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {filteredComics.map((comic) => (
              <ComicCard
                key={comic.id}
                comic={comic}
                onClick={onSelectComic}
              />
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
};
