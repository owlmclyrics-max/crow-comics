import React from 'react';
import { useAuth } from '../../context/AuthContext';

const readMetadata = (user: NonNullable<ReturnType<typeof useAuth>['user']>) =>
  (user.user_metadata ?? {}) as Record<string, string | undefined>;

/**
 * Fuente definitiva del avatar del usuario conectado:
 *  1. La imagen que eligió en el onboarding / editar perfil (profiles.avatar_url).
 *  2. La foto de su cuenta de Google (user_metadata). Antes nunca se usaba,
 *     por eso se veían iniciales aunque el usuario tuviese foto de perfil.
 *  3. Iniciales del username (solo si no hay ninguna imagen disponible).
 */
export const useUserAvatar = (): { src: string | null; initials: string } => {
  const { user, profile } = useAuth();
  let googlePhoto: string | null = null;
  if (user) {
    const meta = readMetadata(user);
    googlePhoto = meta.avatar_url ?? meta.picture ?? null;
  }
  const src = profile?.avatar_url?.trim() || googlePhoto || null;
  const label = profile?.username?.trim() || (user?.email ?? 'CC').split('@')[0];
  return { src, initials: label.slice(0, 2).toUpperCase() };
};

interface UserAvatarProps {
  sizeClassName?: string;
  /** Clases extra para el borde/anillo del contenedor. */
  ringClassName?: string;
}

/**
 * Avatar circular listo para usar (foto elegida → foto de Google → iniciales).
 * Pills, barras y menús lo usan para no repetir la lógica del fallback.
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  sizeClassName = 'w-8 h-8',
  ringClassName = 'ring-2 ring-accent/20',
}) => {
  const { src, initials } = useUserAvatar();
  return (
    <div
      className={`${sizeClassName} ${ringClassName} relative shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-accent to-accent2 text-onaccent flex items-center justify-center font-black`}
      aria-hidden="true"
    >
      {src ? (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <span className="text-[0.85em] relative">{initials}</span>
      )}
    </div>
  );
};
