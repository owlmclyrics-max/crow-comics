import React, { useEffect, useState } from 'react';
import {
  Heart,
  ListVideo,
  History,
  ShieldCheck,
  Plus,
  Bookmark,
  Edit3,
  LogIn,
  Trash2,
  ArrowLeft,
  BookOpen,
  Code2,
  Sparkles,
  Award,
} from 'lucide-react';
import type { Comic, Chapter } from '../types/comic';
import { useAuth } from '../context/AuthContext';
import { useComics } from '../context/ComicsContext';
import { ListCard } from './ListCard';
import { ComicCard } from './ComicCard';
import { UserBadges } from './UserBadges';
import { EditProfileModal } from './EditProfileModal';
import { showToast } from './ui/Toast';
import {
  getFavorites,
  getReadingProgress,
  getReadingLists,
  getListItems,
  createReadingList,
  deleteReadingList,
  getPrivacySettings,
  savePrivacySettings,
  DEFAULT_PRIVACY,
  type FavoriteRow,
  type ReadingProgressRow,
  type ReadingListRow,
  type ReadingListItemRow,
  type PrivacySettings,
} from '../lib/profile';

export type ProfileTab = 'favoritos' | 'listas' | 'historial' | 'privacidad';

const TABS: { id: ProfileTab; label: string; icon: React.ElementType }[] = [
  { id: 'favoritos', label: 'Favoritos', icon: Heart },
  { id: 'listas', label: 'Listas', icon: ListVideo },
  { id: 'historial', label: 'Historial', icon: History },
  { id: 'privacidad', label: 'Ajustes de privacidad', icon: ShieldCheck },
];

