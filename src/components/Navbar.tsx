import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck,
  LogOut,
  Plus,
  Feather,
  X,
  Home,
  BookOpen,
  User,
  UserCircle,
  ChevronDown,
  Flag,
  CheckCircle,
  XCircle,
  Clock,
  History,
  Moon,
  Sun,
  Map as MapIcon,
  Palette,
} from 'lucide-react';
import type { Comic, LinkReport } from '../types/comic';
import { useAuth } from '../context/AuthContext';
import { useComics } from '../context/ComicsContext';
import { useTheme } from '../context/ThemeContext';
import { AccentDialog } from './ui/AccentPicker';
import { NewChaptersBell } from './NewChaptersBell';
import { GoogleIcon } from './ui/GoogleIcon';
import { useUserAvatar } from './ui/UserAvatar';

export type CurrentView = 'landing' | 'inicio' | 'comics' | 'personajes' | 'character-detail' | 'comic-detail' | 'chapter-detail' | 'list-detail' | 'event-detail' | 'search' | 'profile' | 'historial' | 'public-profile' | 'roadmap';

// Historial vive en el menú del avatar (y en la barra inferior móvil):
// fuera del navbar para que la barra nunca se sature.
const NAV_ITEMS = [
  { view: 'inicio', label: 'Inicio', icon: Home },
  { view: 'comics', label: 'Cómics', icon: BookOpen },
  { view: 'personajes', label: 'Personajes', icon: User },
  { view: 'roadmap', label: 'Roadmap', icon: MapIcon },
] as const;

