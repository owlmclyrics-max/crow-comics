import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck,
  LogOut,
  Plus,
  Feather,
  Search,
  X,
  Command,
  Home,
  BookOpen,
  User,
  UserCircle,
  ChevronDown,
  Bell,
  Flag,
  CheckCircle,
  XCircle,
  Clock,
  History,
} from 'lucide-react';
import type { Comic, LinkReport, Profile } from '../types/comic';
import { useAuth } from '../context/AuthContext';
import { useComics } from '../context/ComicsContext';
import { filterComicsByQuery } from '../lib/comicUtils';
import { searchProfiles } from '../lib/profiles';
import { GoogleIcon } from './ui/GoogleIcon';

export type CurrentView = 'landing' | 'inicio' | 'comics' | 'personajes' | 'character-detail' | 'comic-detail' | 'chapter-detail' | 'list-detail' | 'event-detail' | 'profile' | 'historial' | 'public-profile';

const NAV_ITEMS = [
  { view: 'inicio', label: 'Inicio', icon: Home },
  { view: 'comics', label: 'Cómics', icon: BookOpen },
  { view: 'personajes', label: 'Personajes', icon: User },
  // Historial solo se muestra para usuarios con cuenta (se filtra abajo).
  { view: 'historial', label: 'Historial', icon: History },
] as const;

