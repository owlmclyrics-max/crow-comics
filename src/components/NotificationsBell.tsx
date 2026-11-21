/**
 * NotificationsBell (v0.10.6): campana del centro de notificaciones.
 * Badge con la cantidad sin leer (en vivo por Realtime), dropdown con el
 * listado (avatar + acción + hace cuánto) y "Marcar todas leídas".
 * Al hacer click en un aviso te lleva: follow → perfil, mensaje → Mensajes,
 * like/comentario → Momentos.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { avatarOrFallback } from '../lib/avatarFallback';
import {
  fetchNotifications,
  fetchUnreadNotificationsCount,
  markAllNotificationsRead,
  subscribeToNotifications,
  type NotificationItem,
} from '../lib/notifications';

const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
};

interface NotificationsBellProps {
  /** follow → perfil del actor. */
  onSelectProfile: (profileId: string) => void;
  /** message → pantalla de Mensajes. */
  onOpenMessages: () => void;
  /** like/comment → feed de Momentos. */
  onOpenFeed: () => void;
}

export const NotificationsBell: React.FC<NotificationsBellProps> = ({
  onSelectProfile,
  onOpenMessages,
  onOpenFeed,
}) => {
  const { user } = useAuth();
  const meId = user?.id ?? null;
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loadCount = useCallback(async () => {
    if (!meId) return;
    setUnread(await fetchUnreadNotificationsCount(meId));
  }, [meId]);

  const loadList = useCallback(async () => {
    if (!meId) return;
    try {
      setItems(await fetchNotifications(meId));
    } catch {
      setItems([]);
    }
  }, [meId]);

  useEffect(() => {
    if (!meId) return;
    void loadCount();
    const unsubscribe = subscribeToNotifications(meId, () => void loadCount());
    const poll = window.setInterval(() => void loadCount(), 60_000);
    return () => {
      unsubscribe();
      window.clearInterval(poll);
    };
  }, [meId, loadCount]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void loadList();
  };

  const handleOpenItem = (n: NotificationItem) => {
    if (n.type === 'follow') onSelectProfile(n.actor_id);
    else if (n.type === 'message') onOpenMessages();
    else onOpenFeed();
    setOpen(false);
  };

  const handleMarkAll = async () => {
    if (!meId) return;
    await markAllNotificationsRead(meId);
    setUnread(0);
    setItems((prev) => (prev ?? []).map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  };

  if (!meId) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Notificaciones"
        aria-expanded={open}
        title="Notificaciones"
        className={`p-2 rounded-xl bg-surface hover:bg-raised text-mute hover:text-ink border transition-all active:scale-90 ${
          unread > 0 ? 'border-accent/40' : 'border-line'
        }`}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-accent2 text-onaccent text-[9px] font-black">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in lg:left-0 lg:right-auto lg:bottom-full lg:top-auto lg:mb-2 lg:mt-0">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <span className="text-xs font-bold text-ink">Notificaciones</span>
            <button
              type="button"
              onClick={() => void handleMarkAll()}
              disabled={unread === 0}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-mute hover:text-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar todas leídas
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-line/60">
            {items === null ? (
              <div className="py-8 text-center">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="w-6 h-6 text-faint mx-auto mb-2" />
                <p className="text-[11px] text-mute">Todo tranquilo por acá 🦅</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleOpenItem(n)}
                  className={`w-full flex items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-raised/60 ${
                    n.read_at ? '' : 'bg-accent/5'
                  }`}
                >
                  <img
                    src={avatarOrFallback(n.actor_avatar, n.actor_id)}
                    alt={n.actor_username}
                    className="w-8 h-8 rounded-lg object-cover border border-line shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] leading-snug text-mute">
                      <span className="font-bold text-ink">@{n.actor_username}</span>{' '}
                      {n.type === 'follow' && 'empezó a seguirte 🎉'}
                      {n.type === 'message' && `te escribió: ${n.body.slice(0, 60)}`}
                      {n.type === 'like' && 'le gustó tu momento ❤️'}
                      {n.type === 'comment' && `comentó tu momento: ${n.body.slice(0, 60)}`}
                    </span>
                    <span className="block text-[9px] text-faint mt-0.5">
                      {relativeTime(n.created_at)}
                    </span>
                  </span>
                  {!n.read_at && <Check className="w-3 h-3 text-accent shrink-0 mt-1" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
