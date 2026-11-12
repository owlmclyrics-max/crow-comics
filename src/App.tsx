import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { useComics } from './context/ComicsContext';
import type { Comic, ComicTag, Chapter, Character, ReadingEvent } from './types/comic';
import { toChapterWithComic } from './lib/comicUtils';
import {
  comicSlug,
  chapterSlug,
  findChapterByRef,
  findComicByRef,
} from './lib/slug';
import { Navbar, type CurrentView } from './components/Navbar';
import { CategoryBar } from './components/CategoryBar';
import { ComicCard } from './components/ComicCard';
import { SteamHeroCarousel } from './components/SteamHeroCarousel';
import { OnboardingWizard } from './components/OnboardingWizard';
import { useAuth } from './context/AuthContext';
import { useCharactersContext } from './context/CharactersContext';
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './components/LandingPage';
import { AuthSplash } from './components/AuthSplash';
import { ContinueReadingRow } from './components/ContinueReadingRow';
import { FeaturedListsRow } from './components/FeaturedListsRow';
import { MobileBottomNav } from './components/MobileBottomNav';
import { TopSearchBar } from './components/TopSearchBar';
import { SearchOverlay } from './components/SearchOverlay';
import { ScrollToTop } from './components/ui/ScrollToTop';
import type { ReadingListRow } from './lib/profile';
import { ToastHost, showToast } from './components/ui/Toast';
import { OPEN_AUTH_EVENT } from './components/FavoriteButton';
import { BookOpen, AlertCircle, Heart } from 'lucide-react';