interface NavbarProps {
  comics: Comic[];
  currentView: CurrentView;
  onNavigate: (view: CurrentView) => void;
  onSelectComic: (comic: Comic) => void;
  onOpenAuth: (tab?: 'signin' | 'signup' | 'admin') => void;
  onOpenProfile: () => void;
  onOpenNewComic: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  comics,
  currentView,
  onNavigate,
  onSelectComic,
  onOpenAuth,
  onOpenProfile,
  onOpenNewComic
}) => {
  const { user, profile, isAdmin, canManageContent, signInWithGoogle, signOut, isDemoMode, loading: authLoading } = useAuth();
  const { getLinkReports, updateLinkReportStatus } = useComics();
  const { theme, toggleTheme } = useTheme();
  const { src: avatarSrc, initials: avatarInitials } = useUserAvatar();

  // Cambio de tema con transición circular desde el botón
  const handleToggleTheme = (e: React.MouseEvent) => {
    toggleTheme({ x: e.clientX, y: e.clientY });
  };

  // Menú desplegable del usuario
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isUserMenuOpen]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    await signInWithGoogle();
    // Si falla, signInWithGoogle devuelve error; si funciona redirige a Google.
    setGoogleLoading(false);
  };

  // Notificaciones de reportes (solo admin)
  const [reports, setReports]                 = useState<LinkReport[]>([]);
  const [showReports, setShowReports]         = useState(false);
  const [loadingReports, setLoadingReports]   = useState(false);
  const reportsRef = React.useRef<HTMLDivElement>(null);

  const loadReports = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingReports(true);
    const data = await getLinkReports();
    setReports(data);
    setLoadingReports(false);
  }, [isAdmin, getLinkReports]);

  // Cargar al montar si es admin
  useEffect(() => { void loadReports(); }, [loadReports]);

  // Cerrar dropdown reportes al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (reportsRef.current && !reportsRef.current.contains(e.target as Node)) {
        setShowReports(false);
      }
    };
    if (showReports) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showReports]);

  const handleUpdateReport = async (id: string, status: LinkReport['status']) => {
    await updateLinkReportStatus(id, status);
    await loadReports();
  };

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  const [isAccentOpen, setIsAccentOpen] = useState(false);

  return (
    <header className={`group/sidebar sticky top-0 z-50 w-full bg-bg/90 backdrop-blur-xl border-b border-line lg:fixed lg:inset-y-0 lg:left-0 lg:w-[4.5rem] lg:hover:w-60 lg:transition-[width] lg:duration-300 lg:ease-out lg:border-b-0 lg:border-r lg:shadow-2xl lg:shadow-black/30 ${
      isUserMenuOpen || showReports ? 'lg:w-60!' : ''
    }`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4 lg:h-full lg:max-w-none lg:flex-col lg:items-stretch lg:justify-start lg:gap-3 lg:px-3 lg:py-4">
        {/* Brand + Navegación Principal (Inicio / Cómics) */}
        <div className="flex items-center gap-2 sm:gap-6 md:gap-8 shrink-0 lg:flex-col lg:items-stretch lg:gap-5 lg:w-full">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-3 cursor-pointer group text-left lg:justify-center lg:group-hover/sidebar:justify-start lg:w-full"
            title="Volver a la pantalla de bienvenida"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 transition-transform group-hover:scale-105">
              <img
                src={`${import.meta.env.BASE_URL}crow-emblem.png`}
                alt="Crow Comics"
                className="logo-tint w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-[0_0_10px_oklch(0.63_0.21_var(--crow-hue)/45%)]"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  target.parentElement?.nextElementSibling?.classList.remove('hidden');
                }}
              />
            </div>
            {/* Fallback si no existe crow-emblem.png: solo el icono, sin caja */}
            <Feather className="hidden w-6 h-6 stroke-[2.5] text-accent" />
            <div className="lg:hidden lg:group-hover/sidebar:block">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-lg font-black tracking-tight text-ink uppercase font-sans">
                  CROW <span className="text-accent">COMICS</span>
                </span>
                {/* Versión actual — discreta, junto al logo */}
                <span
                  className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider rounded-md bg-accent/10 text-accent border border-accent/25 leading-none"
                  title="Versión actual del sitio"
                >
                  Beta v0.5
                </span>
              </div>
              <p className="text-[10px] text-mute font-mono hidden sm:block">
                Maquetaciones & Scans
              </p>
            </div>
          </button>

          {/* Links de Navegación desde lg: debajo existe la barra inferior móvil.
              Las herramientas de admin viven en el menú del avatar para que la
              barra nunca se desborde encima del menú */}
          <nav className="hidden lg:flex flex-col items-stretch gap-1 w-full">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.view === 'personajes'
                  ? currentView === 'personajes' || currentView === 'character-detail'
                  : currentView === item.view;

              return (
                <button
                  key={item.view}
                  onClick={() => onNavigate(item.view)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all lg:justify-center lg:px-2 lg:group-hover/sidebar:justify-start lg:group-hover/sidebar:px-3.5 ${
                    isActive
                      ? 'bg-raised text-accent border border-accent/30 shadow-sm'
                      : 'text-mute hover:text-ink hover:bg-raised/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="lg:hidden lg:group-hover/sidebar:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Zona Derecha: Campana de nuevos tomos + Búsqueda + Panel Admin */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3 relative justify-end flex-1 lg:flex-col lg:items-center lg:justify-end lg:gap-2 lg:mt-auto lg:w-full lg:group-hover/sidebar:items-stretch">

          {/* Campana: capítulos subidos desde tu última visita (todos los usuarios) */}
          <div className="flex justify-center lg:justify-center lg:group-hover/sidebar:justify-start lg:w-full">
            <NewChaptersBell comics={comics} onSelectComic={onSelectComic} />
          </div>

          {/* ── Personalización: tema (negro/blanco) y acento (tono de color) ── */}
          <div className="flex items-center gap-1.5 shrink-0 lg:w-full lg:flex-col lg:items-center lg:gap-1.5 lg:group-hover/sidebar:flex-row lg:group-hover/sidebar:justify-start">
            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              title={theme === 'dark' ? 'Tema claro (blanco)' : 'Tema oscuro (negro)'}
              className="p-2 rounded-xl bg-surface hover:bg-raised text-mute hover:text-ink border border-line transition-all active:scale-90"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setIsAccentOpen(true)}
              aria-label="Cambiar color de acento"
              title="Color de acento"
              className="p-2 rounded-xl bg-surface hover:bg-raised text-mute hover:text-ink border border-line transition-all active:scale-90"
            >
              <Palette className="w-4 h-4" style={{ color: 'oklch(0.63 0.21 var(--crow-hue))' }} />
            </button>
          </div>


          {/* Zona de usuario: Google / Menú de cuenta */}
          <div className="relative shrink-0 lg:w-full lg:flex lg:justify-center lg:group-hover/sidebar:justify-start" ref={userMenuRef}>
            {user ? (
              <div className="lg:flex lg:justify-center lg:group-hover/sidebar:justify-start lg:w-full">
                <button
                  onClick={() => { setIsUserMenuOpen((v) => !v); setShowReports(false); }}
                  aria-label="Abrir menú de mi cuenta"
                  aria-expanded={isUserMenuOpen}
                  className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl bg-surface border transition-all lg:w-auto lg:justify-center lg:group-hover/sidebar:w-full lg:group-hover/sidebar:justify-start ${
                    isUserMenuOpen
                      ? 'border-accent/40'
                      : 'border-line hover:border-faint'
                  }`}
                  title="Mi cuenta"
                >
                  <div className="relative w-7 h-7 rounded-lg overflow-hidden bg-gradient-to-br from-accent to-accent2 text-onaccent flex items-center justify-center text-[11px] font-black shrink-0 ring-2 ring-accent/20">
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt="Mi avatar"
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      avatarInitials
                    )}
                  </div>
                  <span className="hidden md:inline lg:hidden lg:group-hover/sidebar:inline text-xs font-bold text-ink max-w-[120px] truncate">
                    {profile?.username?.trim() || (user.email ?? 'Cuenta').split('@')[0]}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-mute transition-transform lg:hidden lg:group-hover/sidebar:block lg:group-hover/sidebar:ml-auto ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in lg:left-0 lg:right-auto lg:bottom-full lg:top-auto lg:mb-2 lg:mt-0">
                    {/* Info de cuenta */}
                    <div className="px-4 py-3 border-b border-line flex items-center gap-3">
                      <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-accent to-accent2 text-onaccent flex items-center justify-center text-xs font-black shrink-0">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          avatarInitials
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-ink truncate flex items-center gap-1.5">
                          <span className="truncate">
                            {profile?.username?.trim() || (user.email ?? 'Cuenta').split('@')[0]}
                          </span>
                          {isAdmin && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-md bg-accent/15 text-accent border border-accent/30 leading-none">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              {isDemoMode ? 'Admin demo' : 'Admin'}
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-mute truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="p-1.5 space-y-0.5">
                      {/* ── Herramientas de administrador: viven en el menú ── */}
                      {canManageContent && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenNewComic();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-accent hover:bg-accent/10 transition-colors"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          Nuevo Cómic
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setShowReports(true);
                            void loadReports();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-mute hover:bg-raised hover:text-accent2 transition-colors"
                        >
                          <Flag className="w-4 h-4" />
                          Reportes de enlaces
                          {pendingCount > 0 && (
                            <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-accent2 text-onaccent text-[10px] font-black">
                              {pendingCount > 9 ? '9+' : pendingCount}
                            </span>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onNavigate('historial');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-mute hover:bg-raised hover:text-accent transition-colors"
                      >
                        <History className="w-4 h-4" />
                        Historial de lectura
                      </button>
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenProfile();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-mute hover:bg-raised hover:text-accent transition-colors"
                      >
                        <UserCircle className="w-4 h-4" />
                        Mi Perfil
                      </button>

                      {/* Color de acento: ahora se abre desde el icono de
                          paleta del sidebar (diálogo centrado, sin recortes) */}

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          void signOut();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-mute hover:bg-accent/10 hover:text-accent2 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              !authLoading && (
                <div className="flex items-center gap-2 lg:flex-col lg:items-center lg:group-hover/sidebar:items-stretch lg:w-full">
                  {/* Acceso con email (modal completo) */}
                  <button
                    onClick={() => onOpenAuth()}
                    className="hidden md:inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-surface hover:bg-raised text-mute hover:text-ink text-xs font-bold border border-line hover:border-faint transition-all lg:hidden lg:group-hover/sidebar:inline-flex lg:w-full"
                  >
                    Entrar
                  </button>

                  {/* Continuar con Google */}
                  <button
                    onClick={() => void handleGoogleSignIn()}
                    disabled={googleLoading}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-60 lg:w-auto lg:group-hover/sidebar:w-full"
                    title="Continuar con Google"
                  >
                    {googleLoading ? (
                      <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <GoogleIcon className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline lg:hidden lg:group-hover/sidebar:inline">Continuar con Google</span>
                  </button>
                </div>
              )
            )}
          </div>

          {/* Herramientas admin (Nuevo Cómic / Reportes): en el menú del avatar.
              El dropdown de reportes se ancla aquí, junto a la cuenta. */}
          {isAdmin && (
            <div className="relative lg:w-full" ref={reportsRef}>
                {showReports && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in lg:left-0 lg:right-auto lg:bottom-full lg:top-auto lg:mb-2 lg:mt-0">
                    <div className="px-4 py-3 border-b border-line flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flag className="w-3.5 h-3.5 text-accent2" />
                        <span className="text-xs font-bold text-ink">Reportes de enlaces</span>
                        {pendingCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-accent/15 text-accent2 text-[10px] font-bold border border-accent/30">
                            {pendingCount} pendientes
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setShowReports(false)}
                        aria-label="Cerrar reportes"
                        className="p-1 rounded text-faint hover:text-mute transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-line">
                      {loadingReports ? (
                        <div className="p-6 flex justify-center">
                          <div className="w-5 h-5 border-2 bg-accent2 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : reports.length === 0 ? (
                        <div className="p-6 text-center text-xs text-faint">
                          Sin reportes. ¡Todo en orden!
                        </div>
                      ) : (
                        reports.map(report => (
                          <div key={report.id} className={`p-3 space-y-1.5 ${
                            report.status === 'pending' ? 'bg-accent/5' : 'opacity-50'
                          }`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-ink truncate">
                                  {report.comic_title} — {report.chapter_title}
                                </p>
                                <p className="text-[10px] text-accent2 font-semibold truncate">
                                  🔗 {report.link_name}
                                </p>
                                {report.reporter_name && (
                                  <p className="text-[10px] text-faint">Por: {report.reporter_name}</p>
                                )}
                                {report.message && (
                                  <p className="text-[10px] text-mute italic mt-0.5 line-clamp-2">"{report.message}"</p>
                                )}
                              </div>
                              <div className="flex flex-col gap-1 shrink-0">
                                {report.status === 'pending' ? (
                                  <>
                                    <button
                                      onClick={() => handleUpdateReport(report.id, 'resolved')}
                                      aria-label="Marcar reporte como resuelto"
                                      className="p-1 rounded-lg bg-accent/15 hover:bg-accent/30 text-accent transition-colors border border-accent/40"
                                      title="Marcar como resuelto"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleUpdateReport(report.id, 'dismissed')}
                                      aria-label="Descartar reporte"
                                      className="p-1 rounded-lg bg-raised hover:bg-raised text-mute transition-colors border border-line"
                                      title="Descartar reporte"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                                    report.status === 'resolved'
                                      ? 'bg-accent/10 text-accent border-accent/30'
                                      : 'bg-raised text-faint border-line'
                                  }`}>
                                    {report.status === 'resolved' ? 'Resuelto' : 'Descartado'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-faint">
                              <Clock className="w-3 h-3" />
                              {new Date(report.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
          )}
        </div>
      </div>

      <AccentDialog isOpen={isAccentOpen} onClose={() => setIsAccentOpen(false)} />
    </header>
  );
};
