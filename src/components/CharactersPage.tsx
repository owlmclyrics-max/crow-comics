import React, { useMemo, useState } from 'react';
import type { Character } from '../types/comic';
import { CrowAmbience } from './ui/CrowAmbience';
import { User, Search, Edit3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCharactersContext } from '../context/CharactersContext';
import { matchesCharacterSearch } from '../lib/comicUtils';

interface CharactersPageProps {
  onOpenManageModal: () => void;
  onSelectCharacter: (character: Character) => void;
}

export const CharactersPage: React.FC<CharactersPageProps> = ({ onOpenManageModal, onSelectCharacter }) => {
  const { canManageContent } = useAuth();
  const { characters, loading } = useCharactersContext();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCharacters = useMemo(
    () => characters.filter((character) => matchesCharacterSearch(character, searchTerm)),
    [characters, searchTerm],
  );

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-mute">Cargando personajes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header con ambiente Crow */}
      <div className="relative overflow-hidden rounded-3xl border border-line bg-bg p-5 sm:p-6">
        <CrowAmbience glow="right" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-ink flex items-center gap-3">
            <User className="w-8 h-8 text-accent" />
            <span>Personajes del Universo</span>
          </h1>
          <p className="text-sm text-mute mt-1">
            Explora todos los personajes de tus cómics favoritos
          </p>
        </div>

        {canManageContent && (
          <button
            onClick={onOpenManageModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent2 text-onaccent font-bold text-xs shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95"
          >
            <Edit3 className="w-4 h-4" />
            <span>Gestionar Personajes</span>
          </button>
        )}
        </div>
      </div>

      {/* Buscador */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mute" />
        <input
          type="text"
          placeholder="Buscar por nombre, nombre real o editorial..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-surface border border-line focus:border-accent text-sm text-ink outline-none transition-colors"
        />
      </div>

      {/* Grid de Personajes */}
      {filteredCharacters.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-surface/40 border border-line p-8 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-raised text-mute">
            <User className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-bold text-ink">
              {searchTerm ? 'No se encontraron personajes' : 'No hay personajes aún'}
            </h3>
            <p className="text-xs text-mute max-w-sm mx-auto">
              {searchTerm
                ? 'Intenta con otro término de búsqueda'
                : canManageContent
                  ? 'Agrega el primer personaje usando el botón de gestión'
                  : 'Pronto se agregarán personajes'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {filteredCharacters.map((character) => (
            <div
              key={character.id}
              onClick={() => onSelectCharacter(character)}
              className="group flex flex-col items-center p-4 bg-surface border border-line hover:border-accent/50 rounded-2xl hover:shadow-2xl hover:shadow-accent/40 transition-all duration-300 cursor-pointer transform hover:-translate-y-1.5"
            >
              {/* Foto Circular del Personaje */}
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-bg border-2 border-line group-hover:border-accent/50 transition-colors">
                {character.photo_url ? (
                  <img
                    src={character.photo_url}
                    alt={character.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-bg">
                    <User className="w-10 h-10 text-faint" />
                  </div>
                )}
              </div>

              {/* Información del Personaje */}
              <div className="mt-4 text-center space-y-1 w-full">
                <h3 className="font-bold text-ink text-sm leading-tight line-clamp-1 group-hover:text-accent transition-colors">
                  {character.name}
                </h3>
                {character.name_spanish && (
                  <p className="text-xs text-mute italic line-clamp-1">
                    {character.name_spanish}
                  </p>
                )}
                {character.real_name && (
                  <p className="text-[10px] text-faint line-clamp-1">
                    ({character.real_name})
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