interface NavbarProps {
  comics: Comic[];
  currentView: CurrentView;
  onNavigate: (view: CurrentView) => void;
  onSelectComic: (comic: Comic) => void;
  onOpenAuth: (tab?: 'signin' | 'signup' | 'admin') => void;
  onOpenProfile: () => void;
  /** Abre el perfil PÚBLICO de otro usuario (desde resultados del buscador). */
  onOpenPublicProfile?: (profileId: string) => void;
  onOpenNewComic: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  comics,
  currentView,
  onNavigate,
  onSelectComic,
  onOpenAuth,
  onOpenProfile,
  onOpenPublicProfile,
  onOpenNewComic
}) => {
  const { user, profile, isAdmin, signInWithGoogle, signOut, isDemoMode, loading: authLoading } = useAuth();
  const { getLinkReports, updateLinkReportStatus } = useComics();

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

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
  }, []);

  // Focus automático cuando se abre la búsqueda
  React.useEffect(() => {
    if (!isSearchOpen) return;

    const timeout = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(timeout);
  }, [isSearchOpen]);

  // ── SPRINT 4: búsqueda de PERFILES (username) con debounce ligero ──
  const [matchingProfiles, setMatchingProfiles] = useState<Profile[]>([]);
  React.useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setMatchingProfiles([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchProfiles(q)
        .then((res) => {
          if (!cancelled) setMatchingProfiles(res);
        })
        .catch(() => {
          if (!cancelled) setMatchingProfiles([]);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  // Clic en un resultado de perfil: si es MI perfil → vista personal;
  // si es de otro → vista pública.
  const handleOpenProfileResult = (profileId: string) => {
    closeSearch();
    if (user && profileId === user.id) {
      onOpenProfile();
    } else {
      onOpenPublicProfile?.(profileId);
    }
  };

  // Atajos de teclado:
  // - Ctrl+K / Cmd+K: Búsqueda rápida
  // (Ctrl+Shift+A retirado: el admin ahora se determina por la cuenta de
  //  Google — ADMIN_EMAILS en AuthContext — y el login doble pisaba la sesión)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev: boolean) => !prev);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        closeSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeSearch, isSearchOpen, onOpenAuth]);

  // Cerrar búsqueda al hacer clic fuera
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        closeSearch();
      }
    };

    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeSearch, isSearchOpen]);

  // Resultados de búsqueda
  const matchingComics = filterComicsByQuery(comics, searchQuery).slice(0, 6);

  return (
    <header className="sticky top-0 z-50 w-full bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand + Navegación Principal (Inicio / Cómics) */}
        <div className="flex items-center gap-6 sm:gap-8 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-3 cursor-pointer group text-left"
            title="Volver a la pantalla de bienvenida"
          >
            <div className="w-10 h-10 transition-transform group-hover:scale-105">
              <img
                src={`${import.meta.env.BASE_URL}crow-emblem.png`}
                alt="Crow Comics"
                className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(220,38,38,0.45)]"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  target.parentElement?.nextElementSibling?.classList.remove('hidden');
                }}
              />
            </div>
            {/* Fallback si no existe crow-emblem.png: solo el icono, sin caja */}
            <Feather className="hidden w-6 h-6 stroke-[2.5] text-red-500" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white uppercase font-sans">
                  CROW <span className="text-red-400">COMICS</span>
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono hidden sm:block">
                Maquetaciones & Scans
              </p>
            </div>
          </button>

          {/* Links de Navegación: Inicio, Cómics, Personajes e Historial (con cuenta) */}
          <nav className="flex items-center gap-1.5 sm:gap-2">
            {NAV_ITEMS.map((item) => {
              // El Historial requiere sesión: sin cuenta no se muestra.
              if (item.view === 'historial' && !user) return null;

              const Icon = item.icon;
              const isActive =
                item.view === 'personajes'
                  ? currentView === 'personajes' || currentView === 'character-detail'
                  : item.view === 'historial'
                    ? currentView === 'historial'
                    : currentView === item.view;

              return (
                <button
                  key={item.view}
                  onClick={() => onNavigate(item.view)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-zinc-900 text-red-400 border border-red-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Zona Derecha: Barra de Búsqueda Expandible + Panel Admin */}
        <div className="flex items-center gap-3 relative justify-end flex-1" ref={searchContainerRef}>
          {/* Lupa / Input Expandible */}
          <div className="relative flex items-center">
            {isSearchOpen ? (
              <div className="relative flex items-center w-60 sm:w-80 md:w-96 transition-all duration-300">
                <Search className="absolute left-3 w-4 h-4 text-red-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar cómic o perfil..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-900 border border-red-500/50 text-xs text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-red-500 shadow-xl"
                />
                <button
                  onClick={closeSearch}
                  className="absolute right-2.5 p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-all hover:border-zinc-700 group"
                title="Buscar cómic (Ctrl + K)"
              >
                <Search className="w-4 h-4 text-zinc-400 group-hover:text-red-400 transition-colors" />
                <span className="text-xs text-zinc-400 group-hover:text-zinc-300 hidden md:inline">
                  Buscar...
                </span>
                <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-950 text-zinc-400 border border-zinc-800">
                  <Command className="w-2.5 h-2.5" /> K
                </kbd>
              </button>
            )}

            {/* Dropdown flotante con resultados inmediatos */}
            {isSearchOpen && searchQuery.trim() && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                {/* ── Perfiles (Sprint 4) ── */}
                {matchingProfiles.length > 0 && (
                  <>
                    <div className="p-2 border-b border-zinc-800 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Perfiles ({matchingProfiles.length})</span>
                    </div>
                    <div className="divide-y divide-zinc-800/80 border-b border-zinc-800">
                      {matchingProfiles.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleOpenProfileResult(p.id)}
                          className="p-3 hover:bg-zinc-800/80 cursor-pointer transition-colors flex items-center gap-3 group"
                        >
                          <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800 shrink-0">
                            {p.avatar_url ? (
                              <img
                                src={p.avatar_url}
                                alt={p.username}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <span className="w-full h-full flex items-center justify-center text-xs font-black text-white bg-gradient-to-br from-red-400 to-red-600">
                                {p.username.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-zinc-100 truncate group-hover:text-red-400 transition-colors">
                              @{p.username}
                            </h4>
                            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                              {p.bio?.trim() || 'Lector de Crow Comics'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ── Cómics ── */}
                <div className="p-2 border-b border-zinc-800 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Cómics ({matchingComics.length})</span>
                  <span className="text-[10px] text-zinc-400">Esc para cerrar</span>
                </div>

                {matchingComics.length === 0 && matchingProfiles.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-400">
                    No se encontraron cómics ni perfiles para "{searchQuery}"
                  </div>
                ) : matchingComics.length === 0 ? (
                  <div className="p-4 text-center text-[11px] text-zinc-500">
                    Sin cómics con ese nombre — prueba con otra palabra
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/80">
                    {matchingComics.map((comic) => (
                      <div
                        key={comic.id}
                        onClick={() => {
                          onSelectComic(comic);
                          closeSearch();
                        }}
                        className="p-3 hover:bg-zinc-800/80 cursor-pointer transition-colors flex items-center gap-3 group"
                      >
                        <img
                          src={comic.cover_url}
                          alt={comic.title}
                          className="w-10 h-14 object-cover rounded-md border border-zinc-800 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=200';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-zinc-100 truncate group-hover:text-red-400 transition-colors">
                            {comic.title}
                          </h4>
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                            <span className="text-amber-400 font-semibold">{comic.publisher}</span> · {comic.tag}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1">
                            <span>{comic.chapters?.length || 0} caps.</span>
                            <span>•</span>
                            <span>{comic.translator_typesetter}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Zona de usuario: Google / Menú de cuenta */}
          <div className="relative" ref={userMenuRef}>
            {user ? (
              <div>
                <button
                  onClick={() => setIsUserMenuOpen((v) => !v)}
                  className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl bg-zinc-900 border transition-all ${
                    isUserMenuOpen
                      ? 'border-red-500/40'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                  title="Mi cuenta"
                >
                  <div className="relative w-7 h-7 rounded-lg overflow-hidden bg-gradient-to-br from-red-400 to-red-600 text-zinc-950 flex items-center justify-center text-[11px] font-black shrink-0">
                    {(user.email ?? '?').slice(0, 2).toUpperCase()}
                    {profile?.avatar_url && (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                  </div>
                  <span className="hidden md:inline text-xs font-bold text-zinc-200 max-w-[120px] truncate">
                    {profile?.username?.trim() || (user.email ?? 'Cuenta').split('@')[0]}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                    {/* Info de cuenta */}
                    <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-3">
                      <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-red-400 to-red-600 text-zinc-950 flex items-center justify-center text-xs font-black shrink-0">
                        {(user.email ?? '?').slice(0, 2).toUpperCase()}
                        {profile?.avatar_url && (
                          <img
                            src={profile.avatar_url}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {profile?.username?.trim() || (user.email ?? 'Cuenta').split('@')[0]}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="p-1.5 space-y-0.5">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenProfile();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-red-400 transition-colors"
                      >
                        <UserCircle className="w-4 h-4" />
                        Mi Perfil
                      </button>
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          void signOut();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
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
                <div className="flex items-center gap-2">
                  {/* Acceso con email (modal completo) */}
                  <button
                    onClick={() => onOpenAuth()}
                    className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold border border-zinc-800 hover:border-zinc-700 transition-all"
                  >
                    Entrar
                  </button>

                  {/* Continuar con Google */}
                  <button
                    onClick={() => void handleGoogleSignIn()}
                    disabled={googleLoading}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-60"
                    title="Continuar con Google"
                  >
                    {googleLoading ? (
                      <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <GoogleIcon className="w-4 h-4" />
                    )}
                    <span>Continuar con Google</span>
                  </button>
                </div>
              )
            )}
          </div>

          {/* Menú visible SOLO si eres administrador logueado */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              {/* Botón Nuevo Cómic */}
              <button
                onClick={onOpenNewComic}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-400 text-zinc-950 text-xs font-bold transition-all shadow-md shadow-red-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span className="hidden sm:inline">Nuevo Cómic</span>
              </button>

              {/* Notificaciones de reportes */}
              <div className="relative" ref={reportsRef}>
                <button
                  onClick={() => { setShowReports(v => !v); void loadReports(); }}
                  className="relative p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-800/60 transition-colors"
                  title="Reportes de enlaces caídos"
                >
                  <Bell className="w-4 h-4" />
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </button>

                {showReports && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                    <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flag className="w-3.5 h-3.5 text-rose-400" />
                        <span className="text-xs font-bold text-white">Reportes de enlaces</span>
                        {pendingCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30">
                            {pendingCount} pendientes
                          </span>
                        )}
                      </div>
                      <button onClick={() => setShowReports(false)} className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/60">
                      {loadingReports ? (
                        <div className="p-6 flex justify-center">
                          <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : reports.length === 0 ? (
                        <div className="p-6 text-center text-xs text-zinc-500">
                          Sin reportes. ¡Todo en orden!
                        </div>
                      ) : (
                        reports.map(report => (
                          <div key={report.id} className={`p-3 space-y-1.5 ${
                            report.status === 'pending' ? 'bg-rose-950/10' : 'opacity-50'
                          }`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-zinc-200 truncate">
                                  {report.comic_title} — {report.chapter_title}
                                </p>
                                <p className="text-[10px] text-rose-400 font-semibold truncate">
                                  🔗 {report.link_name}
                                </p>
                                {report.reporter_name && (
                                  <p className="text-[10px] text-zinc-500">Por: {report.reporter_name}</p>
                                )}
                                {report.message && (
                                  <p className="text-[10px] text-zinc-400 italic mt-0.5 line-clamp-2">"{report.message}"</p>
                                )}
                              </div>
                              <div className="flex flex-col gap-1 shrink-0">
                                {report.status === 'pending' ? (
                                  <>
                                    <button
                                      onClick={() => handleUpdateReport(report.id, 'resolved')}
                                      className="p-1 rounded-lg bg-red-900/50 hover:bg-red-800 text-red-400 transition-colors border border-red-800/60"
                                      title="Marcar como resuelto"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleUpdateReport(report.id, 'dismissed')}
                                      className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors border border-zinc-700"
                                      title="Descartar reporte"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                                    report.status === 'resolved'
                                      ? 'bg-red-900/30 text-red-400 border-red-800/40'
                                      : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                                  }`}>
                                    {report.status === 'resolved' ? 'Resuelto' : 'Descartado'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-zinc-600">
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

              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-red-500/30 text-red-400 text-xs font-medium">
                <ShieldCheck className="w-4 h-4 text-red-400" />
                <span className="hidden md:inline">
                  {isDemoMode ? 'Admin (Demo)' : 'Admin'}
                </span>
              </div>

              <button
                onClick={() => signOut()}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
