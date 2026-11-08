import React, { useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFollows } from '../context/FollowsContext';
import { OPEN_AUTH_EVENT } from './FavoriteButton';

interface FollowButtonProps {
  comicId: string;
  /** 'sm' para tarjetas, 'lg' para el hero de detalle. */
  size?: 'sm' | 'lg';
  className?: string;
}

/**
 * Campanita de "Seguir cómic":
 * - Sin sesión → emite OPEN_AUTH_EVENT (App abre el AuthModal).
 * - Con sesión → alterna el follow al instante y confirma contra la tabla
 *   `comic_follows` de Supabase. Los cómics seguidos priorizan en la campana
 *   de nuevos tomos y muestran pendientes en sus tarjetas.
 */
export const FollowButton: React.FC<FollowButtonProps> = ({
  comicId,
  size = 'sm',
  className = '',
}) => {
  const { user } = useAuth();
  const { isFollowing, toggleFollow } = useFollows();
  const following = isFollowing(comicId);
  // Cada toggle incrementa `pop` y el key fuerza re-animación de la campana
  const [pop, setPop] = useState(0);

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();

    if (!user) {
      window.dispatchEvent(new CustomEvent(OPEN_AUTH_EVENT));
      return;
    }

    setPop((prev) => prev + 1);
    toggleFollow(comicId);
  };

  const isLarge = size === 'lg';
  const Icon = following ? BellRing : Bell;

  return (
    <button
      type="button"
      onClick={handleClick}
      title={
        user
          ? following
            ? 'Dejar de seguir este cómic'
            : 'Seguir: te avisamos cuando suba tomo nuevo'
          : 'Inicia sesión para seguir este cómic'
      }
      aria-pressed={following}
      className={`inline-flex items-center justify-center rounded-full backdrop-blur-md transition-all border active:scale-90 ${
        isLarge ? 'w-11 h-11' : 'w-7 h-7'
      } ${
        following
          ? 'bg-accent/15 border-accent/60 shadow-md shadow-accent/20'
          : 'bg-bg/70 border-line hover:border-accent/50'
      } ${className}`}
    >
      <Icon
        key={pop}
        className={`${
          following ? 'text-accent heart-pop' : 'text-mute group-hover:text-accent'
        } transition-colors ${isLarge ? 'w-5.5 h-5.5' : 'w-3.5 h-3.5'}`}
      />
    </button>
  );
};
