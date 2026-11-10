import React, { useEffect, useState } from 'react';
import { Home, BookOpen, User, Menu, Smartphone, Sun, Moon, Palette, Library, Send, Map as MapIcon, History, Plus, X, Check, Bell, BellRing } from 'lucide-react';
import type { CurrentView } from './Navbar';
import { UserAvatar } from './ui/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AccentDialog } from './ui/AccentPicker';
import { showToast } from './ui/Toast';
import {
  getInstallPrompt,
  isRunningStandalone,
  APP_INSTALLED_EVENT,
  INSTALL_PROMPT_EVENT,
  type BeforeInstallPromptEvent,
} from '../lib/installPrompt';
import {
  disablePush,
  enablePush,
  getPushState,
  type PushState,
} from '../lib/pushNotifications';

interface MobileBottomNavProps {
  currentView: CurrentView;
  onNavigate: (view: CurrentView) => void;
  onOpenProfile: () => void;
  /** Abre el modal de administración para crear un cómic (solo admin). */
  onOpenNewComic?: () => void;
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
  const { canManageContent, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isAccentOpen, setIsAccentOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  // Notificaciones push de tomos nuevos (v0.5): estado del permiso/suscripción.
  const [pushState, setPushState] = useState<PushState>('default');
  const [pushBusy, setPushBusy] = useState(false);
  // El evento llega vía captura GLOBAL (lib/installPrompt): se registra antes
  // del render, así no se pierde aunque Chrome lo dispare muy temprano.
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(
    () => getInstallPrompt(),
  );
  const [alreadyInstalled] = useState(() => isRunningStandalone());

  // Se entera de llegadas tardías del evento y de la instalación completada.
  useEffect(() => {
    const onPrompt = () => setInstallEvent(getInstallPrompt());
    const onInstalled = () => {
      setInstallEvent(null);
      showToast('¡Crow Comics instalada! 🎉 búscala en tu inicio', 'success');
    };
    window.addEventListener(INSTALL_PROMPT_EVENT, onPrompt);
    window.addEventListener(APP_INSTALLED_EVENT, onInstalled);
    return () => {
      window.removeEventListener(INSTALL_PROMPT_EVENT, onPrompt);
      window.removeEventListener(APP_INSTALLED_EVENT, onInstalled);
    };
  }, []);

  // Estado del push: se refresca cada vez que abren la hoja "Más".
  useEffect(() => {
    if (!isSheetOpen) return;
    let cancelled = false;
    getPushState().then((state) => {
      if (!cancelled) setPushState(state);
    });
    return () => {
      cancelled = true;
    };
  }, [isSheetOpen, user?.id]);

  // Activar / desactivar las notificaciones de tomos nuevos.
  const handleTogglePush = async () => {
    if (pushBusy) return;
    if (!user?.id) {
      showToast('Inicia sesión para activar las notificaciones', 'info');
      return;
    }
    setPushBusy(true);
    try {
      const state = await getPushState();
      if (state === 'denied') {
        showToast('Permiso bloqueado — actívalo en los ajustes del navegador', 'info');
        return;
      }
      if (state === 'subscribed') {
        await disablePush();
        setPushState('default');
        showToast('Notificaciones desactivadas', 'info');
      } else {
        await enablePush(user.id);
        setPushState('subscribed');
        showToast('¡Notificaciones activadas! 🔔 te avisamos cuando suba tomo', 'success');
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'No se pudieron cambiar las notificaciones',
        'error',
      );
    } finally {
      setPushBusy(false);
    }
  };

  const handleInstall = async () => {
    // 1) El navegador ya nos dijo que se puede: lanzar su diálogo nativo.
    if (installEvent) {
      await installEvent.prompt();
      setInstallEvent(null);
      setIsSheetOpen(false);
      return;
    }
    // 2) Ya corre como app (ventana propia): no hay nada que instalar.
    if (alreadyInstalled) {
      showToast('Ya estás dentro de la app ✅', 'info');
      return;
    }
    // 3) iPhone/iPad: instalación manual vía Compartir.
    if (isIosDevice()) {
      showToast('En iPhone: Compartir (□↑) → "Añadir a pantalla de inicio"', 'info');
      return;
    }
    // 4) Android sin evento aún: Chrome pide interacción/visitas previas, o
    //    ya creaste un acceso directo. La ruta manual siempre funciona.
    showToast('Menú del navegador (⋮) → "Instalar aplicación" o "Añadir a pantalla de inicio"', 'info');
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold hover:bg-accent/10 transition-colors ${
                  alreadyInstalled ? 'text-emerald-400' : 'text-accent'
                }`}
              >
                {alreadyInstalled ? <Check className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                {alreadyInstalled ? 'App instalada ✓' : 'Instalar la app'}
                {installEvent && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[9px] font-black uppercase tracking-wider border border-accent/30">
                    Disponible
                  </span>
                )}
              </button>

              {/* Notificaciones push de tomos nuevos (v0.5) */}
              <button
                type="button"
                onClick={() => void handleTogglePush()}
                disabled={pushBusy}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold hover:bg-accent/10 transition-colors ${
                  pushState === 'subscribed' ? 'text-emerald-400' : 'text-accent'
                } disabled:opacity-60`}
                title={
                  pushState === 'unsupported'
                    ? 'En iPhone funciona con la app instalada (iOS 16.4+)'
                    : undefined
                }
              >
                {pushState === 'subscribed' ? (
                  <BellRing className="w-5 h-5" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
                Avisos de tomos nuevos
                <span
                  className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                    pushState === 'subscribed'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-400/30'
                      : 'bg-accent/15 text-accent border-accent/30'
                  }`}
                >
                  {!user
                    ? 'Inicia sesión'
                    : pushState === 'subscribed'
                      ? 'Activadas ✓'
                      : pushState === 'denied'
                        ? 'Bloqueadas'
                        : pushState === 'unsupported'
                          ? 'No soportadas'
                          : 'Activar'}
                </span>
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
                onClick={() => setIsAccentOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-mute hover:bg-raised hover:text-ink transition-colors"
              >
                <Palette
                  className="w-5 h-5"
                  style={{ color: 'oklch(0.63 0.21 var(--crow-hue))' }}
                />
                Color del sitio
              </button>

              <button
                type="button"
                onClick={() => go('biblioteca')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-mute hover:bg-raised hover:text-ink transition-colors"
              >
                <Library className="w-5 h-5" />
                Mi Biblioteca
              </button>
              <button
                type="button"
                onClick={() => go('solicitudes')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-mute hover:bg-raised hover:text-ink transition-colors"
              >
                <Send className="w-5 h-5" />
                Solicitar cómics
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
      <AccentDialog isOpen={isAccentOpen} onClose={() => setIsAccentOpen(false)} />
    </>
  );
};
