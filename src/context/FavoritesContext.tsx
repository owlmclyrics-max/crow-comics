import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getFavorites, toggleFavorite as toggleFavoriteInDb } from '../lib/profile';

interface FavoritesContextValue {
  /** Ids de cómics marcados como favoritos por el usuario actual. */
  favorites: ReadonlySet<string>;
  /** Alterna favorito. Si hay sesión, aplica la actualización OPTIMISTA:
   *  el corazón cambia al instante y confirma/corrige contra Supabase. */
  toggleFavorite: (comicId: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  // Cargar el set real de favoritos del usuario (una sola vez por sesión actual)
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    if (!user?.id) {
      setFavorites(new Set());
      setInitialized(true);
      return;
    }

    getFavorites(user.id).then((rows) => {
      if (!cancelled) {
        setFavorites(new Set(rows.map((row) => row.comic_id)));
        setInitialized(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  const toggleFavorite = useCallback(
    (comicId: string) => {
      if (!initialized) return;

      const wasFavorite = favorites.has(comicId);
      // 1) OPTIMISTA: actualizar el set al instante
      setFavorites((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(comicId);
        else next.add(comicId);
        return next;
      });

      // 2) Confirmar contra Supabase; si falla, revertir
      void toggleFavoriteInDb(user?.id ?? '', comicId).catch((err: unknown) => {
        console.warn('No se pudo guardar el favorito, revirtiendo:', err);
        setFavorites((prev) => {
          const next = new Set(prev);
          if (wasFavorite) next.add(comicId);
          else next.delete(comicId);
          return next;
        });
      });
    },
    [favorites, initialized, user?.id],
  );

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextValue => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites debe usarse dentro de un FavoritesProvider');
  }
  return context;
};