// ── CODE SPLITTING ──
// Las páginas pesadas (fichas, catálogo, perfil, lector) van en chunks propios
// y cargan solo cuando se navega hacia ellas. Reduce ~60% el JS inicial.
const ComicsCatalogView = lazy(() =>
  import('./components/ComicsCatalogView').then((m) => ({ default: m.ComicsCatalogView })),
);
const ComicDetailPage = lazy(() =>
  import('./components/ComicDetailPage').then((m) => ({ default: m.ComicDetailPage })),
);
const ChapterDetailPage = lazy(() =>
  import('./components/ChapterDetailPage').then((m) => ({ default: m.ChapterDetailPage })),
);
const CharactersPage = lazy(() =>
  import('./components/CharactersPage').then((m) => ({ default: m.CharactersPage })),
);
const CharacterDetailPage = lazy(() =>
  import('./components/CharacterDetailPage').then((m) => ({ default: m.CharacterDetailPage })),
);
const ProfilePage = lazy(() =>
  import('./components/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const PublicProfilePage = lazy(() =>
  import('./components/PublicProfilePage').then((m) => ({ default: m.PublicProfilePage })),
);
const RoadmapView = lazy(() =>
  import('./components/RoadmapView').then((m) => ({ default: m.RoadmapView })),
);
const ListDetailPage = lazy(() =>
  import('./components/ListDetailPage').then((m) => ({ default: m.ListDetailPage })),
);
const EventDetailPage = lazy(() =>
  import('./components/EventDetailPage').then((m) => ({ default: m.EventDetailPage })),
);
const SearchPage = lazy(() =>
  import('./components/SearchPage').then((m) => ({ default: m.SearchPage })),
);
const LibraryPage = lazy(() =>
  import('./components/LibraryPage').then((m) => ({ default: m.LibraryPage })),
);
const ComicRequestsPage = lazy(() =>
  import('./components/ComicRequestsPage').then((m) => ({ default: m.ComicRequestsPage })),
);

// Los modales de administración también: solo el admin los usa y rara vez.
const ComicAdminFormModal = lazy(() =>
  import('./components/ComicAdminFormModal').then((m) => ({ default: m.ComicAdminFormModal })),
);
const CharactersAdminModal = lazy(() =>
  import('./components/CharactersAdminModal').then((m) => ({ default: m.CharactersAdminModal })),
);
const CharacterFormModal = lazy(() =>
  import('./components/CharacterFormModal').then((m) => ({ default: m.CharacterFormModal })),
);
const ChapterCharactersModal = lazy(() =>
  import('./components/ChapterCharactersModal').then((m) => ({ default: m.ChapterCharactersModal })),
);

const ViewFallback: React.FC = () => (
  <div className="py-24 flex flex-col items-center justify-center space-y-3">
    <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    <p className="text-xs text-mute">Cargando...</p>
  </div>
);

// ── Restaurar la vista al recargar la página ──
// Dos capas: 1) el hash de la URL (#/vista?comic=..&chapter=..) que vive
// incluso si el PWA se cierra y reabre; 2) sessionStorage para los objetos
// completos (ficha de personaje, lista, evento) que no caben en un hash.
const CROW_VIEW_STATE_KEY = 'crow_view_state';
interface CrowViewState {
  view: CurrentView;
  comicId: string | null;
  chapterId: string | null;
  profileId: string | null;
  character: Character | null;
  list: ReadingListRow | null;
  event: ReadingEvent | null;
}

const VALID_VIEWS: CurrentView[] = [
  'landing', 'inicio', 'comics', 'personajes', 'character-detail', 'comic-detail',
  'chapter-detail', 'list-detail', 'event-detail', 'profile', 'historial',
  'public-profile', 'roadmap', 'search', 'biblioteca', 'solicitudes',
];

/** Lee la vista e IDs desde el hash actual (#/vista?comic=..). */
const readHashState = (): {
  view: CurrentView | null;
  comicId: string | null;
  chapterId: string | null;
  profileId: string | null;
  characterId: string | null;
} => {
  try {
    const raw = window.location.hash.replace(/^#\/?/, '');
    if (!raw) {
      return { view: null, comicId: null, chapterId: null, profileId: null, characterId: null };
    }
    const [path, qs] = raw.split('?');
    const params = new URLSearchParams(qs ?? '');

    // v0.9.9.4: formato nuevo y legible — #/comic/<slug> y
    // #/comic/<slug>/tomo-<n>. El "id" guardado puede ser slug o UUID viejo;
    // findComicByRef/findChapterByRef resuelven ambos.
    const segments = path.split('/').filter(Boolean);
    if (segments[0] === 'comic' && segments[1]) {
      return {
        view: (segments[2] ? 'chapter-detail' : 'comic-detail') as CurrentView,
        comicId: decodeURIComponent(segments[1]),
        chapterId: segments[2] ? decodeURIComponent(segments[2]) : null,
        profileId: params.get('profile'),
        characterId: params.get('character'),
      };
    }

    const view = VALID_VIEWS.includes(path as CurrentView) ? (path as CurrentView) : null;
    return {
      view,
      comicId: params.get('comic'),
      chapterId: params.get('chapter'),
      profileId: params.get('profile'),
      characterId: params.get('character'),
    };
  } catch {
    return { view: null, comicId: null, chapterId: null, profileId: null, characterId: null };
  }
};

/** Lee el snapshot completo de sessionStorage. */
const readSavedState = (): CrowViewState | null => {
  try {
    const raw = sessionStorage.getItem(CROW_VIEW_STATE_KEY);
    return raw ? (JSON.parse(raw) as CrowViewState) : null;
  } catch {
    return null;
  }
};

/**
 * Construye el hash correspondiente a un estado de navegación.
 * v0.9.9.4: cómics y tomos usan links legibles (#/comic/<slug>/tomo-<n>).
 * Antes de que cargue el catálogo (o con ids locales) cae al formato viejo
 * con query params, que sigue siendo compatible.
 */
const viewToHash = (state: CrowViewState, comics: Comic[] = []): string => {
  if (
    state.comicId &&
    (state.view === 'comic-detail' || state.view === 'chapter-detail')
  ) {
    const comic = findComicByRef(state.comicId, comics);
    if (comic) {
      const slug = comicSlug(comic, comics);
      if (state.view === 'comic-detail') return `#/comic/${slug}`;
      const chapter = findChapterByRef(comic, state.chapterId);
      return chapter
        ? `#/comic/${slug}/${chapterSlug(chapter)}`
        : `#/comic/${slug}`;
    }
  }
  const params = new URLSearchParams();
  if (state.comicId) params.set('comic', state.comicId);
  if (state.chapterId) params.set('chapter', state.chapterId);
  if (state.profileId) params.set('profile', state.profileId);
  if (state.character) params.set('character', state.character.id);
  const qs = params.toString();
  return `#/${state.view}${qs ? `?${qs}` : ''}`;
};

export const App: React.FC = () => {
  const { comics, loading, error, saveComic, deleteComic } = useComics();
  const { user, profile, refreshProfile } = useAuth();
  const { characters, loading: charactersLoading } = useCharactersContext();

  // Sprint 4: wizard de onboarding para cuentas nuevas. Se muestra solo si el
  // perfil EXISTE y aún no completó el onboarding (si la tabla profiles no
  // existe todavía — SQL sin correr — el wizard no bloquea la app).
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  // Modo dev desde el perfil: fuerza a reabrir el wizard aunque ya esté completo.
  const [forceOnboarding, setForceOnboarding] = useState(false);
  // El wizard no debe molestar en cada sesión: el "omitir" (X) se recuerda
  // por usuario en localStorage, además del flag onboarding_completed en la BD.
  const showOnboarding = Boolean(
    user &&
      profile &&
      (forceOnboarding ||
        (!profile.prefs?.onboarding_completed &&
          !onboardingDismissed &&
          !localStorage.getItem(`crow_onboarding_skip_${profile.id}`))),
  );

  // Navegación de vistas: 'landing' | 'inicio' | 'comics' | 'personajes' | 'character-detail' | 'comic-detail' | 'chapter-detail' | 'profile'
  // Restaurar tras recargar: primero el hash de la URL (sobrevive incluso a
  // cerrar y reabrir el PWA) y como respaldo el snapshot de sessionStorage.
  const initialHash = useMemo(() => readHashState(), []);
  const initialSaved = useMemo(() => readSavedState(), []);
  const [currentView, setCurrentView] = useState<CurrentView>((): CurrentView => {
    const view =
      initialHash.view && initialHash.view !== 'landing'
        ? initialHash.view
        : initialSaved?.view && initialSaved.view !== 'landing'
          ? initialSaved.view
          : 'landing';
    // Sin el objeto completo no se puede reconstruir el detalle.
    if (view === 'list-detail' && !initialSaved?.list) return 'inicio';
    if (view === 'event-detail' && !initialSaved?.event) return 'inicio';
    // La ficha de personaje sí se puede resolver luego desde el catálogo.
    if (view === 'character-detail' && !initialSaved?.character && !initialHash.characterId) {
      return 'personajes';
    }
    return view;
  });
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(() => {
    const snapshot = initialSaved?.character ?? null;
    // Si el hash pide OTRA ficha, ignorar el snapshot y resolverla después.
    if (
      initialHash.view === 'character-detail' &&
      initialHash.characterId &&
      snapshot?.id !== initialHash.characterId
    ) {
      return null;
    }
    return snapshot;
  });

  // Estados de filtros y modales
  const [selectedCategory, setSelectedCategory] = useState<ComicTag | 'All'>('All');
  
  // Cómic seleccionado para la página completa de detalle
  const [selectedComicId, setSelectedComicId] = useState<string | null>(
    () => initialHash.comicId ?? initialSaved?.comicId ?? null,
  );
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    () => initialHash.chapterId ?? initialSaved?.chapterId ?? null,
  );
  // Sprint 3: lista abierta en la vista de detalle (ListDetailPage)
  const [selectedList, setSelectedList] = useState<ReadingListRow | null>(() => {
    try {
      const raw = sessionStorage.getItem(CROW_VIEW_STATE_KEY);
      return raw ? ((JSON.parse(raw) as CrowViewState).list ?? null) : null;
    } catch {
      return null;
    }
  });
  // Sprint 5: evento (guía de lectura) abierto en EventDetailPage
  const [selectedEvent, setSelectedEvent] = useState<ReadingEvent | null>(() => {
    try {
      const raw = sessionStorage.getItem(CROW_VIEW_STATE_KEY);
      return raw ? ((JSON.parse(raw) as CrowViewState).event ?? null) : null;
    } catch {
      return null;
    }
  });
  // Perfil PÚBLICO abierto desde el buscador de personas
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    () => initialHash.profileId ?? initialSaved?.profileId ?? null,
  );

  // Buscador global: paleta rápida + pantalla completa
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchPageQuery, setSearchPageQuery] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup' | 'admin'>('signin');
  const [isAdminFormOpen, setIsAdminFormOpen] = useState(false);
  const [isCharactersModalOpen, setIsCharactersModalOpen] = useState(false);
  const [isCharacterFormOpen, setIsCharacterFormOpen] = useState(false);
  const [characterFormTargetId, setCharacterFormTargetId] = useState<string | null>(null);
  const [isChapterCharactersModalOpen, setIsChapterCharactersModalOpen] = useState(false);
  const [chapterCharactersUpdatedCallback, setChapterCharactersUpdatedCallback] = useState<(() => void) | null>(null);
  const [comicToEdit, setComicToEdit] = useState<Comic | null>(null);

  // Corazón de favorito sin sesión → abrir AuthModal (pestaña Entrar)
  React.useEffect(() => {
    const handler = () => {
      setAuthModalTab('signin');
      setIsAuthModalOpen(true);
    };
    window.addEventListener(OPEN_AUTH_EVENT, handler);
    return () => window.removeEventListener(OPEN_AUTH_EVENT, handler);
  }, []);

  // Al cerrar sesión (desde cualquier parte: menú de usuario, botón admin,
  // expiración de sesión...), volver a la pantalla de bienvenida.
  const prevUserRef = useRef(user);
  React.useEffect(() => {
    if (prevUserRef.current && !user) {
      setCurrentView('landing');
      setSelectedComicId(null);
      setSelectedChapterId(null);
      setSelectedList(null);
      setSelectedEvent(null);
    }
    prevUserRef.current = user;
  }, [user]);

  // ── Recargar la página devuelve a donde estabas ──
  // Doble capa: snapshot en sessionStorage (objetos completos) + hash en la
  // URL (IDs mínimos, sobrevive a cerrar y reabrir el PWA).
  React.useEffect(() => {
    const state: CrowViewState = {
      view: currentView,
      comicId: selectedComicId,
      chapterId: selectedChapterId,
      profileId: selectedProfileId,
      character: selectedCharacter,
      list: selectedList,
      event: selectedEvent,
    };
    try {
      sessionStorage.setItem(CROW_VIEW_STATE_KEY, JSON.stringify(state));
    } catch { /* noop */ }
    try {
      history.replaceState(null, '', viewToHash(state, comics));
    } catch { /* noop */ }
  }, [currentView, selectedComicId, selectedChapterId, selectedProfileId, selectedCharacter, selectedList, selectedEvent, comics]);

  // Mantener la ficha abierta SIEMPRE sincronizada con el catálogo: al guardar
  // ediciones (o si otro dispositivo cambia algo), el detalle y su formulario
  // reflejan la versión actual sin tener que re-navegar.
  React.useEffect(() => {
    if (!selectedCharacter || charactersLoading) return;
    const live = characters.find((c) => c.id === selectedCharacter.id);
    if (live && live !== selectedCharacter) {
      setSelectedCharacter(live);
    }
  }, [characters, charactersLoading, selectedCharacter]);

  // Ficha pedida por el hash pero sin snapshot (ej: PWA cerrada y reabierta):
  // resolverla contra el catálogo en cuanto cargue.
  React.useEffect(() => {
    if (currentView !== 'character-detail' || selectedCharacter) return;
    if (charactersLoading) return;
    if (!initialHash.characterId) return;
    const match = characters.find((c) => c.id === initialHash.characterId);
    if (match) {
      setSelectedCharacter(match);
    } else {
      // El personaje ya no existe (o el hash está viejo): llevar al wiki.
      setCurrentView('personajes');
    }
  }, [currentView, selectedCharacter, characters, charactersLoading, initialHash]);

  // Al recuperar la vista tras recargar, empezar desde arriba.
  React.useEffect(() => {
    window.scrollTo(0, 0);
    // Intencional: solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derivamos los detalles del catálogo para que las ediciones y los ratings
  // se reflejen sin guardar copias obsoletas en el estado.
  const selectedComic = useMemo(
    // v0.9.9.4: el "id" guardado puede ser UUID (links viejos) o slug nuevo.
    () => findComicByRef(selectedComicId, comics),
    [comics, selectedComicId]
  );

  const selectedChapter = useMemo(() => {
    if (!selectedComic || !selectedChapterId) return null;
    // v0.9.9.4: resuelve UUID viejo o slug legible (tomo-N) por igual.
    const chapter = findChapterByRef(selectedComic, selectedChapterId);
    return chapter ? toChapterWithComic(chapter, selectedComic) : null;
  }, [selectedComic, selectedChapterId]);

  // Filtrado para la cuadrícula del feed de Inicio.
  // Las categorías "Novedad", "Éxitos" y "Más Descargados" son COMPORTAMIENTO
  // (fechas / rating / contador), no etiquetas estáticas:
  //  - Novedad → cómics recién creados (created_at), sin tocar el tag a mano.
  //  - Éxitos → mejor calificados.
  //  - Más Descargados → mayor contador de descargas.
  //  - Popular / Trending → siguen la etiqueta del cómic.
  // Si una categoría comportamental queda vacía (sin datos), cae al tag.
  const filteredHomeComics = useMemo(() => {
    if (selectedCategory === 'All') return comics;

    const byTag = comics.filter((comic) => comic.tag === selectedCategory);

    if (selectedCategory === 'Novedad') {
      const recent = [...comics]
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 16);
      return recent.length > 0 ? recent : byTag;
    }

    if (selectedCategory === 'Éxitos') {
      const top = [...comics]
        .filter((c) => (c.average_rating ?? 0) > 0)
        .sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0));
      return top.length > 0 ? top : byTag;
    }

    if (selectedCategory === 'Más Descargados') {
      const top = [...comics]
        .filter((c) => (c.download_count ?? 0) > 0)
        .sort((a, b) => (b.download_count ?? 0) - (a.download_count ?? 0));
      return top.length > 0 ? top : byTag;
    }

    return byTag;
  }, [comics, selectedCategory]);

  const handleOpenComicDetail = (comic: Comic) => {
    setSelectedComicId(comic.id);
    setCurrentView('comic-detail');
  };

  const handleOpenChapterDetail = (chapter: Chapter, comic: Comic) => {
    setSelectedComicId(comic.id);
    setSelectedChapterId(chapter.id);
    setCurrentView('chapter-detail');
  };

  // abrir un tomo por ID (lo usa Mi Biblioteca)
  const handleOpenChapterById = (comicId: string, chapterId: string) => {
    const comic = comics.find((c) => c.id === comicId);
    const chapter = comic?.chapters?.find((ch) => ch.id === chapterId);
    if (comic && chapter) handleOpenChapterDetail(chapter, comic);
    else if (comic) handleOpenComicDetail(comic);
  };

  // Sprint 3: abre el detalle de una lista propia o destacada
  const handleOpenListDetail = (list: ReadingListRow) => {
    setSelectedList(list);
    setCurrentView('list-detail');
  };

  // Sprint 5: abre la guía de lectura paso a paso de un evento
  const handleOpenEventDetail = (event: ReadingEvent) => {
    setSelectedEvent(event);
    setCurrentView('event-detail');
  };

  const handleEditComic = (comic: Comic) => {
    setComicToEdit(comic);
    setIsAdminFormOpen(true);
  };

  const handleDeleteComic = async (comic: Comic) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar "${comic.title}" y todos sus capítulos?`)) {
      await deleteComic(comic.id);
      setSelectedComicId(null);
      setSelectedChapterId(null);
      setCurrentView('inicio');
    }
  };

  const handleOpenNewComic = () => {
    setComicToEdit(null);
    setIsAdminFormOpen(true);
  };

  // Navegación central: cambia de vista y limpia las selecciones al salir de
  // las vistas de detalle. La usan la navbar y la barra inferior móvil.
  const handleNavigate = (view: CurrentView) => {
    setCurrentView(view);
    if (view !== 'comic-detail' && view !== 'chapter-detail' && view !== 'personajes' && view !== 'character-detail' && view !== 'profile' && view !== 'historial' && view !== 'list-detail' && view !== 'event-detail') {
      setSelectedComicId(null);
      setSelectedChapterId(null);
      setSelectedCharacter(null);
      setSelectedList(null);
      setSelectedEvent(null);
    }
  };

  // ── Buscador global ──
  const openFullSearch = (query: string) => {
    setSearchPageQuery(query);
    setIsSearchOpen(false);
    setCurrentView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openSearchProfile = (profileId: string) => {
    setIsSearchOpen(false);
    if (user && profileId === user.id) {
      setCurrentView('profile');
    } else {
      setSelectedProfileId(profileId);
      setCurrentView('public-profile');
    }
  };

  // Ctrl+K / Cmd+K abre la paleta de búsqueda desde cualquier vista
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Modo lectura inmersivo (v0.6): ChapterDetailPage avisa al entrar/salir y
  // aquí ocultamos Navbar y barra móvil para que el visor quede 100% limpio.
  const [isImmersiveReading, setIsImmersiveReading] = useState(false);
  useEffect(() => {
    if (currentView !== 'chapter-detail') setIsImmersiveReading(false);
  }, [currentView]);

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col font-sans selection:bg-accent selection:text-onaccent">
      {/* ===== AMBIENTE GLOBAL: luces y halftone detrás de toda la web ===== */}
      {/* Solo visible donde no hay superficies pintadas (fondo de página) */}
      <div className="pointer-events-none fixed inset-0 z-0 crow-dots opacity-40" aria-hidden="true" />
      <div className="pointer-events-none fixed -top-40 right-[-6rem] z-0 h-[28rem] w-[28rem] rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none fixed -bottom-48 left-[-8rem] z-0 h-[30rem] w-[30rem] rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
      {/* Notificaciones globales (Sprint 2.5) */}
      <ToastHost />
      {/* Splash "Sesión iniciada" (aparece al autentificarse en cualquier vista) */}
      <AuthSplash />
      {/* ===== PANTALLA DE BIENVENIDA (sin Navbar, pantalla completa) ===== */}
      {currentView === 'landing' ? (
        <LandingPage
          onEnterLibrary={() => setCurrentView('inicio')}
          onOpenProfile={() => setCurrentView('profile')}
          onOpenSignIn={() => {
            setAuthModalTab('signin');
            setIsAuthModalOpen(true);
          }}
          onOpenSignUp={() => {
            setAuthModalTab('signup');
            setIsAuthModalOpen(true);
          }}
        />
      ) : (
        <>
      {/* Navbar Superior con Pestañas Inicio / Cómics y Atajo Ctrl+Shift+A */}
      {!isImmersiveReading && (
        <Navbar
          comics={comics}
          currentView={currentView}
          onNavigate={handleNavigate}
          onSelectComic={handleOpenComicDetail}
          onOpenAuth={(tab) => {
            setAuthModalTab(tab ?? 'signin');
            setIsAuthModalOpen(true);
          }}
          onOpenProfile={() => setCurrentView('profile')}
          onOpenNewComic={handleOpenNewComic}
        />
      )}

      {/* Barra de búsqueda superior (glass) — fuera del <main> para quedar pegada arriba */}
      {!isImmersiveReading && currentView !== 'chapter-detail' && currentView !== 'search' && (
        <TopSearchBar onOpen={() => setIsSearchOpen(true)} />
      )}

      {/* Contenido Principal según Vista */}
      <main className={`box-border relative z-10 flex-1 min-w-0 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8 lg:max-w-none lg:w-auto lg:mx-0 ${isImmersiveReading ? 'lg:ml-0' : 'lg:ml-[4.5rem]'}`}>
        {error && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
            <div>
              <p className="font-semibold">Aviso de sincronización:</p>
              <p className="text-amber-300/80">{error}. Mostrando datos locales de respaldo.</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-mute">Cargando catálogo...</p>
          </div>
        ) : (
          <Suspense fallback={<ViewFallback />}>
            {currentView === 'comic-detail' && selectedComic ? (
          /* ======================================================== */
          /* VISTA 3: PÁGINA COMPLETA NUEVA DE DETALLE DEL CÓMIC       */
          /* ======================================================== */
          <ComicDetailPage
            comic={selectedComic}
            onBack={() => setCurrentView('inicio')}
            onEdit={handleEditComic}
            onDelete={handleDeleteComic}
            onOpenChapter={handleOpenChapterDetail}
          />
        ) : currentView === 'chapter-detail' && selectedChapter ? (
          /* ======================================================== */
          /* VISTA 4: PÁGINA COMPLETA DE DETALLE DEL TOMO INDIVIDUAL  */
          /* ======================================================== */
          <ChapterDetailPage
            chapter={selectedChapter}
            onBack={() => setCurrentView('comic-detail')}
            onSelectCharacter={(character) => {
              setSelectedCharacter(character);
              setCurrentView('character-detail');
            }}
            onOpenCharactersModal={(onUpdated) => {
              setChapterCharactersUpdatedCallback(() => onUpdated);
              setIsChapterCharactersModalOpen(true);
            }}
            onOpenChapter={handleOpenChapterDetail}
            onImmersiveChange={setIsImmersiveReading}
          />
        ) : currentView === 'list-detail' && selectedList ? (
          /* ======================================================== */
          /* VISTA 4.5: DETALLE DE LISTA / COLECCIÓN (Sprint 3)         */
          /* ======================================================== */
          <ListDetailPage
            list={selectedList}
            onBack={() => {
              setSelectedList(null);
              // Vuelve de donde vino: Inicio o Perfil
              setCurrentView('inicio');
            }}
            onSelectComic={handleOpenComicDetail}
            onExploreComics={() => handleNavigate('comics')}
          />
        ) : currentView === 'event-detail' && selectedEvent ? (
          /* ======================================================== */
          /* VISTA 4.6: GUÍA DE LECTURA PASO A PASO (Sprint 5)          */
          /* ======================================================== */
          <EventDetailPage
            event={selectedEvent}
            comics={comics}
            onBack={() => {
              setSelectedEvent(null);
              setCurrentView('comics');
            }}
            onSelectComic={handleOpenComicDetail}
          />
        ) : currentView === 'personajes' ? (
          /* ======================================================== */
          /* VISTA 5: PÁGINA DE PERSONAJES                              */
          /* ======================================================== */
          <CharactersPage
            onOpenManageModal={() => setIsCharactersModalOpen(true)}
            onOpenCreateModal={() => {
              setCharacterFormTargetId(null);
              setIsCharacterFormOpen(true);
            }}
            onSelectCharacter={(character) => {
              setSelectedCharacter(character);
              setCurrentView('character-detail');
            }}
          />
        ) : currentView === 'character-detail' && selectedCharacter ? (
          /* ======================================================== */
          /* VISTA 6: FICHA DE PERSONAJE INDIVIDUAL                      */
          /* ======================================================== */
          <CharacterDetailPage
            character={selectedCharacter}
            onBack={() => setCurrentView('personajes')}
            onSelectChapter={handleOpenChapterDetail}
            onSelectCharacter={(next) => setSelectedCharacter(next)}
            onOpenManageModal={() => {
              // Modal de ficha dedicado, precargado con ESTE personaje
              setCharacterFormTargetId(selectedCharacter.id);
              setIsCharacterFormOpen(true);
            }}
          />
        ) : currentView === 'public-profile' && selectedProfileId ? (
          /* ======================================================== */
          /* VISTA 7.5: PERFIL PÚBLICO de otro usuario (buscador)       */
          /* ======================================================== */
          <PublicProfilePage
            profileId={selectedProfileId}
            onBack={() => {
              setCurrentView('inicio');
              setSelectedProfileId(null);
            }}
            onSelectComic={handleOpenComicDetail}
          />
        ) : currentView === 'profile' || currentView === 'historial' ? (
          /* ======================================================== */
          /* VISTA 7: PERFIL DE USUARIO (FAVORITOS / LISTAS / HISTORIAL) */
          /* 'historial' = acceso directo desde la navbar a esa pestaña */
          /* ======================================================== */
          <ProfilePage
            onBack={() => setCurrentView('inicio')}
            onSelectComic={handleOpenComicDetail}
            onSelectChapter={handleOpenChapterDetail}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onOpenList={handleOpenListDetail}
            initialTab={currentView === 'historial' ? 'historial' : undefined}
            onOpenOnboarding={() => {
              setOnboardingDismissed(false);
              setForceOnboarding(true);
            }}
            onExploreComics={() => handleNavigate('comics')}
          />
        ) : currentView === 'roadmap' ? (
          /* ======================================================== */
          /* VISTA 8: ROADMAP INTERACTIVO (por versión, persistente)    */
          /* ======================================================== */
          <RoadmapView onBack={() => handleNavigate('inicio')} />
        ) : currentView === 'search' ? (
          /* ======================================================== */
          /* VISTA: BÚSQUEDA COMPLETA (Enter desde la paleta)          */
          /* ======================================================== */
          <SearchPage
            initialQuery={searchPageQuery}
            comics={comics}
            characters={characters}
            onSelectComic={handleOpenComicDetail}
            onSelectCharacter={(character) => {
              setSelectedCharacter(character);
              setCurrentView('character-detail');
            }}
            onSelectProfile={openSearchProfile}
            onBack={() => handleNavigate('inicio')}
          />
        ) : currentView === 'biblioteca' ? (
          /* ======================================================== */
          /* VISTA: MI BIBLIOTECA (estados de lectura del usuario)     */
          /* ======================================================== */
          <LibraryPage
            comics={comics}
            onOpenComic={handleOpenComicDetail}
            onOpenChapter={handleOpenChapterById}
            onOpenAuth={() => {
              setAuthModalTab('signin');
              setIsAuthModalOpen(true);
            }}
            onBack={() => handleNavigate('inicio')}
          />
        ) : currentView === 'solicitudes' ? (
          /* ======================================================== */
          /* VISTA: SOLICITUDES DE CÓMICS                             */
          /* ======================================================== */
          <ComicRequestsPage onBack={() => handleNavigate('inicio')} />
        ) : currentView === 'comics' ? (
          /* ======================================================== */
          /* VISTA 2: SECCIÓN CÓMICS (POR EDITORIALES MARVEL, DC, ETC) */
          /* ======================================================== */
          <ComicsCatalogView
            comics={comics}
            onSelectComic={handleOpenComicDetail}
            onSelectEvent={handleOpenEventDetail}
          />
        ) : (
          /* ======================================================== */
          /* VISTA 1: INICIO CON HERO FULL-BLEED ESTILO NETFLIX (TOP 5) */
          /* ======================================================== */
          <div className="space-y-10 animate-fade-in">
            {/* NOVEDADES FULL-BLEED (TOP 5 ÚLTIMOS TOMOS PUBLICADOS) */}
            <SteamHeroCarousel
              comics={comics}
              onSelectChapter={(chapter) => {
                const parentComic = comics.find(c => c.id === chapter.comic_id);
                if (parentComic) {
                  handleOpenChapterDetail(chapter, parentComic);
                }
              }}
              onSelectComic={handleOpenComicDetail}
              onExplorePublishers={() => setCurrentView('comics')}
            />

            {/* SPRINT 2: FILA "CONTINUAR LEYENDO" (solo usuarios con historial) */}
            <ContinueReadingRow
              onSelectChapter={handleOpenChapterDetail}
              onSelectComic={handleOpenComicDetail}
            />

            {/* SPRINT 3: FILA "COLECCIONES DEL SITIO" (listas is_featured) */}
            <FeaturedListsRow onSelectList={handleOpenListDetail} />

            {/* FEED GENERAL DE CÓMICS */}
            <div className="space-y-6">
              {/* Barra de Filtros por Categoría */}
              <CategoryBar
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                totalResults={filteredHomeComics.length}
              />

              {/* Cuadrícula de Cómics */}
              {filteredHomeComics.length === 0 ? (
                <div className="py-20 text-center rounded-3xl bg-surface/40 border border-line/60 p-8 space-y-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-raised text-mute">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-ink">No hay cómics en esta categoría</h3>
                    <p className="text-xs text-mute max-w-sm mx-auto">
                      Prueba seleccionando otra categoría para explorar más títulos.
                    </p>
                  </div>
                  {selectedCategory !== 'All' && (
                    <button
                      onClick={() => setSelectedCategory('All')}
                      className="text-xs text-accent font-semibold hover:underline"
                    >
                      Ver todos
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                  {filteredHomeComics.map((comic) => (
                    <ComicCard
                      key={comic.id}
                      comic={comic}
                      onClick={handleOpenComicDetail}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
            )}
          </Suspense>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-line/80 bg-bg py-8 pb-24 md:pb-8 text-center text-xs text-mute">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="flex items-center justify-center gap-1.5 text-mute">
            Desarrollado para la comunidad de cómics con <Heart className="w-3.5 h-3.5 text-accent fill-accent inline" />
          </p>
          <p className="text-[11px] text-mute">
            Todas las maquetaciones y traducciones pertenecen a sus respectivos fansubs y equipos de scanlation.
          </p>
        </div>
      </footer>

      {/* ── Barra inferior móvil estilo app nativa + volver arriba ── */}
      {!isImmersiveReading && (
        <MobileBottomNav
          currentView={currentView}
          onNavigate={handleNavigate}
          onOpenProfile={() => setCurrentView('profile')}
          onOpenNewComic={handleOpenNewComic}
        />
      )}
      <ScrollToTop />
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        comics={comics}
        characters={characters}
        onSelectComic={handleOpenComicDetail}
        onSelectCharacter={(character) => {
          setSelectedCharacter(character);
          setCurrentView('character-detail');
        }}
        onSelectProfile={openSearchProfile}
        onOpenFullSearch={openFullSearch}
      />
        </>
      )}

      {/* Modales de administración y autenticación (code-split, en Suspense) */}
      <Suspense fallback={null}>
        {/* Modal de Administración */}
        {isAdminFormOpen && (
          <ComicAdminFormModal
            isOpen={isAdminFormOpen}
            comicToEdit={comicToEdit}
            onClose={() => {
              setIsAdminFormOpen(false);
              setComicToEdit(null);
            }}
            onSave={saveComic}
          />
        )}

        {/* Modal de Gestión de Personajes (lista) */}
        {isCharactersModalOpen && (
          <CharactersAdminModal
            isOpen={isCharactersModalOpen}
            onClose={() => setIsCharactersModalOpen(false)}
            onOpenForm={(id) => {
              setIsCharactersModalOpen(false);
              setCharacterFormTargetId(id);
              setIsCharacterFormOpen(true);
            }}
          />
        )}

        {/* Modal de Ficha de Personaje (crear / editar con mini-wiki) */}
        {isCharacterFormOpen && (
          <CharacterFormModal
            isOpen={isCharacterFormOpen}
            onClose={() => setIsCharacterFormOpen(false)}
            characterId={characterFormTargetId}
          />
        )}

        {/* Modal de Personajes por Capítulo */}
        {isChapterCharactersModalOpen && selectedChapter && (
          <ChapterCharactersModal
            isOpen={isChapterCharactersModalOpen}
            chapterId={selectedChapter.id}
            onClose={() => {
              setIsChapterCharactersModalOpen(false);
              if (chapterCharactersUpdatedCallback) {
                chapterCharactersUpdatedCallback();
              }
            }}
          />
        )}
      </Suspense>

      {/* Acceso con Google / Autenticación */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          initialTab={authModalTab}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}

      {/* Sprint 4: Onboarding Wizard (cuenta nueva sin completar configuración) */}
      <OnboardingWizard
        isOpen={showOnboarding}
        profile={profile}
        onComplete={() => {
          setForceOnboarding(false);
          void refreshProfile();
          showToast('¡Perfil configurado con éxito!');
        }}
        onClose={() => {
          setForceOnboarding(false);
          setOnboardingDismissed(true);
          // Recordar el "omitir" también para futuras sesiones (por usuario)
          if (profile) {
            try {
              localStorage.setItem(`crow_onboarding_skip_${profile.id}`, '1');
            } catch { /* ignore */ }
          }
        }}
      />
    </div>
  );
};

export default App;
