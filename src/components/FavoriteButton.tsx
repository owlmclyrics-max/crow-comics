import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';

// Evento global que App escucha para abrir el AuthModal
export const OPEN_AUTH_EVENT = 'crow:open-auth';

interface FavoriteButtonProps {
  comicId: string;
  /** 'sm' para tarjetas, 'lg' para el hero de detalle. */
  size?: 'sm' | 'lg';
  className?: string;
}

/**
 * Corazón de favoritos con actualización optimista:
 * - Sin sesión → emite OPEN_AUTH_EVENT (App abre el AuthModal).
 * - Con sesión → alterna el favorito al instante (color inmediato) y
 *   confirma contra la tabla `favorites` de Supabase en segundo plano.
 */
export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  comicId,
  size = 'sm',
  className = '',
}) => {
  const { user } = useAuth();
  const { favorites, toggleFavorite } = useFavorites();
  const isFavorite = favorites.has(comicId);
  // Cada toggle incrementa `pop` y el key fuerza re-animación del corazón
  const [pop, setPop] = useState(0);

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();

    if (!user) {
      window.dispatchEvent(new CustomEvent(OPEN_AUTH_EVENT));
      return;
    }

    setPop((prev) => prev + 1);
    toggleFavorite(comicId);
  };

  const isLarge = size === 'lg';

  return (
    <button
      type="button"
      onClick={handleClick}
      title={user ? (isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos') : 'Inicia sesión para guardar este cómic'}
      aria-pressed={isFavorite}
      className={`inline-flex items-center justify-center rounded-full backdrop-blur-md transition-all border active:scale-90 ${
        isLarge ? 'w-11 h-11' : 'w-7 h-7'
      } ${
        isFavorite
          ? 'bg-accent/15 border-accent/60 shadow-md shadow-accent/40'
          : 'bg-bg/70 border-line hover:border-accent/50'
      } ${className}`}
    >
      <Heart
        key={pop}
        className={`${
          isFavorite ? 'fill-accent text-accent heart-pop' : 'text-mute group-hover:text-accent'
        } transition-colors ${isLarge ? 'w-5.5 h-5.5' : 'w-3.5 h-3.5'}`}
      />
    </button>
  );
};
