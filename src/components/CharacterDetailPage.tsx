import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Character, Comic, Chapter } from '../types/comic';
import { ArrowLeft, BookOpen, Layers, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useComics } from '../context/ComicsContext';
import { fetchCharacterChapterIds } from '../lib/chapterCharacters';

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

  const comics = useMemo(() => {
    const comicIds = new Set(chapters.map((chapter) => chapter.comic_id));
    return allComics.filter((comic) => comicIds.has(comic.id));
  }, [allComics, chapters]);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors text-xs font-semibold group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-tranzinc-x-1 transition-transform text-red-400" />
          <span>Volver a Personajes</span>
        </button>

        {canManageContent && (
          <button
            onClick={onOpenManageModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition-colors border border-zinc-700"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
            <span>Editar Personaje</span>
          </button>
        )}
      </div>

      {/* Ficha del Personaje */}
      <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl smooth-transition-slow">
        {/* Fondo con desenfoque */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {character.photo_url ? (
            <img
              src={character.photo_url}
              alt={character.name}
              className="w-full h-full object-cover blur-3xl scale-125 opacity-20"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
        </div>

        <div className="relative p-8 sm:p-12 flex flex-col md:flex-row items-center md:items-start gap-8 z-10">
          {/* Foto Circular del Personaje */}
          <div className="relative shrink-0">
            <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-zinc-700/80 shadow-2xl bg-zinc-950">
              {character.photo_url ? (
                <img
                  src={character.photo_url}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-950">
                  <User className="w-20 h-20 text-zinc-700" />
                </div>
              )}
            </div>
          </div>

          {/* Información del Personaje */}
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {character.name}
              </h1>
              {character.name_spanish && (
                <p className="text-xl sm:text-2xl text-red-400 font-semibold mt-1">
                  {character.name_spanish}
                </p>
              )}
              {character.real_name && (
                <p className="text-sm text-zinc-400 italic mt-2">
                  ({character.real_name})
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              {character.publisher && (
                <span className="px-3 py-1 text-xs font-bold uppercase rounded-lg bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20">
                  {character.publisher}
                </span>
              )}
              {character.first_appearance && (
                <span className="px-3 py-1 text-xs text-zinc-300 bg-zinc-950/80 rounded-lg border border-zinc-800">
                  Primera aparición: {character.first_appearance}
                </span>
              )}
            </div>

            {character.description && (
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl bg-zinc-950/60 p-4 sm:p-5 rounded-2xl border border-zinc-800/80 text-left">
                {character.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Historias del Personaje */}
      <div className="space-y-8">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-zinc-400">Cargando historias...</p>
          </div>
        ) : comics.length === 0 && chapters.length === 0 ? (
          <div className="py-20 text-center rounded-3xl bg-zinc-900/40 border border-zinc-800 p-8 space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800 text-zinc-400">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-white">
                No hay apariciones registradas
              </h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Este personaje aún no ha sido asignado a ningún tomo. Ve a la página de un capítulo y usa el botón "Asignar Personajes".
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Cómics donde aparece (derivados de capítulos asignados) */}
            {comics.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-white flex items-center gap-2.5">
                  <BookOpen className="w-6 h-6 text-red-400" />
                  <span>Series ({comics.length})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {comics.map((comic) => (
                    <div
                      key={comic.id}
                      onClick={() => onSelectComic(comic)}
                      className="group relative bg-zinc-900 border border-zinc-800 hover:border-red-500/50 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-red-950/40 transition-all cursor-pointer transform hover:-tranzinc-y-1.5"
                    >
                      <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950">
                        <img
                          src={comic.cover_url}
                          alt={comic.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-white text-base group-hover:text-red-400 transition-colors line-clamp-1">
                          {comic.title}
                        </h4>
                        {comic.original_title && (
                          <p className="text-xs text-zinc-400 italic line-clamp-1 mt-1">
                            {comic.original_title}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Capítulos donde aparece */}
            {chapters.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-white flex items-center gap-2.5">
                  <Layers className="w-6 h-6 text-red-400" />
                  <span>Capítulos ({chapters.length})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {chapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className="bg-zinc-900 border border-zinc-800 hover:border-red-500/50 rounded-2xl p-4 hover:shadow-xl transition-all cursor-pointer group"
                      onClick={() => {
                        // Buscar el cómic padre
                        const parentComic = comics.find(c => c.id === chapter.comic_id);
                        if (parentComic) {
                          onSelectChapter(chapter, parentComic);
                        }
                      }}
                    >
                      <h4 className="font-bold text-white text-sm group-hover:text-red-400 transition-colors">
                        Capítulo #{chapter.chapter_number}: {chapter.title}
                      </h4>
                      {chapter.release_date && (
                        <p className="text-xs text-zinc-400 mt-1">
                          {chapter.release_date}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
