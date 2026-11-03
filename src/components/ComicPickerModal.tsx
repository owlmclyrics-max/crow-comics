import React, { useState } from 'react';
import { X, Search, BookOpen, Lock, ImageOff } from 'lucide-react';
import type { Comic } from '../types/comic';

interface ComicPickerModalProps {
  isOpen: boolean;
  comics: Comic[];
  onClose: () => void;
  /** comic_id elegido, o null si se elige "Sin cómic (Próximamente)". */
  onSelect: (comicId: string | null) => void;
  /** Titular dinámico del modal según lo que se esté haciendo. */
  title?: string;
}

/**
 * Selector visual de cómics para los pasos de una Guía de Lectura (Sprint 5):
 * cuadrícula de portadas con búsqueda — mismo estilo que el modal de
 * capítulos. Permite elegir un cómic del catálogo o marcar el paso como
 * "Próximamente" (sin cómic aún).
 */
export const ComicPickerModal: React.FC<ComicPickerModalProps> = ({
  isOpen,
  comics,
  onClose,
  onSelect,
  title = 'Seleccionar Cómic'
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const query = search.trim().toLowerCase();
  const filtered = query
    ? comics.filter((comic) => comic.title.toLowerCase().includes(query))
    : comics;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center border border-red-500/30">
              <BookOpen className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{title}</h2>
              <p className="text-xs text-zinc-400">
                {query
                  ? `${filtered.length} resultado${filtered.length === 1 ? '' : 's'}`
                  : `Catálogo: ${comics.length} cómics`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Búsqueda + opción "Próximamente" */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 flex-1 min-w-[220px] px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus-within:border-red-500/60 transition-colors">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cómic por título..."
              className="flex-1 min-w-0 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none"
            />
            <span className="shrink-0 px-2.5 py-1 text-[11px] font-black uppercase rounded-lg bg-zinc-900 text-red-400 border border-red-500/30 whitespace-nowrap">
              {filtered.length}/{comics.length}
            </span>
          </div>

          {/* Paso sin cómic aún: aparece como "Próximamente" */}
          <button
            onClick={() => { onSelect(null); onClose(); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all active:scale-95 shrink-0"
          >
            <Lock className="w-4 h-4 text-zinc-400" />
            <span>Sin cómic (Próximamente)</span>
          </button>
        </div>

        {/* Contenido: cuadrícula de portadas */}
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <ImageOff className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">
                No hay cómics que coincidan con <span className="text-red-400 font-bold">"{search}"</span>
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Puedes agregar el paso igual con "Sin cómic (Próximamente)".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map((comic) => (
                <button
                  key={comic.id}
                  onClick={() => { onSelect(comic.id); onClose(); }}
                  className="group relative aspect-[2/3] rounded-xl overflow-hidden border border-zinc-800 hover:border-red-500/60 cursor-pointer transition-all hover:scale-105 smooth-transition bg-zinc-950 text-left"
                >
                  <img
                    src={comic.cover_url}
                    alt={comic.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-90" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-xs line-clamp-2 group-hover:text-red-400 transition-colors">
                      {comic.title}
                    </p>
                    <p className="text-zinc-400 text-[10px] line-clamp-1">{comic.publisher}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-5 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
          >
            <span>Cancelar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
