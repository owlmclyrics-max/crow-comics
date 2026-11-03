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
      <div className="flex items-center justify-between p-6 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
            <User className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Personajes en este Tomo</h2>
            <p className="text-xs text-zinc-400">Asigna personajes a este capítulo específico</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -tranzinc-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar personaje..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-red-500 text-sm text-zinc-100 outline-none transition-colors"
          />
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Personajes asignados */}
        {assignedCharacters.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">
              Personajes Asignados ({assignedCharacters.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {assignedCharacters.map((character) => (
                <div
                  key={character.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/30"
                >
                  <span>{character.name}</span>
                  <button
                    onClick={() => handleToggleCharacter(character)}
                    className="hover:text-rose-400"
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
          <h3 className="text-sm font-bold text-white">Todos los Personajes</h3>
          {loading || loadingAssigned ? (
            <p className="text-xs text-zinc-400">Cargando personajes...</p>
          ) : filteredCharacters.length === 0 ? (
            <p className="text-xs text-zinc-400 italic">No hay personajes disponibles</p>
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
                        ? 'bg-red-500/20 border-red-500/50 text-red-400'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div className="font-semibold text-xs">{character.name}</div>
                    {character.name_spanish && (
                      <div className="text-[10px] text-red-400">{character.name_spanish}</div>
                    )}
                    {character.real_name && (
                      <div className="text-[10px] text-zinc-400">{character.real_name}</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end p-6 border-t border-zinc-800">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
        >
          <span>Cerrar</span>
        </button>
      </div>
    </Modal>
  );
};
