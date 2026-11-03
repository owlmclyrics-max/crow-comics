import React, { useMemo, useState } from 'react';
import type { Character } from '../types/comic';
import { User, Search, Edit3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCharactersContext } from '../context/CharactersContext';
import { matchesCharacterSearch } from '../lib/comicUtils';

interface CharactersPageProps {
  onOpenManageModal: () => void;
  onSelectCharacter: (character: Character) => void;
}

export const CharactersPage: React.FC<CharactersPageProps> = ({ onOpenManageModal, onSelectCharacter }) => {
  const { isAdmin } = useAuth();
  const { characters, loading } = useCharactersContext();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCharacters = useMemo(
    () => characters.filter((character) => matchesCharacterSearch(character, searchTerm)),
    [characters, searchTerm],
  );

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-zinc-400">Cargando personajes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-3">
            <User className="w-8 h-8 text-red-400" />
            <span>Personajes del Universo</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Explora todos los personajes de tus cómics favoritos
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={onOpenManageModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-zinc-950 font-bold text-xs shadow-lg shadow-red-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Edit3 className="w-4 h-4" />
            <span>Gestionar Personajes</span>
          </button>
        )}
      </div>

      {/* Buscador */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 -tranzinc-y-1/2 w-5 h-5 text-zinc-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, nombre real o editorial..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-red-500 text-sm text-zinc-100 outline-none transition-colors"
        />
      </div>

      {/* Grid de Personajes */}
      {filteredCharacters.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-zinc-900/40 border border-zinc-800 p-8 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800 text-zinc-400">
            <User className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-bold text-white">
              {searchTerm ? 'No se encontraron personajes' : 'No hay personajes aún'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {searchTerm
                ? 'Intenta con otro término de búsqueda'
                : isAdmin
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
              className="group flex flex-col items-center p-4 bg-zinc-900 border border-zinc-800 hover:border-red-500/50 rounded-2xl hover:shadow-2xl hover:shadow-red-950/40 transition-all duration-300 cursor-pointer transform hover:-tranzinc-y-1.5"
            >
              {/* Foto Circular del Personaje */}
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-zinc-950 border-2 border-zinc-700 group-hover:border-red-500/50 transition-colors">
                {character.photo_url ? (
                  <img
                    src={character.photo_url}
                    alt={character.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-950">
                    <User className="w-10 h-10 text-zinc-700" />
                  </div>
                )}
              </div>

              {/* Información del Personaje */}
              <div className="mt-4 text-center space-y-1 w-full">
                <h3 className="font-bold text-white text-sm leading-tight line-clamp-1 group-hover:text-red-400 transition-colors">
                  {character.name}
                </h3>
                {character.name_spanish && (
                  <p className="text-xs text-zinc-400 italic line-clamp-1">
                    {character.name_spanish}
                  </p>
                )}
                {character.real_name && (
                  <p className="text-[10px] text-zinc-500 line-clamp-1">
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
