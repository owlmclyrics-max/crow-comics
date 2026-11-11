import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Character } from '../types/comic';
import { X, User, AlertCircle, Check, Layers, Search } from 'lucide-react';
import { useCharactersContext } from '../context/CharactersContext';
import { useComics } from '../context/ComicsContext';
import {
  fetchChapterCast,
  setChapterCharacterAssigned,
  assignCharactersToChapters,
  setChapterCharacterVariant,
} from '../lib/chapterCharacters';
import type { ChapterCastEntry } from '../lib/chapterCharacters';
import { Modal } from './ui/Modal';
import { showToast } from './ui/Toast';

/** Busqueda sin tildes/mayusculas (ej: "spiderman" encuentra "Spider-Man"). */
const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

interface ChapterCharactersModalProps {
  isOpen: boolean;
  chapterId: string;
  onClose: () => void;
}

/**
 * Asignar personajes a un tomo. Estilo reparto: círculos con retrato para los
 * ya asignados (tócalos para quitar) y cuadrícula compacta de círculos para
 * elegir del wiki, con check en los asignados.
 */
export const ChapterCharactersModal: React.FC<ChapterCharactersModalProps> = ({
  isOpen,
  chapterId,
  onClose,
}) => {
  const { characters, loading } = useCharactersContext();
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  // v0.9.9: reparto por personaje con su variante elegida + variantes disponibles
  const [castEntries, setCastEntries] = useState<Record<string, ChapterCastEntry>>({});
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAssigned = useCallback(async () => {
    setLoadingAssigned(true);
    try {
      // v0.9.9: el reparto trae también la variante elegida por personaje y
      // las variantes disponibles de cada uno (para el selector del modal).
      const entries = await fetchChapterCast(chapterId);
      setAssignedIds(entries.map((entry) => entry.character.id));
      setCastEntries(
        Object.fromEntries(entries.map((entry) => [entry.character.id, entry])),
      );
    } catch (err: unknown) {
      console.error('Error cargando personajes asignados:', err);
      setError('No se pudieron cargar los personajes asignados');
    } finally {
      setLoadingAssigned(false);
    }
  }, [chapterId]);

  useEffect(() => {
    if (isOpen) {
      void loadAssigned();
    }
  }, [isOpen, loadAssigned]);

  const isCharacterAssigned = (characterId: string) => assignedIds.includes(characterId);

  const handleToggleCharacter = async (character: Character) => {
    const wasAssigned = isCharacterAssigned(character.id);
    setError(null);

    // Actualización optimista para evitar parpadeos en la lista.
    setAssignedIds((current) =>
      wasAssigned
        ? current.filter((id) => id !== character.id)
        : [...current, character.id],
    );

    try {
      await setChapterCharacterAssigned(chapterId, character.id, !wasAssigned);
    } catch (err: unknown) {
      console.error('Error actualizando personaje del tomo:', err);
      setError('No se pudo actualizar la asignación del personaje');

      // Revertimos el cambio si la escritura falla.
      setAssignedIds((current) =>
        wasAssigned
          ? [...current, character.id]
          : current.filter((id) => id !== character.id),
      );
    }
  };

  const assignedCharacters = characters.filter((character) =>
    assignedIds.includes(character.id),
  );

  // v0.9.9: elegir qué variante del personaje muestra el reparto de este tomo.
  const handleChooseVariant = async (characterId: string, variantId: string | null) => {
    const previous = castEntries[characterId]?.variant?.id ?? null;
    // Optimista
    setCastEntries((current) => {
      const entry = current[characterId];
      if (!entry) return current;
      return {
        ...current,
        [characterId]: {
          ...entry,
          variant: variantId
            ? (entry.variants.find((v) => v.id === variantId) ?? null)
            : null,
        },
      };
    });
    try {
      await setChapterCharacterVariant(chapterId, characterId, variantId);
      showToast(
        variantId
          ? 'El reparto de este tomo muestra la variante elegida'
          : 'El reparto vuelve a la versión principal',
        'success',
      );
    } catch (err: unknown) {
      console.error('Error eligiendo variante del reparto:', err);
      // Revertir
      setCastEntries((current) => {
        const entry = current[characterId];
        if (!entry) return current;
        return {
          ...current,
          [characterId]: {
            ...entry,
            variant: previous
              ? (entry.variants.find((v) => v.id === previous) ?? null)
              : null,
          },
        };
      });
      showToast(
        'No se pudo guardar la variante. ¿Ya corriste el SQL add-chapter-character-variant.sql?',
        'error',
      );
    }
  };

  // ── v0.9.9: buscador para filtrar la cuadrícula de personajes ──
  const [search, setSearch] = useState('');
  const normalizedSearch = useMemo(() => normalize(search), [search]);
  const matchingCharacters = useMemo(() => {
    if (!normalizedSearch) return characters;
    return characters.filter((character) =>
      [character.name, character.name_spanish, character.real_name, character.aliases]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .some((value) => normalize(value).includes(normalizedSearch)),
    );
  }, [characters, normalizedSearch]);

  // ── Aplicar a toda la serie: localiza el cómic de este tomo ──
  const { comics } = useComics();
  const parentComic = useMemo(
    () => comics.find((comic) => (comic.chapters ?? []).some((ch) => ch.id === chapterId)),
    [comics, chapterId],
  );
  const siblingChapterIds = useMemo(
    () => (parentComic?.chapters ?? []).map((ch) => ch.id),
    [parentComic],
  );
  const [isBulkApplying, setIsBulkApplying] = useState(false);

  const canApplyToSeries = Boolean(
    parentComic && siblingChapterIds.length > 1 && assignedCharacters.length > 0,
  );

  const handleApplyToSeries = async () => {
    if (!parentComic || isBulkApplying || assignedIds.length === 0) return;
    setIsBulkApplying(true);
    setError(null);
    try {
      await assignCharactersToChapters(siblingChapterIds, assignedIds);
      showToast(
        `Aplicado a los ${siblingChapterIds.length} tomos de "${parentComic.title}"`,
        'success',
      );
    } catch (err: unknown) {
      console.error('Error aplicando a toda la serie:', err);
      setError('No se pudo aplicar a toda la serie');
    } finally {
      setIsBulkApplying(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-3 p-5 border-b border-line">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-accent" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-ink">Personajes en este tomo</h3>
            <p className="text-[11px] text-mute">Toca un personaje para asignarlo o quitarlo</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl bg-raised hover:bg-line text-mute hover:text-ink transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
        {error && (
          <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/30 text-accent2 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-accent2" />
            <span>{error}</span>
          </div>
        )}

        {/* Asignados: fila horizontal estilo reparto */}
        {assignedCharacters.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-mute">
                Asignados ({assignedCharacters.length})
              </h3>
              {canApplyToSeries && (
                <button
                  type="button"
                  onClick={() => void handleApplyToSeries()}
                  disabled={isBulkApplying}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/15 border border-accent/40 text-accent text-[10px] font-bold hover:bg-accent hover:text-onaccent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={`Asigna estos ${assignedCharacters.length} personajes a los ${siblingChapterIds.length} tomos de la serie`}
                >
                  <Layers className="w-3 h-3" />
                  {isBulkApplying ? 'Aplicando...' : `Aplicar a toda la serie (${siblingChapterIds.length})`}
                </button>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {assignedCharacters.map((character) => {
                const entry = castEntries[character.id];
                return (
                  <div
                    key={character.id}
                    className="group/as relative shrink-0 flex flex-col items-center gap-1 w-16"
                  >
                    <button
                      type="button"
                      onClick={() => void handleToggleCharacter(character)}
                      title={`Quitar a ${character.name}`}
                      className="flex flex-col items-center gap-1 focus:outline-none w-16"
                    >
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-accent/60 bg-bg shrink-0 transition-colors group-hover/as:border-red-400/80">
                        {character.photo_url ? (
                          <img
                            src={character.photo_url}
                            alt={character.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-5 h-5 text-faint" />
                          </div>
                        )}
                      </div>
                      <span className="absolute top-0 right-0 w-5 h-5 rounded-full bg-raised border border-line items-center justify-center hidden group-hover/as:flex">
                        <X className="w-3 h-3 text-red-400" />
                      </span>
                      <p className="w-16 text-[10px] text-mute truncate group-hover/as:text-red-400 transition-colors">
                        {character.name}
                      </p>
                    </button>
                    {/* v0.9.9: selector de variante para el reparto de este tomo
                        (fuera del botón para que sus clics no lo alteren) */}
                    {entry?.variants?.length ? (
                      <select
                        value={entry.variant?.id ?? ''}
                        onChange={(e) =>
                          void handleChooseVariant(character.id, e.target.value || null)
                        }
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Versión de ${character.name} en este tomo`}
                        className="w-16 px-1 py-0.5 rounded-md bg-raised border border-line text-[8px] font-bold text-mute hover:text-ink focus:border-accent focus:outline-none cursor-pointer transition-colors"
                      >
                        <option value="">Principal</option>
                        {entry.variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Todos: buscador + cuadrícula compacta de círculos con check */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-mute">
              Todos los personajes
            </h3>
            <span className="text-[10px] text-faint">
              {matchingCharacters.length}/{characters.length}
            </span>
          </div>

          {/* v0.9.9: buscador — filtra por nombre, español, real o alias */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar personaje… (ignora tildes y guiones)"
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-bg border border-line text-xs text-ink placeholder-faint focus:border-accent focus:outline-none transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-mute hover:text-ink transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {loading || loadingAssigned ? (
            <p className="text-xs text-mute">Cargando personajes...</p>
          ) : characters.length === 0 ? (
            <p className="text-xs text-faint italic">Todavía no hay personajes en el wiki</p>
          ) : matchingCharacters.length === 0 ? (
            <p className="text-xs text-faint italic">
              Nadie coincide con "{search}". Probá con otra palabra.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-3 max-h-[45dvh] overflow-y-auto">
              {matchingCharacters.map((character) => {
                const assigned = isCharacterAssigned(character.id);
                return (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() => void handleToggleCharacter(character)}
                    aria-pressed={assigned}
                    className={`group/all relative flex flex-col items-center gap-1.5 p-2 rounded-2xl border text-center transition-all focus:outline-none ${
                      assigned
                        ? 'bg-accent/10 border-accent/50'
                        : 'bg-surface border-line hover:border-accent/40'
                    }`}
                  >
                    {assigned && (
                      <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-accent text-onaccent flex items-center justify-center shadow z-10">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                    <div
                      className={`w-14 h-14 rounded-full overflow-hidden border-2 bg-bg shrink-0 transition-colors ${
                        assigned
                          ? 'border-accent'
                          : 'border-line group-hover/all:border-accent/50'
                      }`}
                    >
                      {character.photo_url ? (
                        <img
                          src={character.photo_url}
                          alt={character.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-5 h-5 text-faint" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 w-full">
                      <p
                        className={`text-[11px] font-bold leading-tight line-clamp-1 transition-colors ${
                          assigned
                            ? 'text-accent'
                            : 'text-ink group-hover/all:text-accent'
                        }`}
                      >
                        {character.name}
                      </p>
                      {character.name_spanish && (
                        <p className="text-[9px] text-accent2 leading-tight line-clamp-1">
                          {character.name_spanish}
                        </p>
                      )}
                      {character.real_name && (
                        <p className="text-[9px] text-faint leading-tight line-clamp-1">
                          {character.real_name}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-end p-4 border-t border-line bg-raised/40">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center px-5 py-2.5 rounded-xl bg-accent hover:bg-accent2 text-onaccent text-xs font-bold transition-all active:scale-95"
        >
          Listo
        </button>
      </div>
    </Modal>
  );
};
