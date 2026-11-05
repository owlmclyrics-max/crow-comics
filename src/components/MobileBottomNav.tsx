import React, { useEffect, useState } from 'react';
import { Home, BookOpen, User, Menu, Smartphone, Sun, Moon, Map as MapIcon, History, Plus, X } from 'lucide-react';
import type { CurrentView } from './Navbar';
import { UserAvatar } from './ui/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { showToast } from './ui/Toast';

interface MobileBottomNavProps {
  currentView: CurrentView;
  onNavigate: (view: CurrentView) => void;
  onOpenProfile: () => void;
  /** Abre el modal de administración para crear un cómic (solo admin). */
  onOpenNewComic?: () => void;
}

/** Evento de instalación PWA que lanza el navegador. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const TABS = [
  { view: 'inicio', label: 'Inicio', icon: Home },
  { view: 'comics', label: 'Cómics', icon: BookOpen },
  { view: 'personajes', label: 'Personajes', icon: User },
] as const;

const isIosDevice = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && 'ontouchend' in document);

/**
 * Barra inferior estilo app nativa (hasta lg). Navegar con el pulgar:
 * Inicio / Cómics / Personajes, la pestaña de perfil con TU foto elegida
 * y "Más": hoja de opciones (instalar la PWA, tema, roadmap, historial…).
 */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenProfile,
  onOpenNewComic,
}) => {
  const { canManageContent } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  // Captura el evento de instalación del navegador (Chrome/Edge lo emiten
  // cuando la PWA cumple los requisitos). En iOS nunca llega: ahí se instala
  // con Compartir → "Añadir a pantalla de inicio".
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstallEvent(null);
      showToast('¡Crow Comics instalada! 🎉 búscala en tu inicio', 'success');
    });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (installEvent) {
      await installEvent.prompt();
      setInstallEvent(null);
      setIsSheetOpen(false);
      return;
    }
    if (isIosDevice()) {
      showToast('En iPhone: Compartir (□↑) → "Añadir a pantalla de inicio"', 'info');
    } else {
      showToast('Ya tienes la app instalada (o tu navegador no lo permite)', 'info');
    }
  };

  const openSheet = () => setIsSheetOpen(true);

  const go = (view: CurrentView) => {
    setIsSheetOpen(false);
    onNavigate(view);
  };

  const isPerfilActive =
    currentView === 'profile' || currentView === 'historial' || currentView === 'public-profile';

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden border-t border-line bg-bg/90 backdrop-blur-xl"
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
            aria-current={isPerfilActive}
            className={`relative flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold transition-colors ${
              isPerfilActive ? 'text-accent' : 'text-mute'
            }`}
          >
            {isPerfilActive && (
              <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-accent" aria-hidden="true" />
            )}
            <UserAvatar
              sizeClassName="w-5 h-5"
              ringClassName={isPerfilActive ? 'ring-2 ring-accent' : 'ring-1 ring-line'}
            />
            Perfil
          </button>

          {/* Más: hoja de opciones (instalar app, tema, roadmap…) */}
          <button
            type="button"
            onClick={openSheet}
            className="relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-bold text-mute transition-colors"
          >
            <Menu className="w-5 h-5" />
            Más
          </button>
        </div>
      </nav>

      {/* ── Hoja de opciones "Más" ── */}
      {isSheetOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-label="Más opciones">
          {/* Fondo: tocar afuera cierra */}
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setIsSheetOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div
            className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line bg-surface shadow-2xl animate-fade-in"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <p className="text-xs font-black uppercase tracking-widest text-faint">Más opciones</p>
              <button
                type="button"
                onClick={() => setIsSheetOpen(false)}
                className="p-1.5 rounded-lg text-mute hover:text-ink hover:bg-raised transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-3 pb-1 space-y-0.5">
              {/* Instalar la PWA: la joya de la corona 📲 */}
              <button
                type="button"
                onClick={() => void handleInstall()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-accent hover:bg-accent/10 transition-colors"
              >
                <Smartphone className="w-5 h-5" />
                Instalar la app
                {installEvent && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[9px] font-black uppercase tracking-wider border border-accent/30">
                    Disponible
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                  setIsSheetOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-mute hover:bg-raised hover:text-ink transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                Tema {theme === 'dark' ? 'claro' : 'oscuro'}
              </button>

              <button
                type="button"
                onClick={() => go('roadmap')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-mute hover:bg-raised hover:text-ink transition-colors"
              >
                <MapIcon className="w-5 h-5" />
                Roadmap
              </button>

              <button
                type="button"
                onClick={() => go('historial')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-mute hover:bg-raised hover:text-ink transition-colors"
              >
                <History className="w-5 h-5" />
                Historial de lectura
              </button>

              {canManageContent && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSheetOpen(false);
                    onOpenNewComic?.();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-accent hover:bg-accent/10 transition-colors"
                >
                  <Plus className="w-5 h-5 stroke-[3]" />
                  Nuevo Cómic
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