interface ProfilePageProps {
  onBack: () => void;
  onSelectComic: (comic: Comic) => void;
  onSelectChapter: (chapter: Chapter, comic: Comic) => void;
  onOpenAuth: () => void;
  /** Sprint 3: abre el detalle de una lista (vista ListDetailPage). */
  onOpenList?: (list: ReadingListRow) => void;
  /** Pestaña con la que arranca (p. ej. 'historial' al entrar desde la navbar). */
  initialTab?: ProfileTab;
  /** Sprint 4 (dev): reabre el Onboarding Wizard para reconfigurar el perfil. */
  onOpenOnboarding?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onBack,
  onSelectComic,
  onSelectChapter,
  onOpenAuth,
  onOpenList,
  initialTab,
  onOpenOnboarding,
}) => {
  const { user, profile, refreshProfile, isAdmin } = useAuth();
  const { comics } = useComics();
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab ?? 'favoritos');

  // Si la navbar pide un salto directo a esta pestaña (ej. botón "Historial"),
  // el componente ya puede estar montado: reaccionamos al cambio del prop.
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Datos por pestaña
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [progress, setProgress] = useState<ReadingProgressRow[]>([]);
  const [lists, setLists] = useState<ReadingListRow[]>([]);
  const [listItems, setListItems] = useState<Record<string, ReadingListItemRow[]>>({});
  const [privacy, setPrivacy] = useState<PrivacySettings>(DEFAULT_PRIVACY);
  const [loading, setLoading] = useState(true);

  // Listas: creación y borrado
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);

  // Sprint 4: edición de perfil
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Carga inicial de todos los datos del perfil
  useEffect(() => {
    let cancelled = false;
    const loadAll = async () => {
      setLoading(true);
      if (!user?.id) {
        setFavorites([]);
        setProgress([]);
        setLists([]);
        setListItems({});
        setPrivacy(DEFAULT_PRIVACY);
        setLoading(false);
        return;
      }
      const [favRows, progressRows, listRows, privacySettings] = await Promise.all([
        getFavorites(user.id),
        getReadingProgress(user.id),
        getReadingLists(user.id),
        getPrivacySettings(user.id),
      ]);
      if (cancelled) return;
      setFavorites(favRows);
      setProgress(progressRows);
      setLists(listRows);
      setPrivacy(privacySettings);
      // Items de cada lista (para los collages de portadas)
      const itemsMap: Record<string, ReadingListItemRow[]> = {};
      await Promise.all(
        listRows.map(async (list) => {
          itemsMap[list.id] = await getListItems(list.id);
        }),
      );
      if (!cancelled) {
        setListItems(itemsMap);
        setLoading(false);
      }
    };
    void loadAll();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // --------------------------------- Sin sesión ---------------------------------
  if (!user) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center space-y-5 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <LogIn className="w-7 h-7 text-red-400" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-white">Inicia sesión para ver tu perfil</h2>
          <p className="text-xs text-zinc-400 max-w-xs">
            Favoritos, listas de lectura, historial e insignias te esperan.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAuth}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-zinc-950 text-xs font-bold shadow-lg transition-all active:scale-95"
        >
          <LogIn className="w-4 h-4" />
          Entrar / Crear cuenta
        </button>
      </div>
    );
  }

  // Datos derivados del encabezado (con fallbacks si aún no corre el SQL de profiles)
  const displayName =
    profile?.username?.trim() || (user.email ?? 'lector').split('@')[0] || 'lector';
  const handleAvatar = (user.email ?? '?').slice(0, 2).toUpperCase();

  const favoriteComics = favorites
    .map((fav) => comics.find((comic) => comic.id === fav.comic_id))
    .filter((comic): comic is Comic => Boolean(comic));

  const coverForList = (list: ReadingListRow): string[] =>
    (listItems[list.id] ?? [])
      .map((item) => comics.find((comic) => comic.id === item.comic_id)?.cover_url ?? '')
      .filter(Boolean);

  const handleCreateList = async () => {
    const name = newListName.trim();
    if (!name || !user.id) return;
    setCreatingList(true);
    try {
      const created = await createReadingList(user.id, name);
      if (created) {
        setLists((prev) => [...prev, created]);
        setListItems((prev) => ({ ...prev, [created.id]: [] }));
        setNewListName('');
        showToast(`Lista "${name}" creada`);
      }
    } catch (err) {
      showToast(`No se pudo crear la lista: ${err instanceof Error ? err.message : 'error desconocido'}`, 'error');
    } finally {
      setCreatingList(false);
    }
  };

  const handleDeleteList = async (list: ReadingListRow) => {
    if (!window.confirm(`¿Eliminar la lista "${list.name}"? Los cómics no se borran del catálogo.`)) return;
    await deleteReadingList(list.id);
    setLists((prev) => prev.filter((l) => l.id !== list.id));
    showToast(`Lista "${list.name}" eliminada`);
  };

  const handleSavePrivacy = async () => {
    if (!user.id) return;
    await savePrivacySettings(user.id, privacy);
    showToast('Ajustes de privacidad guardados');
  };

  // ── Sprint 4: XP y nivel del header (gamificación ligera) ──
  // Cada acción en la bóveda suma experiencia: favoritos 15, listas 25,
  // tomos con progreso 10. Cada nivel cuesta 100 XP.
  const xp = favorites.length * 15 + lists.length * 25 + progress.length * 10;
  const xpForLevel = (lvl: number) => lvl * 100;
  const level = Math.floor(xp / 100) + 1;
  const xpProgressPct = Math.min(100, Math.round(((xp % 100) / 100) * 100));
  const LEVEL_TITLES = [
    'Aprendiz del Cuervo',
    'Lector de Viñetas',
    'Coleccionista de la Bóveda',
    'Guardián del Corral',
    'Leyenda del Cuervo',
  ];
  const levelTitle = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
  // UserBadges aún no expone su conteo; "Novato" siempre está desbloqueada.
  const badgesUnlocked = 1;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ================================================================ */}
      {/* SPRINT 4: HEADER "HOGAR" — banner, avatar solapado, XP y stats    */}
      {/* ================================================================ */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60">
        {/* ── Banner decorativo ── */}
        <div className="relative h-32 sm:h-44">
          {/* Base de gradiente */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-950/70 via-zinc-950 to-zinc-950" />
          {/* Textura de medio punto (estilo historieta) */}
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
              backgroundSize: '14px 14px',
            }}
          />
          {/* Brillo rojo */}
          <div className="absolute -top-24 right-16 w-96 h-48 bg-red-600/25 blur-3xl rounded-full" />
          {/* Emblema del cuervo como marca de agua */}
          <img
            src={`${import.meta.env.BASE_URL}crow-emblem.png`}
            alt=""
            className="absolute right-6 sm:right-10 top-1/2 -translate-y-1/2 w-24 sm:w-32 opacity-15 pointer-events-none select-none"
            onError={(e) => { (e.currentTarget.style.display = 'none'); }}
          />
          {/* Desvanecido hacia el fondo */}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-zinc-950 to-transparent" />

          {/* Volver (sobre el banner) */}
          <button
            type="button"
            onClick={onBack}
            className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950/70 backdrop-blur border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver
          </button>
        </div>

        <div className="relative px-5 sm:px-8 pb-6 -mt-10 sm:-mt-12 space-y-5">
          {/* ── Fila principal: avatar solapado + identidad + acciones ── */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            {/* Avatar grande que sobresale del banner */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-3xl overflow-hidden border-4 border-zinc-950 shadow-xl shadow-black/60 bg-zinc-900">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget.parentElement?.querySelector('span') as HTMLElement | null)?.classList.remove('hidden');
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : null}
              <span
                className={`w-full h-full flex items-center justify-center text-3xl font-black text-white bg-gradient-to-br from-red-400 to-red-600 ${profile?.avatar_url ? 'hidden' : ''}`}
              >
                {handleAvatar}
              </span>
              {/* Aro rojo decorativo */}
              <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-red-500/30" />
            </div>

            <div className="flex-1 min-w-0 space-y-1 sm:pb-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight truncate drop-shadow">
                  @{displayName}
                </h1>
                {/* Chip de nivel con gradiente */}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase rounded-lg bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-950/60">
                  <Sparkles className="w-3 h-3" />
                  Nivel {level}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                <span className="text-red-400 font-semibold">{levelTitle}</span>
                {profile?.created_at && (
                  <> · En la bóveda desde{' '}
                    {new Date(profile.created_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </>
                )}
              </p>
            </div>

            {/* Acciones: Editar Perfil + botón dev de onboarding */}
            <div className="flex flex-col gap-2 sm:self-end shrink-0">
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-zinc-950 text-xs font-bold shadow-lg shadow-red-500/25 transition-all hover:scale-105 active:scale-95"
              >
                <Edit3 className="w-4 h-4" />
                Editar Perfil
              </button>
              {/* Modo dev: solo administradores (reabre el wizard de onboarding) */}
              {isAdmin && onOpenOnboarding && (
                <button
                  type="button"
                  onClick={onOpenOnboarding}
                  title="Modo desarrollador: reabrir el Onboarding Wizard (username, gustos y estilo de lectura)"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-700 hover:border-red-500/50 text-zinc-400 hover:text-red-400 text-[10px] font-bold transition-all active:scale-95"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Modo dev · Reconfigurar perfil
                </button>
              )}
            </div>
          </div>

          {/* ── Barra de XP hacia el siguiente nivel ── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
              <span className="text-zinc-500">Progreso del cuervo</span>
              <span className="text-red-400">
                {xp} / {xpForLevel(level + 1)} XP
              </span>
            </div>
            <div className="relative h-2.5 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-red-700 via-red-500 to-red-400 transition-all duration-700"
                style={{ width: `${xpProgressPct}%` }}
              />
              {/* Brillo animado sutil sobre la barra */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white/10 animate-pulse"
                style={{ width: `${xpProgressPct}%` }}
              />
            </div>
          </div>

          {/* ── Bio con estilo de cita ── */}
          {profile?.bio?.trim() ? (
            <blockquote className="border-l-2 border-red-500/60 pl-4 py-1">
              <p className="text-sm text-zinc-300 italic leading-relaxed">"{profile.bio.trim()}"</p>
            </blockquote>
          ) : (
            <p className="text-xs text-zinc-500 italic">
              Sin bio todavía — pulsa "Editar Perfil" y cuenta qué te mueve de los cómics.
            </p>
          )}

          {/* ── Tarjetas de estadísticas ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Heart, label: 'Favoritos', value: favorites.length, color: 'text-red-400 bg-red-500/10 border-red-500/30' },
              { icon: ListVideo, label: 'Listas', value: lists.length, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
              { icon: BookOpen, label: 'Tomos leídos', value: progress.length, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
              { icon: Award, label: 'Insignias', value: badgesUnlocked, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
            ].map((stat) => {
              const StatIcon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${stat.color}`}>
                    <StatIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-black text-white leading-none">{stat.value}</p>
                    <p className="text-[10px] text-zinc-500 mt-1 truncate">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Insignias (Sprint 4) ── */}
          {profile && <UserBadges profile={profile} />}
        </div>
      </section>

      {/* ================================================================ */}
      {/* PESTAÑAS                                                         */}
      {/* ================================================================ */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-zinc-900 text-red-400 border border-red-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-400">Cargando tu perfil...</p>
        </div>
      ) : (
        <>
          {/* ------------------------------ FAVORITOS ------------------------------ */}
          {activeTab === 'favoritos' && (
            favoriteComics.length === 0 ? (
              <div className="py-20 text-center rounded-3xl bg-zinc-900/40 border border-zinc-800/60 p-8 space-y-3 animate-fade-in">
                <Heart className="w-10 h-10 mx-auto text-zinc-700" />
                <h3 className="text-base font-bold text-white">Aún no tienes favoritos</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Toca el corazón en cualquier cómic para guardarlo aquí.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {favoriteComics.map((comic) => (
                  <ComicCard key={comic.id} comic={comic} onClick={onSelectComic} />
                ))}
              </div>
            )
          )}

          {/* ------------------------------ LISTAS ------------------------------ */}
          {activeTab === 'listas' && (
            <div className="space-y-6">
              {/* Crear lista */}
              <div className="flex items-center gap-2.5 max-w-md">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleCreateList(); }}
                  placeholder="Nombre de tu nueva lista..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-red-500 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={handleCreateList}
                  disabled={creatingList || !newListName.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-zinc-950 text-xs font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  {creatingList ? 'Creando...' : 'Crear'}
                </button>
              </div>

              {lists.length === 0 ? (
                <div className="py-16 text-center rounded-3xl bg-zinc-900/40 border border-zinc-800/60 p-8 space-y-3 animate-fade-in">
                  <ListVideo className="w-10 h-10 mx-auto text-zinc-700" />
                  <h3 className="text-base font-bold text-white">Sin listas todavía</h3>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Crea tu primera colección y añade cómics desde su ficha.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {lists.map((list) => (
                    <div key={list.id} className="relative group/list">
                      <ListCard
                        name={list.name}
                        description={list.description}
                        count={(listItems[list.id] ?? []).length}
                        coverUrls={coverForList(list)}
                        isFeatured={Boolean(list.is_featured)}
                        onClick={() => onOpenList?.(list)}
                      />
                      {/* X de borrado (aparece al hover) */}
                      <button
                        type="button"
                        onClick={() => void handleDeleteList(list)}
                        title={`Eliminar la lista "${list.name}"`}
                        className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-zinc-950/85 border border-zinc-700 text-zinc-300 hover:bg-red-500 hover:border-red-500 hover:text-zinc-950 transition-all shadow-lg opacity-0 group-hover/list:opacity-100 focus:opacity-100 active:scale-90"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ------------------------------ HISTORIAL ------------------------------ */}
          {activeTab === 'historial' && (
            progress.length === 0 ? (
              <div className="py-20 text-center rounded-3xl bg-zinc-900/40 border border-zinc-800/60 p-8 space-y-3 animate-fade-in">
                <History className="w-10 h-10 mx-auto text-zinc-700" />
                <h3 className="text-base font-bold text-white">Tu historial está vacío</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Abre cualquier tomo y aparecerá aquí para retomarlo donde lo dejaste.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {progress.map((row) => {
                  const comic = comics.find((c) => c.id === row.comic_id) ?? null;
                  const chapter = comic?.chapters?.find((ch) => ch.id === row.chapter_id) ?? null;
                  const chapterTitle = chapter ? chapter.title : `Capítulo ${row.chapter_number}`;
                  const sameTitleAsComic =
                    comic && chapterTitle.trim().toLowerCase() === comic.title.trim().toLowerCase();

                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => {
                        if (comic && chapter) onSelectChapter(chapter, comic);
                        else if (comic) onSelectComic(comic);
                      }}
                      className="w-full flex items-center gap-4 p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-red-500/50 transition-all text-left cursor-pointer group"
                    >
                      {/* Portada del tomo (fallback: portada de la serie) */}
                      <div className="w-12 h-18 aspect-[2/3] rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0">
                        <img
                          src={chapter?.cover_url || comic?.cover_url || ''}
                          alt={comic?.title ?? 'Cómic'}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate group-hover:text-red-400 transition-colors">
                          {comic?.title ?? 'Cómic eliminado'}
                        </h4>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Tomo {row.chapter_number}
                          {!sameTitleAsComic && chapter ? ` · ${chapter.title}` : ''}
                          {' · '}
                          {row.completed ? 'Completado' : 'En progreso'}
                        </p>
                        {/* Sprint 3.5: marcador de página manual */}
                        {row.page_number && row.page_number > 0 && (
                          <p className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-semibold mt-1">
                            <Bookmark className="w-2.5 h-2.5 fill-amber-400/40" />
                            Te quedaste en la página {row.page_number}
                          </p>
                        )}
                      </div>
                      <BookOpen className="w-4 h-4 text-zinc-600 group-hover:text-red-400 transition-colors shrink-0" />
                    </button>
                  );
                })}
              </div>
            )
          )}

          {/* ------------------------------ PRIVACIDAD ------------------------------ */}
          {activeTab === 'privacidad' && (
            <div className="max-w-2xl space-y-4">
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800/80">
                {(
                  [
                    { key: 'profilePublic', label: 'Perfil público', desc: 'Otros usuarios pueden ver tu perfil y tus listas.' },
                    { key: 'showFavorites', label: 'Mostrar favoritos', desc: 'Tu lista de favoritos es visible para los demás.' },
                    { key: 'showActivity', label: 'Mostrar actividad', desc: 'Se ve qué tomos estás leyendo.' },
                  ] as { key: keyof PrivacySettings; label: string; desc: string }[]
                ).map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">{setting.label}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{setting.desc}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={privacy[setting.key]}
                      onClick={() => setPrivacy((prev) => ({ ...prev, [setting.key]: !prev[setting.key] }))}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                        privacy[setting.key] ? 'bg-red-500' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          privacy[setting.key] ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleSavePrivacy}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-zinc-950 text-xs font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95"
              >
                Guardar ajustes
              </button>
            </div>
          )}
        </>
      )}

      {/* ================================================================ */}
      {/* SPRINT 4: MODAL DE EDICIÓN DE PERFIL                             */}
      {/* ================================================================ */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        profile={profile}
        onClose={() => setIsEditProfileOpen(false)}
        onSave={() => {
          void refreshProfile();
          showToast('Perfil actualizado');
        }}
      />
    </div>
  );
};
