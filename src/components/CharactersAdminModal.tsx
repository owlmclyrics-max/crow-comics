import React, { useState } from 'react';
import type { Character } from '../types/comic';
import { X, Trash2, Edit3, Image as ImageIcon, User, Search, AlertCircle, Plus } from 'lucide-react';
import { useCharactersContext } from '../context/CharactersContext';
import { matchesCharacterSearch } from '../lib/comicUtils';
import { Modal } from './ui/Modal';
import { showToast } from './ui/Toast';

interface CharactersAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Abre el modal de ficha (CharacterFormModal) que vive en App:
   *  - id = null → crear personaje nuevo
   *  - id = string → editar ese personaje
   * El modal de gestión se cierra para dejarle el lugar.
   */
  onOpenForm: (characterId: string | null) => void;
}

export const CharactersAdminModal: React.FC<CharactersAdminModalProps> = ({
  isOpen,
  onClose,
  onOpenForm,
}) => {
  const { characters, loading, deleteCharacter } = useCharactersContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleDeleteCharacter = async (character: Character) => {
    if (!window.confirm(`¿Estás seguro de eliminar a "${character.name}"?`)) return;

    setError(null);
    const result = await deleteCharacter(character.id);
    if (result.success) {
      showToast(`"${character.name}" eliminado del universo`);
    } else {
      setError(result.error ?? 'Error al eliminar personaje');
    }
  };

  const filteredCharacters = characters.filter((character) =>
    matchesCharacterSearch(character, searchTerm),
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between p-6 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <User className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-black text-ink">Gestionar Personajes</h2>
            <p className="text-xs text-mute">{characters.length} en el universo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenForm(null)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent2 text-onaccent font-bold text-xs shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Personaje</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-raised hover:bg-line text-mute hover:text-ink transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
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

        {/* Lista de personajes */}
        {loading ? (
          <div className="py-12 text-center text-mute text-sm">Cargando personajes...</div>
        ) : filteredCharacters.length === 0 ? (
          <div className="py-12 text-center rounded-2xl bg-surface/40 border border-line text-mute text-sm">
            {searchTerm ? 'No se encontraron personajes' : 'No hay personajes agregados aún'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCharacters.map((character) => (
              <div
                key={character.id}
                className="bg-surface/60 border border-line rounded-2xl p-4 space-y-3 hover:border-accent/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {character.photo_url ? (
                    <img
                      src={character.photo_url}
                      alt={character.name}
                      className="w-16 h-16 rounded-xl object-cover bg-bg"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-bg flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-faint" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-ink text-sm truncate">{character.name}</h4>
                    {character.name_spanish && (
                      <p className="text-xs text-accent truncate">{character.name_spanish}</p>
                    )}
                    {character.real_name && (
                      <p className="text-xs text-mute truncate">{character.real_name}</p>
                    )}
                    {character.species && (
                      <p className="text-[11px] text-faint truncate">{character.species}</p>
                    )}
                    {character.publisher && (
                      <p className="text-xs text-faint mt-1">{character.publisher}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onOpenForm(character.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-raised hover:bg-line text-ink text-xs font-semibold transition-colors border border-line"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => handleDeleteCharacter(character)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent2 text-xs font-semibold transition-colors border border-accent/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
