import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  deleteFollow,
  getFollows,
  insertFollow,
  markFollowSeen,
  type FollowRow,
} from '../lib/follows';

interface FollowsContextValue {
  /** Mapa comic_id → last_seen_at (ISO) del follow del usuario actual. */
  follows: ReadonlyMap<string, string>;
  isFollowing: (comicId: string) => boolean;
  /** Alterna follow con actualización optimista + reversión si falla la BD. */
  toggleFollow: (comicId: string) => void;
  /** Al visitar un cómic seguido: sus capítulos actuales dejan de contar como nuevos. */
  markSeen: (comicId: string) => void;
}

const FollowsContext = createContext<FollowsContextValue | undefined>(undefined);

export const FollowsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [follows, setFollows] = useState<Map<string, string>>(new Map());
  const [initialized, setInitialized] = useState(false);

  // Cargar los follows reales del usuario (una sola vez por sesión)
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    if (!user?.id) {
      setFollows(new Map());
      setInitialized(true);
      return;
    }

    getFollows(user.id).then((rows: FollowRow[]) => {
      if (cancelled) return;
      const map = new Map<string, string>();
      rows.forEach((row) => map.set(row.comic_id, row.last_seen_at));
      setFollows(map);
      setInitialized(true);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  const toggleFollow = useCallback(
    (comicId: string) => {
      if (!initialized || !user?.id) return;
      const wasFollowing = follows.has(comicId);
      const previous = follows.get(comicId);

      // 1) OPTIMISTA
      setFollows((prev) => {
        const next = new Map(prev);
        if (wasFollowing) next.delete(comicId);
        else next.set(comicId, new Date().toISOString());
        return next;
      });

      // 2) Confirmar contra Supabase; si falla, revertir
      const mutation = wasFollowing ? deleteFollow : insertFollow;
      void mutation(user.id, comicId).catch((err: unknown) => {
        console.warn('No se pudo guardar el follow, revirtiendo:', err);
        setFollows((prev) => {
          const next = new Map(prev);
          if (wasFollowing) {
            if (previous) next.set(comicId, previous);
          } else {
            next.delete(comicId);
          }
          return next;
        });
      });
    },
    [follows, initialized, user?.id],
  );

  const markSeen = useCallback(
    (comicId: string) => {
      if (!user?.id || !follows.has(comicId)) return;
      const nowIso = new Date().toISOString();
      setFollows((prev) => {
        if (!prev.has(comicId)) return prev;
        const next = new Map(prev);
        next.set(comicId, nowIso);
        return next;
      });
      void markFollowSeen(user.id, comicId).catch(() => {
        // Silencioso: si falla, la próxima visita lo reintenta.
      });
    },
    [follows, user?.id],
  );

  const isFollowing = useCallback((comicId: string) => follows.has(comicId), [follows]);

  return (
    <FollowsContext.Provider value={{ follows, isFollowing, toggleFollow, markSeen }}>
      {children}
    </FollowsContext.Provider>
  );
};

export const useFollows = (): FollowsContextValue => {
  const context = useContext(FollowsContext);
  if (!context) {
    throw new Error('useFollows debe usarse dentro de un FollowsProvider');
  }
  return context;
};
