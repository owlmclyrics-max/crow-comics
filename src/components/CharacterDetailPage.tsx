import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Character, Comic, Chapter } from '../types/comic';
import { CrowAmbience } from './ui/CrowAmbience';
import { getAlignmentBadgeClass } from '../lib/constants';
import {
  ArrowLeft,
  BookOpen,
  Layers,
  User,
  ShieldCheck,
  AtSign,
  Dna,
  Globe,
  MapPin,
  Users,
  Swords,
  Skull,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useComics } from '../context/ComicsContext';
import { useCharactersContext } from '../context/CharactersContext';
import { characterNameMatches } from '../lib/comicUtils';
import { fetchCharacterChapterIds } from '../lib/chapterCharacters';

interface CharacterDetailPageProps {
  character: Character;
  onBack: () => void;
  onSelectChapter: (chapter: Chapter, comic: Comic) => void;
  onOpenManageModal: () => void;
  /** Abre la ficha de otro personaje (ej: al hacer clic en un enemigo). */
  onSelectCharacter?: (character: Character) => void;
}

export const CharacterDetailPage: React.FC<CharacterDetailPageProps> = ({
  character,
  onBack,
  onSelectChapter,
  onOpenManageModal,
  onSelectCharacter,
}) => {
  const { canManageContent } = useAuth();
  const { comics: allComics } = useComics();
  const { characters: allCharacters } = useCharactersContext();
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

  // Enemigos resueltos contra el wiki: los que tienen ficha van como reparto
  // clicable; los que no, quedan como chips de texto. La comparación ignora
  // mayúsculas, acentos y espacios ("yelena belova" ≡ "Yelena Bélova").
  const enemyEntries = useMemo(
    () =>
      enemies.map((enemy) => ({
        name: enemy,
        match: allCharacters.find(
          (c) => c.id !== character.id && characterNameMatches(c, enemy),
        ),
      })),
    [enemies, allCharacters, character.id],
  );
  const matchedEnemies = enemyEntries.filter((entry) => entry.match);
  const unmatchedEnemies = enemyEntries.filter((entry) => !entry.match);

  // Filas de datos del infobox (solo se muestran si tienen contenido)
  const infoRows = [
    { icon: <BookOpen className="w-4 h-4" />, label: 'Primera aparición', value: character.first_appearance },
    { icon: <Dna className="w-4 h-4" />, label: 'Especie', value: character.species },
    { icon: <Globe className="w-4 h-4" />, label: 'Universo', value: character.universe },
    { icon: <MapPin className="w-4 h-4" />, label: 'Lugar de origen', value: character.origin_place },
    { icon: <Users className="w-4 h-4" />, label: 'Creadores', value: character.creators },
  ].filter((row) => Boolean(row.value));

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Barra superior: volver + editar */}
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

      {/* ═══ WIKI: infobox a la derecha · contenido a la izquierda ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] xl:grid-cols-[1fr_22rem] gap-6 items-start">
        {/* ── INFOBOX: ficha a la derecha, sticky sin robar el scroll ── */}
        <aside className="lg:order-2 lg:sticky lg:top-20 self-start rounded-3xl overflow-hidden border border-accent/25 bg-surface shadow-2xl">
          {/* Retrato circular centrado, como la vista anterior */}
          <div className="relative bg-bg overflow-hidden">
            {/* Resplandor radial detrás de la foto */}
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <div className="w-56 h-56 rounded-full bg-accent/25 blur-3xl" />
            </div>

            <div className="relative flex flex-col items-center gap-5 px-5 pt-8 pb-6 text-center">
              <div className="relative">
                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-accent/40 ring-8 ring-accent/5 bg-surface shadow-2xl shadow-accent/25">
                  {character.photo_url ? (
                    <img
                      src={character.photo_url}
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-14 h-14 text-faint" />
                    </div>
                  )}
                </div>
                {character.alignment && (
                  <span
                    className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] font-black uppercase tracking-wide rounded-full border shadow-lg backdrop-blur-sm ${getAlignmentBadgeClass(character.alignment)}`}
                  >
                    {character.alignment}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black text-ink leading-tight">
                  {character.name}
                </h2>
                {character.name_spanish && (
                  <p className="text-sm font-bold text-accent">{character.name_spanish}</p>
                )}
                {character.real_name && (
                  <p className="text-xs text-mute italic">({character.real_name})</p>
                )}
                {character.publisher && (
                  <span className="inline-block px-3 py-1 mt-1.5 text-[10px] font-black uppercase tracking-widest rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/30">
                    {character.publisher}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Datos básicos */}
          <div className="p-5 space-y-4">
            {infoRows.length > 0 && (
              <div className="divide-y divide-line border-y border-line">
                {infoRows.map((row) => (
                  <div key={row.label} className="py-2.5 flex items-start gap-3">
                    <span className="text-accent mt-0.5 shrink-0">{row.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-faint">
                        {row.label}
                      </p>
                      <p className="text-sm font-semibold text-ink leading-snug">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {aliases.length > 0 && (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-mute">
                  <AtSign className="w-3 h-3 text-accent" /> Alias
                </p>
                <div className="flex flex-wrap gap-1.5">
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
            )}

            {character.weapon && (
              <div className="flex items-center gap-2.5 rounded-xl border border-accent/30 bg-accent/10 px-3.5 py-2.5">
                <Swords className="w-4 h-4 text-accent shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-faint">
                    Arma principal
                  </p>
                  <p className="text-xs font-bold text-ink leading-snug">{character.weapon}</p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── CONTENIDO PRINCIPAL ── */}
        <div className="space-y-6 lg:order-1 min-w-0">
          {/* Biografía (descripción larga) */}
          <section className="relative rounded-3xl border border-line bg-surface overflow-hidden">
            <CrowAmbience glow="right" />
            <div className="relative p-6 sm:p-8 space-y-3">
              <h3 className="flex items-center gap-2.5 text-xl font-black text-ink">
                <BookOpen className="w-5 h-5 text-accent" />
                Biografía
              </h3>
              {character.description ? (
                <p className="text-sm sm:text-[15px] text-mute leading-relaxed whitespace-pre-line break-words">
                  {character.description}
                </p>
              ) : (
                <p className="text-sm text-faint italic">
                  Aún no hay biografía para este personaje. Edita la ficha para agregar una.
                </p>
              )}
            </div>
          </section>

          {/* Poderes y habilidades (info larga) */}
          {powers.length > 0 && (
            <section className="rounded-3xl border border-accent/25 bg-surface p-6 sm:p-8">
              <h3 className="flex items-center gap-2.5 text-xl font-black text-ink pb-4">
                <Zap className="w-5 h-5 text-accent" />
                Poderes y habilidades
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {powers.map((power) => (
                  <li key={power} className="flex items-start gap-2.5 text-sm text-mute">
                    <Zap className="w-3.5 h-3.5 text-accent mt-1 shrink-0" />
                    <span className="leading-snug">{power}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Enemigos principales: fila horizontal estilo reparto */}
          {enemies.length > 0 && (
            <section className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
              <h3 className="flex items-center gap-2.5 text-xl font-black text-ink pb-4">
                <Skull className="w-5 h-5 text-accent" />
                Enemigos principales
              </h3>

              {/* Los que tienen ficha: círculos clicables como el reparto */}
              {matchedEnemies.length > 0 && (
                <div className="flex gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {matchedEnemies.map(({ name, match }) => (
                    <button
                      type="button"
                      key={name}
                      onClick={() => match && onSelectCharacter?.(match)}
                      className={`group/enemy flex w-24 shrink-0 flex-col items-center gap-2 text-center ${
                        onSelectCharacter ? 'cursor-pointer' : 'cursor-default'
                      }`}
                      aria-label={`Ver la ficha de ${name}`}
                      title={onSelectCharacter ? `Ir a la ficha de ${name}` : name}
                    >
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-line group-hover/enemy:border-red-400/70 bg-bg shrink-0 transition-colors shadow-lg">
                        {match?.photo_url ? (
                          <img
                            src={match.photo_url}
                            alt={name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover/enemy:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Skull className="w-8 h-8 text-faint" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-bold text-ink leading-tight line-clamp-2 group-hover/enemy:text-red-400 transition-colors">
                        {name}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* Los que no tienen ficha: chips de texto */}
              {unmatchedEnemies.length > 0 && (
                <div className={`flex flex-wrap gap-2 ${matchedEnemies.length > 0 ? 'pt-3 border-t border-line' : ''}`}>
                  {unmatchedEnemies.map(({ name }) => (
                    <span
                      key={name}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-raised text-ink border border-line"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Aparece en: cómics → capítulos ── */}
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-mute">Cargando historias...</p>
            </div>
          ) : comics.length === 0 ? (
            <div className="py-20 text-center rounded-3xl bg-surface/40 border border-line p-8 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-raised text-mute">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-ink">No hay apariciones registradas</h3>
                <p className="text-xs text-mute max-w-sm mx-auto">
                  Este personaje aún no ha sido asignado a ningún tomo. Ve a la página de un capítulo y usa el botón "Asignar Personajes".
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="flex items-center gap-2.5 text-xl font-black text-ink">
                <Layers className="w-5 h-5 text-accent" />
                <span>Aparece en ({comics.length})</span>
              </h3>

              {selectedComic ? (
                /* Nivel 2: capítulos del cómic elegido — fila horizontal estilo reparto */
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedComicId(null)}
                      className="p-2 rounded-xl bg-raised hover:bg-line text-mute hover:text-ink border border-line transition-colors shrink-0"
                      aria-label="Volver a los cómics"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-faint">
                        Capítulos donde aparece
                      </p>
                      <h4 className="font-black text-ink truncate">{selectedComic.title}</h4>
                    </div>
                  </div>

                  <div className="flex gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {selectedChapters.map((chapter) => (
                      <button
                        key={chapter.id}
                        type="button"
                        onClick={() => onSelectChapter(chapter, selectedComic)}
                        className="group/ch flex w-28 sm:w-32 shrink-0 flex-col items-center gap-2 text-center"
                        aria-label={`Leer ${chapter.title}`}
                      >
                        <div className="relative w-28 sm:w-32 aspect-[2/3] rounded-xl overflow-hidden border-2 border-line group-hover/ch:border-accent/80 bg-bg shrink-0 shadow-lg transition-colors">
                          <img
                            src={chapter.cover_url || selectedComic.cover_url}
                            alt={chapter.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover/ch:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-bg/90 border border-accent/40 text-accent text-[9px] font-black">
                            #{chapter.chapter_number}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-ink leading-tight line-clamp-2 group-hover/ch:text-accent transition-colors">
                          {chapter.title}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Nivel 1: cómics compactos en fila horizontal */
                <div className="flex gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {comics.map((comic) => {
                    const chapterCount = chapters.filter((chapter) => chapter.comic_id === comic.id).length;
                    return (
                      <button
                        key={comic.id}
                        type="button"
                        onClick={() => setSelectedComicId(comic.id)}
                        className="group/cast flex w-28 sm:w-32 shrink-0 flex-col items-center gap-2 text-center"
                        aria-label={`Ver capítulos de ${comic.title}`}
                      >
                        <div className="relative w-28 sm:w-32 aspect-[2/3] rounded-xl overflow-hidden border-2 border-line group-hover/cast:border-accent/80 bg-bg shrink-0 shadow-lg transition-colors">
                          <img
                            src={comic.cover_url}
                            alt={comic.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover/cast:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-accent text-onaccent text-[9px] font-black shadow flex items-center gap-1">
                            <Layers className="w-2.5 h-2.5" />
                            {chapterCount}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-ink leading-tight line-clamp-2 group-hover/cast:text-accent transition-colors">
                          {comic.title}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
