import React from 'react';
import { Filter, TrendingUp, Flame, Award, Download, Star } from 'lucide-react';
import type { ComicTag } from '../types/comic';
import { CATEGORY_FILTERS } from '../lib/constants';

interface CategoryBarProps {
  selectedCategory: ComicTag | 'All';
  onCategoryChange: (cat: ComicTag | 'All') => void;
  totalResults: number;
}

const getTagIcon = (tag: ComicTag | 'All') => {
  switch (tag) {
    case 'Popular': return <Star className="w-3.5 h-3.5" />;
    case 'Novedad': return <Flame className="w-3.5 h-3.5" />;
    case 'Éxitos': return <Award className="w-3.5 h-3.5" />;
    case 'Más Descargados': return <Download className="w-3.5 h-3.5" />;
    case 'Trending': return <TrendingUp className="w-3.5 h-3.5" />;
    default: return null;
  }
};

export const CategoryBar: React.FC<CategoryBarProps> = ({
  selectedCategory,
  onCategoryChange,
  totalResults
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-line pb-4">
      {/* Filtros por Etiquetas */}
    <div className="flex flex-wrap items-center gap-1.5 pb-1 sm:pb-0 w-full sm:w-auto">
        <div className="flex items-center gap-1.5 text-xs text-mute mr-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-accent" />
          <span className="font-semibold">Etiquetas:</span>
        </div>
        {CATEGORY_FILTERS.map((tag) => {
          const isActive = selectedCategory === tag;
          const label = tag === 'All' ? 'Todos' : tag;
          const icon = getTagIcon(tag);
          return (
            <button
              key={tag}
              onClick={() => onCategoryChange(tag)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap smooth-transition border ${
                isActive
                  ? 'bg-accent text-onaccent border-accent/30 shadow-md shadow-accent/20'
                  : 'bg-surface/90 hover:bg-raised text-mute hover:text-ink border-line'
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Contador de Cómics */}
      <div className="text-xs text-mute self-end sm:self-auto">
        Total: <strong className="text-ink">{totalResults}</strong> {totalResults === 1 ? 'cómic' : 'cómics'}
      </div>
    </div>
  );
};
