import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Character, Comic, Chapter } from '../types/comic';
import { CrowAmbience } from './ui/CrowAmbience';
import { ArrowLeft, BookOpen, Layers, User, ShieldCheck, AtSign, Dna, Globe, MapPin, Users, Swords, Skull, Zap, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useComics } from '../context/ComicsContext';
import { fetchCharacterChapterIds } from '../lib/chapterCharacters';
import { getAlignmentBadgeClass } from '../lib/constants';

interface CharacterDetailPageProps {
  character: Character;
  onBack: () => void;
  onSelectComic: (comic: Comic) => void;
  onSelectChapter: (chapter: Chapter, comic: Comic) => void;
  onOpenManageModal: () => void;
}

export const CharacterDetailPage: React.FC<CharacterDetailPageProps> = ({
  character,
  onBack,
  onSelectComic,
  onSelectChapter,
  onOpenManageModal
}) => {
  const { canManageContent } = useAuth();
  const { comics: allComics } = useComics();
  const [chapterIds, setChapterIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  // Cómic seleccionado: al hacer clic en una serie, se despliegan sus tomos
  const [selectedComicId, setSelectedComicId] = useState<string | null>(null);

  // Cargar los capítulos donde aparece el personaje (Supabase o modo local)
  const fetchCharacterStories = useCallback(async () => {
    setLoading(true);
    try {
      setChapterIds(await fetchCharacterChapterIds(character.id));
    } catch (err) {
      console.error('Error cargando historias:', err);
      setChapterIds([]);
    } finally {
      setLoading(false);
    }
  }, [character.id]);

  useEffect(() => {
    void fetchCharacterStories();
  }, [fetchCharacterStories]);

  // Derivamos capítulos y series del catálogo compartido, sin consultas extra.
  const chapters = useMemo(
    () =>
      allComics
        .flatMap((comic) => comic.chapters ?? [])
        .filter((chapter) => chapterIds.includes(chapter.id)),
    [allComics, chapterIds],
  );

  // Reset del cómic expandido al cambiar de personaje
  useEffect(() => {
    setSelectedComicId(null);
  }, [character.id]);

  const comics = useMemo(() => {
    const comicIds = new Set(chapters.map((chapter) => chapter.comic_id));
    return allComics.filter((comic) => comicIds.has(comic.id));
  }, [allComics, chapters]);

  const selectedComic = comics.find((comic) => comic.id === selectedComicId) ?? null;
  const selectedChapters = useMemo(
    () =>
      selectedComic
        ? chapters
            .filter((chapter) => chapter.comic_id === selectedComic.id)
            .sort((a, b) => a.chapter_number - b.chapter_number)
        : [],
    [chapters, selectedComic],
  );

  // Mini-wiki: listas guardadas con un elemento por línea
  const aliases = (character.aliases ?? '').split('\n').map((v) => v.trim()).filter(Boolean);
  const enemies = (character.enemies ?? '').split('\n').map((v) => v.trim()).filter(Boolean);
  const powers = (character.powers ?? '').split('\n').map((v) => v.trim()).filter(Boolean);
  const hasWiki = Boolean(
    character.species || character.universe || character.origin_place || character.creators ||
      character.weapon || aliases.length > 0 || enemies.length > 0 || powers.length > 0,
  );

  const wikiRow = (icon: React.ReactNode, label: string, value?: string) =>
    value ? (
      <div className="flex items-start gap-3 rounded-xl bg-bg/50 border border-line px-3.5 py-2.5">
        <span className="text-accent mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-faint">{label}</p>
          <p className="text-sm text-ink font-semibold leading-snug">{value}</p>
        </div>
      </div>
    ) : null;


  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface hover:bg-raised text-mute hover:text-ink border border-line transition-colors text-xs font-semibold group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-accent" />
          <span>Volver a Personajes</span>
        </button>

        {canManageContent && (
          <button
            onClick={onOpenManageModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface hover:bg-raised text-ink text-xs font-semibold transition-colors border border-line"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
            <span>Editar Personaje</span>
          </button>
        )}
      </div>

      {/* Ficha del Personaje */}
      <div className="relative rounded-3xl overflow-hidden border border-accent/25 bg-surface shadow-2xl smooth-transition-slow">
        {/* Fondo con desenfoque */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {character.photo_url ? (
            <img
              src={character.photo_url}
              alt={character.name}
              className="w-full h-full object-cover blur-3xl scale-125 opacity-20"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-transparent" />
        </div>
        {/* Ambiente Crow (puntos + resplandor + marca de agua) */}
        <CrowAmbience glow="right" tint="bold" />
        <div className="relative p-8 sm:p-12 flex flex-col md:flex-row items-center md:items-start gap-8 z-10">
          {/* Foto Circular del Personaje */}
          <div className="relative shrink-0">
            <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-line shadow-2xl bg-bg">
              {character.photo_url ? (
                <img
                  src={character.photo_url}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-bg">
                  <User className="w-20 h-20 text-faint" />
                </div>
              )}
            </div>
          </div>

          {/* Información del Personaje */}
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <h1 className="text-4xl sm:text-5xl font-black text-ink tracking-tight">
                {character.name}
              </h1>
              {character.name_spanish && (
                <p className="text-xl sm:text-2xl text-accent font-semibold mt-1">
                  {character.name_spanish}
                </p>
              )}
              {character.real_name && (
                <p className="text-sm text-mute italic mt-2">
                  ({character.real_name})
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              {character.alignment && (
                <span
                  className={`px-3 py-1 text-xs font-black uppercase rounded-lg border backdrop-blur-sm ${getAlignmentBadgeClass(character.alignment)}`}
                >
                  {character.alignment}
                </span>
              )}
              {character.publisher && (
                <span className="px-3 py-1 text-xs font-bold uppercase rounded-lg bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20">
                  {character.publisher}
                </span>
              )}
              {character.first_appearance && (
                <span className="px-3 py-1 text-xs text-mute bg-bg/80 rounded-lg border border-line">
                  Primera aparición: {character.first_appearance}
                </span>
              )}
            </div>

            {character.description && (
              <p className="text-sm sm:text-base text-mute leading-relaxed max-w-3xl bg-bg/60 p-4 sm:p-5 rounded-2xl border border-line text-left">
                {character.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* MINI-WIKI: ficha estilo Marvel (datos, poderes, enemigos, arma) */}
      {hasWiki && (
        <div className="space-y-5">
          <h3 className="flex items-center gap-2.5 text-2xl font-black text-ink">
            <Dna className="w-6 h-6 text-accent" />
            <span>Expediente</span>
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna izquierda: datos vitales */}
            <div className="space-y-3 rounded-3xl border border-line bg-surface p-6">
              <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-mute">
                <User className="w-3.5 h-3.5 text-accent" />
                Datos vitales
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {wikiRow(<Dna className="w-4 h-4" />, 'Especie', character.species)}
                {wikiRow(<Globe className="w-4 h-4" />, 'Universo', character.universe)}
                {wikiRow(<MapPin className="w-4 h-4" />, 'Lugar de origen', character.origin_place)}
                {wikiRow(<Users className="w-4 h-4" />, 'Creadores', character.creators)}
                {wikiRow(<BookOpen className="w-4 h-4" />, 'Primera aparición', character.first_appearance)}
                {aliases.length > 0 && (
                  <div className="flex items-start gap-3 rounded-xl bg-bg/50 border border-line px-3.5 py-2.5 sm:col-span-2">
                    <span className="text-accent mt-0.5 shrink-0">
                      <AtSign className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-faint">Alias</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {aliases.map((alias) => (
                          <span
                            key={alias}
                            className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-accent/10 text-accent2 border border-accent/25"
                          >
                            {alias}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Columna derecha: poderes */}
            {powers.length > 0 && (
              <div className="space-y-3 rounded-3xl border border-accent/25 bg-surface p-6">
                <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-mute">
                  <Zap className="w-3.5 h-3.5 text-accent" />
                  Poderes y habilidades
                </p>
                <ul className="space-y-2">
                  {powers.map((power) => (
                    <li key={power} className="flex items-start gap-2.5 text-sm text-mute">
                      <Zap className="w-3.5 h-3.5 text-accent mt-1 shrink-0" />
                      <span className="leading-snug">{power}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Fila inferior: enemigos + arma */}
          {(enemies.length > 0 || character.weapon) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {enemies.length > 0 && (
                <div className="space-y-3 rounded-3xl border border-line bg-surface p-6">
                  <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-mute">
                    <Skull className="w-3.5 h-3.5 text-accent" />
                    Enemigos principales
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {enemies.map((enemy) => (
                      <span
                        key={enemy}
                        className="px-3 py-1.5 text-xs font-bold rounded-full bg-raised text-ink border border-line"
                      >
                        {enemy}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {character.weapon && (
                <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-r from-accent/15 via-surface to-surface p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
                    <Swords className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-faint">
                      Arma principal
                    </p>
                    <p className="text-lg font-black text-ink leading-snug">{character.weapon}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Historias del Personaje */}
      <div className="space-y-8">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-mute">Cargando historias...</p>
          </div>
        ) : comics.length === 0 && chapters.length === 0 ? (
          <div className="py-20 text-center rounded-3xl bg-surface/40 border border-line p-8 space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-raised text-mute">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-ink">
                No hay apariciones registradas
              </h3>
              <p className="text-xs text-mute max-w-sm mx-auto">
                Este personaje aún no ha sido asignado a ningún tomo. Ve a la página de un capítulo y usa el botón "Asignar Personajes".
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Series donde aparece → clic despliega sus capítulos */}
            {comics.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-ink flex items-center gap-2.5">
                  <BookOpen className="w-6 h-6 text-accent" />
                  <span>Aparece en ({comics.length})</span>
                  {selectedComic && (
                    <span className="text-xs font-semibold text-mute mt-1.5 hidden sm:inline">
                      — toca otra serie para cambiar, o la ✕ para cerrar
                    </span>
                  )}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {comics.map((comic) => {
                    const chapterCount = chapters.filter((chapter) => chapter.comic_id === comic.id).length;
                    const isSelected = selectedComicId === comic.id;
                    return (
                      <div
                        key={comic.id}
                        onClick={() => setSelectedComicId(isSelected ? null : comic.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            setSelectedComicId(isSelected ? null : comic.id);
                          }
                        }}
                        className={`group relative bg-surface border rounded-2xl overflow-hidden hover:shadow-2xl transition-all cursor-pointer transform hover:-translate-y-1.5 ${
                          isSelected
                            ? 'border-accent shadow-xl shadow-accent/30 -translate-y-1'
                            : 'border-line hover:border-accent/50 hover:shadow-accent/40'
                        }`}
                      >
                        <div className="relative aspect-[2/3] w-full overflow-hidden bg-bg">
                          <img
                            src={comic.cover_url}
                            alt={comic.title}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent opacity-80" />

                          {/* Conteo de tomos con apariciones */}
                          <span className="absolute top-3 left-3 px-2 py-0.5 text-[10px] font-black uppercase rounded-lg bg-accent text-onaccent shadow-md flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {chapterCount} {chapterCount === 1 ? 'tomo' : 'tomos'}
                          </span>

                          {isSelected && (
                            <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-accent text-onaccent flex items-center justify-center shadow-lg">
                              <X className="w-4 h-4" />
                            </span>
                          )}
                        </div>

                        <div className="p-4">
                          <h4 className="font-bold text-ink text-base group-hover:text-accent transition-colors line-clamp-1">
                            {comic.title}
                          </h4>
                          {comic.original_title && (
                            <p className="text-xs text-mute italic line-clamp-1 mt-1">
                              {comic.original_title}
                            </p>
                          )}
                          <p className="flex items-center gap-1 text-[11px] font-semibold text-accent mt-2">
                            {isSelected ? 'Ocultar capítulos' : 'Ver capítulos donde aparece'}
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Panel desplegable: capítulos del cómic elegido */}
                {selectedComic && (
                  <div className="rounded-3xl border border-accent/25 bg-surface p-6 animate-fade-in shadow-xl shadow-accent/10">
                    <div className="flex items-center justify-between gap-4 pb-4 border-b border-line">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={selectedComic.cover_url}
                          alt={selectedComic.title}
                          className="w-10 h-[3.75rem] object-cover rounded-lg border border-line shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-widest text-faint">
                            Capítulos donde aparece
                          </p>
                          <h4 className="font-black text-ink truncate">{selectedComic.title}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelectComic(selectedComic);
                          }}
                          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-raised hover:bg-line text-ink text-xs font-semibold border border-line transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-accent" />
                          <span>Ir a la serie</span>
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedComicId(null);
                          }}
                          className="p-2 rounded-xl bg-raised hover:bg-line text-mute hover:text-ink transition-colors"
                          aria-label="Cerrar lista de capítulos"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                      {selectedChapters.map((chapter) => {
                        const parentComic = comics.find((item) => item.id === chapter.comic_id);
                        return (
                          <div
                            key={chapter.id}
                            onClick={() => {
                              if (parentComic) onSelectChapter(chapter, parentComic);
                            }}
                            className="group/ch flex items-center gap-3.5 rounded-2xl bg-bg/60 border border-line hover:border-accent/50 p-3 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/20"
                          >
                            <span className="w-11 h-11 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent font-black text-xs shrink-0">
                              #{chapter.chapter_number}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-ink group-hover/ch:text-accent transition-colors truncate">
                                {chapter.title}
                              </p>
                              <p className="text-[11px] text-mute mt-0.5">
                                {chapter.release_date
                                  ? `Publicado: ${chapter.release_date}`
                                  : `Tomo #${chapter.chapter_number}`}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-mute group-hover/ch:text-accent group-hover/ch:translate-x-1 transition-all shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
