
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchUnreadCount, subscribeToUnread } from '../lib/social';

/**
 * Globo de mensajes sin leer para el navbar.
 * Tiempo real (INSERT de mensajes para mí) + refresco cada 45s por si
 * algún evento se pierde (la marcar-leído viene por el otro canal).
 * Devuelve también `refresh()` para que la página de chat avise que
 * leyó todo.
 */
export function useDmUnread(meId: string | null): { unread: number; refresh: () => void } {
  const [unread, setUnread] = useState(0);
  const unreadRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!meId) return;
    const count = await fetchUnreadCount();
    unreadRef.current = count;
    setUnread(count);
  }, [meId]);

  useEffect(() => {
    if (!meId) {
      setUnread(0);
      unreadRef.current = 0;
      return;
    }

    void refresh();
    const poll = window.setInterval(() => void refresh(), 45_000);
    const unsubscribe = subscribeToUnread(meId, () => {
      // Optimista: cada INSERT destinado a mí suma 1; el poll corrige igual.
      unreadRef.current += 1;
      setUnread(unreadRef.current);
      void refresh();
    });

    return () => {
      window.clearInterval(poll);
      unsubscribe();
    };
  }, [meId, refresh]);

  return { unread, refresh: () => void refresh() };
}
