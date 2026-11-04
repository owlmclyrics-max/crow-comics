import React from 'react';
import { Home, BookOpen, User, Menu } from 'lucide-react';
import type { CurrentView } from './Navbar';
import { UserAvatar } from './ui/UserAvatar';

interface MobileBottomNavProps {
  currentView: CurrentView;
  onNavigate: (view: CurrentView) => void;
  onOpenProfile: () => void;
  onOpenMenu: () => void;
}

const TABS = [
  { view: 'inicio', label: 'Inicio', icon: Home },
  { view: 'comics', label: 'Cómics', icon: BookOpen },
  { view: 'personajes', label: 'Personajes', icon: User },
] as const;

/**
 * Barra inferior estilo app nativa (solo móvil). Navegar con el pulgar:
 * Inicio / Cómics / Personajes, la pestaña de perfil con TU foto elegida
 * y un botón que abre el menú completo del navbar.
 */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenProfile,
  onOpenMenu,
}) => {
  const isPerfActive =
    currentView === 'profile' || currentView === 'historial' || currentView === 'public-profile';

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 md:hidden border-t border-line bg-bg/90 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegación móvil"
    >
      <div className="grid grid-cols-5 items-stretch">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.view === 'personajes'
              ? currentView === 'personajes' || currentView === 'character-detail'
              : currentView === tab.view;
          return (
            <button
              key={tab.view}
              type="button"
              onClick={() => onNavigate(tab.view)}
              aria-current={isActive}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-bold transition-colors ${
                isActive ? 'text-accent' : 'text-mute'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-accent" aria-hidden="true" />
              )}
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.6 : 2} />
              {tab.label}
            </button>
          );
        })}

        {/* Perfil: con la foto elegida, no iniciales */}
        <button
          type="button"
          onClick={onOpenProfile}
          aria-current={isPerfActive}
          className={`relative flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold transition-colors ${
            isPerfActive ? 'text-accent' : 'text-mute'
          }`}
        >
          {isPerfActive && (
            <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-accent" aria-hidden="true" />
          )}
          <UserAvatar
            sizeClassName={isPerfActive ? 'w-5 h-5' : 'w-5 h-5'}
            ringClassName={isPerfActive ? 'ring-2 ring-accent' : 'ring-1 ring-line'}
          />
          Perfil
        </button>

        {/* Menú completo (tema, acento, búsqueda...) */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-bold text-mute transition-colors"
        >
          <Menu className="w-5 h-5" />
          Más
        </button>
      </div>
    </nav>
  );
};
