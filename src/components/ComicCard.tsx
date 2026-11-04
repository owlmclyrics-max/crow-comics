import React from 'react';
import type { Comic } from '../types/comic';
import { BookOpen, User, Feather } from 'lucide-react';
import { FavoriteButton } from './FavoriteButton';

interface ComicCardProps {
  comic: Comic;
  onClick: (comic: Comic) => void;
}

export const ComicCard: React.FC<ComicCardProps> = ({ comic, onClick }) => {
  const chapterCount = comic.chapters?.length || 0;

  return (
    <div
      onClick={() => onClick(comic)}
      className="group relative flex flex-col bg-surface border border-line rounded-xl overflow-hidden hover:border-accent/50 hover:shadow-2xl hover:shadow-accent/40 smooth-transition cursor-pointer transform hover:-translate-y-1.5 animate-scale-in"
    >
      {/* Portada con proporción fija aspect-[2/3] object-cover */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-bg">
        <img
          src={comic.cover_url}
          alt={comic.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            // Imagen fallback si falla
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800';
          }}
        />
        
        {/* Gradiente oscuro sobre la portada */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Badges de Editorial y Etiqueta */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
          {comic.publisher && (
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-bg/90 backdrop-blur-md text-amber-400 border border-amber-500/30 shadow-sm">
              {comic.publisher}
            </span>
          )}
          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-bg/80 backdrop-blur-md text-accent border border-accent/30 shadow-sm">
            {comic.tag}
          </span>
        </div>

        {/* Badge de Estado + Corazón de favorito (esquina sup. derecha) */}
        <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5">
          <FavoriteButton comicId={comic.id} />
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-md backdrop-blur-md shadow-sm border ${
              comic.status === 'En curso'
                ? 'bg-accent/15 text-accent border-accent/40'
                : 'bg-surface/80 text-mute border-line'
            }`}
          >
            {comic.status}
          </span>
        </div>

        {/* Contador de capítulos en la esquina inferior de la imagen */}
        <div className="absolute bottom-2.5 right-2.5">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md bg-bg/90 text-ink backdrop-blur-md border border-line">
            <BookOpen className="w-3.5 h-3.5 text-accent" />
            {chapterCount} {chapterCount === 1 ? 'cap.' : 'caps.'}
          </span>
        </div>
      </div>

      {/* Información del Comic */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3 className="font-bold text-ink text-base leading-snug line-clamp-1 group-hover:text-accent2 transition-colors">
            {comic.title}
          </h3>
          {comic.original_title && (
            <p className="text-xs text-mute italic line-clamp-1 mt-0.5">
              {comic.original_title}
            </p>
          )}
        </div>

        <div className="space-y-1.5 text-xs text-mute border-t border-line/80 pt-2.5">
          <div className="flex items-center gap-1.5 truncate">
            <Feather className="w-3.5 h-3.5 text-mute shrink-0" />
            <span className="truncate">
              <strong className="text-mute">Guion:</strong> {comic.writer}
            </span>
          </div>

          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5 text-accent shrink-0" />
            <span className="truncate">
              <strong className="text-mute">Maqueta:</strong> {comic.translator_typesetter}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
