/**
 * MessagesPage (v0.10): el chat de Crow Comics.
 *
 * - PC: dos paneles — lista de conversaciones a la izquierda, chat a la derecha.
 * - Móvil: lista de conversaciones y, al entrar a una, el chat a pantalla
 *   completa con botón de volver.
 * - Tiempo real por Supabase Realtime (INSERT en dm_messages). Los mensajes
 *   propios muestran "Visto" cuando el otro abre el chat (read_at).
 * - "En línea / hace X" del otro usuario bajo su nombre (heartbeat).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldAlert,
  UserCircle,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { avatarOrFallback } from '../lib/avatarFallback';
import type { Profile } from '../types/comic';
import {
  fetchConversations,
  fetchSuggestedProfiles,
  fetchThread,
  markThreadRead,
  presenceOf,
  sendDmMessage,
  subscribeToDm,
  type DmConversation,
  type DmMessage,
  type SuggestedProfile,
} from '../lib/social';

interface MessagesPageProps {
  /** Conversación a abrir directamente (ej: botón "Mensaje" del perfil). */
  initialPartner?: string | null;
  onBack: () => void;
  /** Abre el perfil público del contacto desde el header del chat. */
  onSelectProfile: (profileId: string) => void;
}

const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d`;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
};

// ── v0.10.3: burbuja de amigo activo (estilo IG: avatar circular + nombre
//    debajo, click = abrir el chat directo) ──
const SuggestedBubble: React.FC<{
  p: SuggestedProfile;
  onClick: () => void;
}> = ({ p, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="shrink-0 w-[4.5rem] flex flex-col items-center gap-1.5 group py-1"
    title={`Chatear con @${p.username}`}
  >
    <span className="relative shrink-0">
      <img
        src={avatarOrFallback(p.avatar_url, p.id)}
        alt={p.username}
        className="w-14 h-14 rounded-full object-cover border border-line group-hover:border-accent transition-colors"
        referrerPolicy="no-referrer"
      />
      {p.online && (
        <span
          className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-surface"
          title="En línea"
        />
      )}
    </span>
    <span className="max-w-full text-[10px] font-bold text-mute truncate group-hover:text-ink transition-colors">
      {p.username}
    </span>
  </button>
);

export const MessagesPage: React.FC<MessagesPageProps> = ({
  initialPartner,
  onBack,
  onSelectProfile,
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<DmConversation[] | null>(null);
  const [error, setError] = useState('');
  const [partnerId, setPartnerId] = useState<string | null>(initialPartner ?? null);
  const [thread, setThread] = useState<DmMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const meId = user?.id ?? null;
  const [standalonePartner, setStandalonePartner] = useState<Profile | null>(null);

  // v0.10.3: "Hacé amigos" — perfiles activos sugeridos en la bandeja.
  const [suggested, setSuggested] = useState<SuggestedProfile[] | null>(null);

  useEffect(() => {
    if (!meId) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchSuggestedProfiles(meId);
        if (!cancelled) setSuggested(list);
      } catch {
        if (!cancelled) setSuggested(null); // sección silenciosa si falla
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meId]);

  // Chat NUEVO (sin mensajes): no está en la lista — traigo su perfil igual.
  useEffect(() => {
    if (!partnerId) {
      setStandalonePartner(null);
      return;
    }
    if (conversations?.some((c) => c.partner_id === partnerId)) {
      setStandalonePartner(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      if (!isSupabaseConfigured || !supabase) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id,username,avatar_url,last_seen_at')
          .eq('id', partnerId)
          .single();
        if (!cancelled) setStandalonePartner((data as Profile) ?? null);
      } catch {
        if (!cancelled) setStandalonePartner(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerId, conversations]);

  const partner = useMemo(() => {
    const conv = conversations?.find((c) => c.partner_id === partnerId);
    if (conv) return conv;
    if (standalonePartner && standalonePartner.id === partnerId) {
      return {
        partner_id: standalonePartner.id,
        username: standalonePartner.username,
        avatar_url: standalonePartner.avatar_url ?? null,
        last_seen_at: standalonePartner.last_seen_at ?? null,
        last_body: '',
        last_at: new Date().toISOString(),
        last_is_mine: false,
        unread: 0,
      } satisfies DmConversation;
    }
    return null;
  }, [conversations, partnerId, standalonePartner]);

  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchConversations();
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar las conversaciones');
    }
  }, []);

  // Lista de conversaciones + tiempo real global (siempre que hay sesión).
  useEffect(() => {
    if (!meId) return;
    void loadConversations();
    const unsubscribe = subscribeToDm(meId, () => void loadConversations(), () => void loadConversations());
    const poll = window.setInterval(() => void loadConversations(), 60_000);
    return () => {
      unsubscribe();
      window.clearInterval(poll);
    };
  }, [meId, loadConversations]);

  // Abre la conversación pedida cuando la lista llega.
  useEffect(() => {
    if (initialPartner && conversations) setPartnerId(initialPartner);
  }, [initialPartner, conversations]);

  // Thread + realtime del chat abierto + marcar como leído.
  useEffect(() => {
    if (!meId || !partnerId) {
      setThread([]);
      return;
    }
    let cancelled = false;
    setThreadLoading(true);

    const load = async () => {
      try {
        const msgs = await fetchThread(partnerId, meId);
        if (!cancelled) setThread(msgs);
        await markThreadRead(partnerId, meId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el chat');
      } finally {
        if (!cancelled) setThreadLoading(false);
      }
    };
    void load();

    const unsubscribe = subscribeToDm(
      meId,
      (msg) => {
        // Solo refresco si el mensaje es de ESTA conversación.
        if (msg.sender_id === partnerId || msg.recipient_id === partnerId) {
          setThread((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (msg.recipient_id === meId) void markThreadRead(partnerId, meId);
        }
      },
      () => void load(),
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [meId, partnerId]);

  // Auto-scroll al último mensaje.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread]);

  const handleSend = async () => {
    if (!meId || !partnerId || !draft.trim() || sending) return;
    setSending(true);
    try {
      await sendDmMessage(meId, partnerId, draft);
      setDraft('');
      const msgs = await fetchThread(partnerId, meId);
      setThread(msgs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar');
    } finally {
      setSending(false);
    }
  };

  // ── Sin sesión ──
  if (!meId) {
    return (
      <div className="py-24 text-center space-y-4 animate-fade-in">
        <MessageCircle className="w-10 h-10 mx-auto text-faint" />
        <h2 className="text-lg font-black text-ink">Mensajes</h2>
        <p className="text-xs text-mute max-w-sm mx-auto">
          Iniciá sesión para chatear con la comunidad Crow Comics.
        </p>
        <button
          onClick={onBack}
          className="text-xs text-accent font-semibold hover:underline"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  const partnerPresence = presenceOf(partner?.last_seen_at ?? null);

  return (
    <div className="animate-fade-in pb-4 lg:pb-0 lg:-mx-8 lg:-my-8">
      {error && (
        <div className="mb-3 rounded-xl bg-red-500/10 border border-red-500/40 px-3.5 py-2.5 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* v0.10.4: layout IG — columna izquierda fija con header + amigos +
          chats, y el chat a la derecha ocupando todo el alto en PC */}
      <div className="rounded-3xl border border-line bg-surface overflow-hidden lg:rounded-none lg:border-0 lg:h-[100svh] lg:grid lg:grid-cols-[340px_1fr]">
        {/* ── Lista de conversaciones (columna izquierda) ── */}
        <div
          className={`flex flex-col border-line lg:border-r bg-surface lg:h-full lg:min-h-0 ${
            partnerId ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="px-4 py-3.5 border-b border-line flex items-center justify-between shrink-0">
            <h2 className="text-sm font-black text-ink flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-accent2" />
              Mensajes
            </h2>
            <button
              type="button"
              onClick={() => void loadConversations()}
              className="p-1.5 rounded-lg text-mute hover:text-ink hover:bg-raised transition-colors"
              aria-label="Actualizar"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ── v0.10.3: Amigos — burbujas estilo IG arriba de la lista ── */}
          {suggested && suggested.length > 0 && (
            <div className="border-b border-line py-3 shrink-0">
              <h3 className="px-4 pb-2.5 text-[11px] font-black uppercase tracking-wider text-mute flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-accent2" />
                Amigos
              </h3>
              <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-thin">
                {suggested.map((p) => (
                  <SuggestedBubble key={p.id} p={p} onClick={() => setPartnerId(p.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Lista de chats con scroll propio (header y amigos quedan fijos) */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {conversations === null ? (
              <div className="py-16 text-center">
                <RefreshCw className="w-5 h-5 text-accent2 animate-spin mx-auto" />
                <p className="text-[11px] text-mute mt-2">Cargando conversaciones…</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-16 px-6 text-center space-y-2">
                <UserCircle className="w-8 h-8 text-faint mx-auto" />
                <p className="text-xs font-bold text-ink">Todavía no hay chats</p>
                <p className="text-[11px] text-mute leading-relaxed">
                  Elegí a alguien de la fila de amigos (arriba) o buscá un perfil y tocá{' '}
                  <strong>Mensaje</strong> para empezar a chatear.
                </p>
              </div>
            ) : (
            <div className="divide-y divide-line/60">
              {conversations.map((conv) => (
                <button
                  key={conv.partner_id}
                  type="button"
                  onClick={() => setPartnerId(conv.partner_id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    conv.partner_id === partnerId ? 'bg-raised' : 'hover:bg-raised/60'
                  }`}
                >
                  {(() => {
                    const src = avatarOrFallback(conv.avatar_url, conv.partner_id);
                    return (
                      <img
                        src={src}
                        alt={conv.username}
                        className="w-10 h-10 rounded-xl object-cover border border-line shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    );
                  })()}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-ink truncate">@{conv.username}</p>
                      <span className="text-[10px] text-faint shrink-0">
                        {relativeTime(conv.last_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-mute truncate">
                        {conv.last_is_mine ? 'Vos: ' : ''}
                        {conv.last_body}
                      </p>
                      {conv.unread > 0 && (
                        <span className="shrink-0 inline-flex items-center justify-center min-w-4.5 h-4.5 px-1.5 rounded-full bg-accent2 text-onaccent text-[9px] font-black">
                          {conv.unread > 99 ? '99+' : conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            )}
          </div>
        </div>

        {/* ── Chat ── */}
        <div className={`${partnerId ? 'flex flex-col' : 'hidden lg:flex'} flex-col lg:h-full lg:min-h-0`}>
          {partnerId && partner ? (
            <>
              {/* Header del chat */}
              <div className="px-4 py-3 border-b border-line flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setPartnerId(null)}
                  className="p-1.5 -ml-1.5 rounded-lg text-mute hover:text-ink hover:bg-raised transition-colors lg:hidden"
                  aria-label="Volver a la lista"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectProfile(partnerId)}
                  className="flex items-center gap-2.5 min-w-0 group"
                >
                  <img
                    src={avatarOrFallback(partner.avatar_url, partner.partner_id)}
                    alt={partner.username}
                    className="w-8 h-8 rounded-lg object-cover border border-line"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-bold text-ink truncate group-hover:underline">
                      @{partner.username}
                    </p>
                    <p
                      className={`text-[10px] font-semibold ${
                        partnerPresence.online ? 'text-emerald-400' : 'text-faint'
                      }`}
                    >
                      {partnerPresence.label || 'desconectado'}
                    </p>
                  </div>
                </button>
              </div>

              {/* Mensajes */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2 min-h-0">
                {threadLoading && thread.length === 0 ? (
                  <div className="py-12 text-center">
                    <RefreshCw className="w-5 h-5 text-accent2 animate-spin mx-auto" />
                  </div>
                ) : thread.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-[11px] text-mute">
                      Escribí el primer mensaje para @{partner.username} 👋
                    </p>
                  </div>
                ) : (
                  thread.map((msg) => {
                    const isMine = msg.sender_id === meId;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] px-3.5 py-2 rounded-2xl ${
                            isMine
                              ? 'bg-accent text-onaccent rounded-br-md'
                              : 'bg-raised border border-line text-ink rounded-bl-md'
                          }`}
                        >
                          <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                            {msg.body}
                          </p>
                          <div
                            className={`mt-0.5 flex items-center gap-1 justify-end text-[9px] ${
                              isMine ? 'text-onaccent/70' : 'text-faint'
                            }`}
                          >
                            {relativeTime(msg.created_at)}
                            {isMine &&
                              (msg.read_at ? (
                                <span title="Visto"><CheckCheck className="w-3 h-3" /></span>
                              ) : (
                                <span title="Enviado"><Check className="w-3 h-3" /></span>
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input */}
              <div className="p-3 border-t border-line flex items-center gap-2 shrink-0 bg-bg/50">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder={`Mensaje para @${partner.username}…`}
                  maxLength={2000}
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-surface border border-line focus:border-accent text-sm text-ink outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!draft.trim() || sending}
                  className="p-2.5 rounded-xl bg-accent hover:bg-accent2 text-onaccent transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Enviar mensaje"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : conversations?.length === 0 ? (
            /* ── v0.10.3: sin chats — estado vacío estilo IG ── */
            <div className="hidden lg:flex flex-1 flex-col items-center justify-center text-center px-8 space-y-3">
              <div className="w-24 h-24 rounded-full border-2 border-faint/40 flex items-center justify-center shrink-0">
                <MessageCircle className="w-10 h-10 text-faint" />
              </div>
              <h3 className="text-lg font-black text-ink">Tus mensajes</h3>
              <p className="text-xs text-mute max-w-sm leading-relaxed">
                Chateá en privado con la comunidad Crow. Elegí a alguien de la columna de amigos
                (a la izquierda) y arrancá la conversación 👋
              </p>
            </div>
          ) : (
            <div className="hidden lg:flex flex-1 flex-col items-center justify-center text-center px-8 space-y-3">
              <MessageCircle className="w-10 h-10 text-faint" />
              <h3 className="text-base font-bold text-ink">Elegí una conversación</h3>
              <p className="text-xs text-mute max-w-sm">
                Los mensajes son privados entre vos y la otra persona. Entrá a un perfil y tocá
                "Mensaje" para empezar uno nuevo.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
