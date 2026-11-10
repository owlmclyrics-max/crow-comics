import React from 'react';
import { Search, Command } from 'lucide-react';

interface TopSearchBarProps {
  onOpen: () => void;
  /** Texto opcional para contextualizar la pantalla. */
  hint?: string;
}

/**
 * Barra de búsqueda superior en estilo glass, pegada al borde de arriba.
 * Es solo el disparador: al tocarla se abre la paleta centrada (SearchOverlay).
 */
export const TopSearchBar: React.FC<TopSearchBarProps> = ({ onOpen, hint }) => {
  return (
    <div className="sticky top-16 lg:top-0 z-40 w-full border-b border-line/70 bg-bg/70 backdrop-blur-xl lg:ml-[4.5rem] lg:w-auto">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-3 py-2 sm:px-6 lg:max-w-none lg:px-8">
        <button
          type="button"
          onClick={onOpen}
          aria-label="Abrir buscador"
          className="group mx-auto flex w-full max-w-3xl items-center gap-3 rounded-2xl border border-white/15 bg-surface/70 px-4 py-2 sm:py-2.5 text-left shadow-lg shadow-black/20 backdrop-blur-xl transition-all hover:border-accent/40 hover:bg-surface/85"
        >
          <Search className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-accent" />
          <span className="min-w-0 flex-1 truncate text-xs sm:text-sm font-semibold text-mute group-hover:text-ink transition-colors">
            {hint || 'Buscar cómics, personajes o perfiles…'}
          </span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-line bg-bg/70 px-1.5 py-0.5 text-[10px] font-mono text-mute">
            <Command className="h-2.5 w-2.5" /> K
          </kbd>
        </button>
      </div>
    </div>
  );
};
