import React from 'react';
import type { Comic } from '../types/comic';
import { BookOpen, User, Feather } from 'lucide-react';
import { FavoriteButton } from './FavoriteButton';
import { FollowButton } from './FollowButton';
import { useFollows } from '../context/FollowsContext';
import { newChaptersOf } from '../lib/follows';

interface ComicCardProps {
  comic: Comic;
  onClick: (comic: Comic) => void;
}

export const ComicCard: React.FC<ComicCardProps> = ({ comic, onClick }) => {
  const chapterCount = comic.chapters?.length || 0;
  const { follows } = useFollows();
  // Pendiente: capítulos subidos después de la última visita (solo seguidos).
  const pending = newChaptersOf(comic, follows.get(comic.id)).length;

  return (
    <article
      onClick={() => onClick(comic)}
      role="button"
      tabIndex={0}
      aria-label={`Abrir ${comic.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(comic);
        }
      }}
      className="group relative flex flex-col bg-surface border border-line rounded-xl overflow-hidden hover:border-accent/40 hover:shadow-lg smooth-transition cursor-pointer hover:-translate-y-1 focus-visible:-translate-y-1"
    >
      {/* Portada con proporción fija aspect-[2/3] object-cover */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-bg">
        <img
          src={comic.cover_url}
          alt={comic.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy"
          onError={(e) => {
            // Imagen fallback si falla
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800';
          }}
        />

        {/* Gradiente corto SOLO en la base: da legibilidad al contador sin
            ensuciar el arte de la portada (antes la cubría entera). */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Badge de Editorial (única insignia arriba a la izquierda) */}
        <div className="absolute top-2.5 left-2.5">
          {comic.publisher && (
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-bg/90 backdrop-blur-md text-amber-400 border border-amber-500/30">
              {comic.publisher}
            </span>
          )}
        </div>

        {/* Pendientes + Campanita + Corazón (esquina sup. derecha) */}
        <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5">
          {pending > 0 && (
            <span
              className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-emerald-500/90 text-white border border-emerald-300/40"
              title="Capítulos nuevos desde tu última visita"
            >
              {pending} nuevo{pending === 1 ? '' : 's'}
            </span>
          )}
          <FavoriteButton comicId={comic.id} />
          <FollowButton comicId={comic.id} />
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
          <h3 className="font-bold text-ink text-base leading-snug line-clamp-2 group-hover:text-accent2 smooth-transition">
            {comic.title}
          </h3>
          {comic.original_title && (
            <p className="text-xs text-mute italic line-clamp-1 mt-0.5">
              {comic.original_title}
            </p>
          )}
        </div>

        <div className="space-y-1.5 text-xs text-mute border-t border-line/80 pt-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Feather className="w-3.5 h-3.5 text-mute shrink-0" />
            <span className="truncate">
              <strong className="text-mute">Guion:</strong> {comic.writer}
            </span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <User className="w-3.5 h-3.5 text-accent shrink-0" />
            <span className="truncate">
              <strong className="text-mute">Maqueta:</strong> {comic.translator_typesetter}
            </span>
          </div>

          {/* Estado de la serie: punto de color + texto (antes era otro
              badge flotando sobre la portada) */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                comic.status === 'En curso' ? 'bg-accent' : 'bg-faint'
              }`}
              aria-hidden="true"
            />
            <span className="truncate">{comic.status}</span>
          </div>
        </div>
      </div>
    </article>
  );
};
