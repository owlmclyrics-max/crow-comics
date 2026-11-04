import React, { useState } from 'react';
import type { Chapter } from '../types/comic';
import { X, Layers, Grid, List, Search } from 'lucide-react';

interface ChaptersModalProps {
  isOpen: boolean;
  chapters: Chapter[];
  onClose: () => void;
  onSelectChapter: (chapter: Chapter) => void;
}

export const ChaptersModal: React.FC<ChaptersModalProps> = ({
  isOpen,
  chapters,
  onClose,
  onSelectChapter
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  // Filtro por búsqueda: número de capítulo o título
  const query = search.trim().toLowerCase();
  const filteredChapters = query
    ? chapters.filter((chapter) =>
        String(chapter.chapter_number).includes(query) ||
        chapter.title.toLowerCase().includes(query)
      )
    : chapters;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/30">
              <Layers className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-black text-ink">Capítulos</h2>
              <p className="text-xs text-mute">
                {query
                  ? `${filteredChapters.length} resultado${filteredChapters.length === 1 ? '' : 's'}`
                  : `Total: ${chapters.length} capítulos`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-raised hover:bg-line text-mute hover:text-ink transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de búsqueda + selector de modo */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-line">
          {/* Lupa con contador Cap X/XX */}
          <div className="flex items-center gap-2 flex-1 min-w-[220px] px-4 py-2.5 rounded-xl bg-bg border border-line focus-within:border-accent/60 transition-colors">
            <Search className="w-4 h-4 text-faint shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar capítulo..."
              className="flex-1 min-w-0 bg-transparent text-sm text-ink placeholder:text-faint outline-none"
            />
            <span className="shrink-0 px-2.5 py-1 text-[11px] font-black uppercase rounded-lg bg-surface text-accent border border-accent/30 whitespace-nowrap">
              Cap {filteredChapters.length}/{chapters.length}
            </span>
          </div>

          {/* Selector fila / cuadrícula */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              title="Modo cuadrícula"
              className={`p-2.5 rounded-xl transition-all border ${
                viewMode === 'grid'
                  ? 'bg-accent text-onaccent border-accent/30 shadow-md shadow-accent/40'
                  : 'bg-raised text-mute hover:text-ink border border-line hover:bg-line'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Modo lista"
              className={`p-2.5 rounded-xl transition-all border ${
                viewMode === 'list'
                  ? 'bg-accent text-onaccent border-accent/30 shadow-md shadow-accent/40'
                  : 'bg-raised text-mute hover:text-ink border border-line hover:bg-line'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {filteredChapters.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface/60 border border-line">
              <p className="text-sm text-mute">
                No se encontraron capítulos para <span className="text-accent font-bold">"{search}"</span>
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* Modo Cuadrícula */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredChapters.map((chapter) => (
                <div
                  key={chapter.id}
                  onClick={() => onSelectChapter(chapter)}
                  className="group relative aspect-[2/3] rounded-xl overflow-hidden border border-line hover:border-accent/60 cursor-pointer transition-all hover:scale-105 smooth-transition bg-bg"
                >
                  {chapter.cover_url ? (
                    <img
                      src={chapter.cover_url}
                      alt={chapter.title}
                      className="w-full h-full object-contain bg-bg"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-bg">
                      <Layers className="w-8 h-8 text-faint" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent opacity-90" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-ink font-black text-xs line-clamp-1 group-hover:text-accent transition-colors">
                      #{chapter.chapter_number}
                    </p>
                    <p className="text-mute text-[10px] line-clamp-1">{chapter.title}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Modo Lista */
            <div className="space-y-2">
              {filteredChapters.map((chapter) => (
                <div
                  key={chapter.id}
                  onClick={() => onSelectChapter(chapter)}
                  className="flex items-center gap-4 p-3 rounded-xl border border-line hover:border-accent/50 cursor-pointer transition-all hover:bg-raised/60 bg-bg/40"
                >
                  <div className="relative w-16 h-24 rounded-lg overflow-hidden shrink-0 bg-bg border border-line">
                    {chapter.cover_url ? (
                      <img
                        src={chapter.cover_url}
                        alt={chapter.title}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Layers className="w-6 h-6 text-faint" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-ink font-bold text-sm">
                      Capítulo #{chapter.chapter_number}
                    </p>
                    <p className="text-mute text-xs line-clamp-1">{chapter.title}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-line">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-raised hover:bg-line text-mute text-xs font-semibold transition-colors"
          >
            <span>Cerrar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
