import React, { createContext, useContext } from 'react';
import { useCharacters } from '../hooks/useCharacters';

type CharactersContextValue = ReturnType<typeof useCharacters>;

const CharactersContext = createContext<CharactersContextValue | undefined>(undefined);

/**
 * Comparte una única instancia del listado de personajes.
 * Así la página, el modal de gestión y el de asignación por tomo
 * se mantienen sincronizados tras crear o eliminar un personaje.
 */
export const CharactersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useCharacters();

  return <CharactersContext.Provider value={value}>{children}</CharactersContext.Provider>;
};

export const useCharactersContext = (): CharactersContextValue => {
  const context = useContext(CharactersContext);

  if (!context) {
    throw new Error('useCharactersContext debe usarse dentro de un CharactersProvider');
  }

  return context;
};
