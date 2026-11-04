import React, { useCallback, useEffect, useState } from 'react';
import type { Character } from '../types/comic';
import { X, Search, User, AlertCircle } from 'lucide-react';
import { useCharactersContext } from '../context/CharactersContext';
import { fetchChapterCharacterIds, setChapterCharacterAssigned } from '../lib/chapterCharacters';
import { matchesCharacterSearch } from '../lib/comicUtils';
import { Modal } from './ui/Modal';

interface ChapterCharactersModalProps {
  isOpen: boolean;
  chapterId: string;
  onClose: () => void;
}

export const ChapterCharactersModal: React.FC<ChapterCharactersModalProps> = ({
  isOpen,
  chapterId,
  onClose,
}) => {
  const { characters, loading } = useCharactersContext();
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAssigned = useCallback(async () => {
    setLoadingAssigned(true);
    try {
      setAssignedIds(await fetchChapterCharacterIds(chapterId));
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
  const filteredCharacters = characters.filter((character) =>
    matchesCharacterSearch(character, searchTerm),
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <User className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-black text-ink">Personajes en este Tomo</h2>
            <p className="text-xs text-mute">Asigna personajes a este capítulo específico</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-raised hover:bg-line text-mute text-ink transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute" />
          <input
            type="text"
            placeholder="Buscar personaje..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg border border-line focus:border-accent text-sm text-ink outline-none transition-colors"
          />
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/30 text-accent2 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-accent2" />
            <span>{error}</span>
          </div>
        )}

        {/* Personajes asignados */}
        {assignedCharacters.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-ink">
              Personajes Asignados ({assignedCharacters.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {assignedCharacters.map((character) => (
                <div
                  key={character.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/15 text-accent text-xs font-semibold border border-accent/30"
                >
                  <span>{character.name}</span>
                  <button
                    onClick={() => handleToggleCharacter(character)}
                    className="hover:text-accent2"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Todos los personajes */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-ink">Todos los Personajes</h3>
          {loading || loadingAssigned ? (
            <p className="text-xs text-mute">Cargando personajes...</p>
          ) : filteredCharacters.length === 0 ? (
            <p className="text-xs text-mute italic">No hay personajes disponibles</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
              {filteredCharacters.map((character) => {
                const assigned = isCharacterAssigned(character.id);
                return (
                  <button
                    key={character.id}
                    onClick={() => handleToggleCharacter(character)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      assigned
                        ? 'bg-accent/15 border-accent/30 text-accent'
                        : 'bg-surface border-line hover:border-line text-mute'
                    }`}
                  >
                    <div className="font-semibold text-xs">{character.name}</div>
                    {character.name_spanish && (
                      <div className="text-[10px] text-accent">{character.name_spanish}</div>
                    )}
                    {character.real_name && (
                      <div className="text-[10px] text-mute">{character.real_name}</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end p-6 border-t border-line">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-raised hover:bg-line text-mute text-xs font-semibold transition-colors"
        >
          <span>Cerrar</span>
        </button>
      </div>
    </Modal>
  );
};
