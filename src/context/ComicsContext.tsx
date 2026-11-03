import React, { createContext, useContext } from 'react';
import { useComicsData } from '../hooks/useComics';

type ComicsContextValue = ReturnType<typeof useComicsData>;

const ComicsContext = createContext<ComicsContextValue | undefined>(undefined);

/**
 * Mantiene una única instancia del catálogo para toda la app.
 * Así las páginas de detalle no vuelven a descargar todos los cómics
 * y los comentarios/ratings actualizan la misma fuente de datos.
 */
export const ComicsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useComicsData();

  return <ComicsContext.Provider value={value}>{children}</ComicsContext.Provider>;
};

export const useComics = (): ComicsContextValue => {
  const context = useContext(ComicsContext);

  if (!context) {
    throw new Error('useComics debe usarse dentro de un ComicsProvider');
  }

  return context;
};
