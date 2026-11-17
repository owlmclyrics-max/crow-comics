/**
 * FeedPage (v0.10.1): el feed de Momentos — la parte "red social" pura.
 *
 * - Compositor: avatar + textarea + foto opcional (se comprime a WebP
 *   antes de subir al bucket "community") + botón Publicar.
 * - Feed: momentos de toda la comunidad, más nuevos primero, con ❤️
 *   (optimista, sin duplicados por PK) y comentarios expandibles.
 * - Cada uno puede borrar SU momento (tacho junto al suyo).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Heart,
  MessageCircle,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { avatarOrFallback } from '../lib/avatarFallback';
import {
  addPostComment,
  createFeedPost,
  deleteFeedPost,
  fetchFeed,
  fetchPostComments,
  togglePostLike,
  type FeedComment,
  type FeedPost,
} from '../lib/feed';
import { showToast } from './ui/Toast';

interface FeedPageProps {
  onBack: () => void;
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

const Avatar: React.FC<{ url: string | null; name: string; id?: string; size?: string }> = ({
  url,
  name,
  id,
  size = 'w-9 h-9 rounded-xl',
}) => {
  // Con id: fallback determinista (mismo avatar siempre para la misma persona).
  const src = id ? avatarOrFallback(url, id) : url;
  return src ? (
    <img
      src={src}
      alt={name}
      className={`${size} object-cover border border-line shrink-0`}
      referrerPolicy="no-referrer"
    />
  ) : (
    <div
      className={`${size} bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-[10px] font-black text-onaccent shrink-0`}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
};

export const FeedPage: React.FC<FeedPageProps> = ({ onBack, onSelectProfile }) => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());

  const meId = user?.id ?? null;
  const myUsername = profile?.username ?? 'vos';

  const load = useCallback(async () => {
    try {
      const data = await fetchFeed();
      setPosts(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el feed');
    }
  }, []);

  useEffect(() => {
    if (!meId) return;
    void load();
    const poll = window.setInterval(() => void load(), 45_000);
    return () => window.clearInterval(poll);
  }, [meId, load]);

  const handlePublish = async () => {
    if (!meId || !draft.trim() || publishing) return;
    setPublishing(true);
    try {
      await createFeedPost(meId, draft);
      setDraft('');
      showToast('Momento publicado 🦅', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo publicar', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleLike = async (post: FeedPost) => {
    if (!meId) return;
    // Optimista: actualizamos ya, el server confirma (si falla, revertimos).
    const nowLiked = !post.liked_by_me;
    setPosts((prev) =>
      (prev ?? []).map((p) =>
        p.id === post.id
          ? { ...p, liked_by_me: nowLiked, likes: p.likes + (nowLiked ? 1 : -1) }
          : p,
      ),
    );
    try {
      await togglePostLike(post.id, meId, post.liked_by_me);
    } catch (err) {
      setPosts((prev) =>
        (prev ?? []).map((p) =>
          p.id === post.id
            ? { ...p, liked_by_me: post.liked_by_me, likes: p.likes + (post.liked_by_me ? 1 : -1) }
            : p,
        ),
      );
      showToast(err instanceof Error ? err.message : 'No se pudo dar like', 'error');
    }
  };

  const toggleComments = async (postId: string) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
    if (!comments[postId]) {
      setLoadingComments((prev) => new Set(prev).add(postId));
      try {
        const list = await fetchPostComments(postId);
        setComments((prev) => ({ ...prev, [postId]: list }));
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'No se pudo leer los comentarios', 'error');
      } finally {
        setLoadingComments((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      }
    }
  };

  const handleComment = async (post: FeedPost) => {
    const text = (commentDraft[post.id] ?? '').trim();
    if (!meId || !text) return;
    try {
      await addPostComment(post.id, meId, text);
      setCommentDraft((prev) => ({ ...prev, [post.id]: '' }));
      const list = await fetchPostComments(post.id);
      setComments((prev) => ({ ...prev, [post.id]: list }));
      setPosts((prev) =>
        (prev ?? []).map((p) => (p.id === post.id ? { ...p, comments: list.length } : p)),
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo comentar', 'error');
    }
  };

  const handleDelete = async (post: FeedPost) => {
    if (!meId) return;
    try {
      await deleteFeedPost(post.id, meId);
      setPosts((prev) => (prev ?? []).filter((p) => p.id !== post.id));
      showToast('Momento borrado', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo borrar', 'error');
    }
  };

  // ── Sin sesión ──
  if (!meId) {
    return (
      <div className="py-24 text-center space-y-4 animate-fade-in">
        <Sparkles className="w-10 h-10 mx-auto text-faint" />
        <h2 className="text-lg font-black text-ink">Momentos</h2>
        <p className="text-xs text-mute max-w-sm mx-auto">
          Iniciá sesión para compartir y ver los momentos de la comunidad.
        </p>
        <button onClick={onBack} className="text-xs text-accent font-semibold hover:underline">
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in pb-16">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-ink flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          Momentos
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          className="text-[11px] font-bold text-mute hover:text-ink transition-colors"
        >
          Refrescar
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/40 px-3.5 py-2.5">
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* ── Compositor ── */}
      <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar url={profile?.avatar_url ?? null} name={myUsername} id={meId ?? undefined} />
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Reseñá el tomo que terminaste, recomendá algo, contá tu momento cómic…"
            rows={3}
            maxLength={1000}
            className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-bg border border-line focus:border-accent text-sm text-ink outline-none transition-colors resize-none placeholder:text-faint"
          />
        </div>

        <div className="ml-12 flex items-center justify-between gap-2">
          <span className="text-[10px] text-faint">
            {draft.length}/1000
          </span>
          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={!draft.trim() || publishing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent2 text-onaccent text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {publishing ? (
              <span className="w-3.5 h-3.5 border-2 border-onaccent border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Publicar
          </button>
        </div>
      </div>

      {/* ── Feed ── */}
      {posts === null ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-mute mt-2">Cargando momentos…</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-surface/40 border border-line p-8 space-y-2">
          <Sparkles className="w-8 h-8 text-faint mx-auto" />
          <h3 className="text-sm font-bold text-ink">El feed está vacío</h3>
          <p className="text-xs text-mute">
            Sé el primero en compartir un momento 🦅
          </p>
        </div>
      ) : (
        posts.map((post) => (
          <article key={post.id} className="rounded-2xl border border-line bg-surface overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 flex items-center gap-2.5">
              <button type="button" onClick={() => onSelectProfile(post.user_id)} className="shrink-0">
                <Avatar url={post.avatar_url} name={post.username} id={post.user_id} />
              </button>
              <button
                type="button"
                onClick={() => onSelectProfile(post.user_id)}
                className="min-w-0 text-left"
              >
                <p className="text-xs font-bold text-ink truncate hover:underline">@{post.username}</p>
                <p className="text-[10px] text-faint">{relativeTime(post.created_at)}</p>
              </button>
              {post.user_id === meId && (
                <button
                  type="button"
                  onClick={() => void handleDelete(post)}
                  className="ml-auto p-1.5 rounded-lg text-faint hover:text-red-400 hover:bg-raised transition-colors"
                  aria-label="Borrar mi momento"
                  title="Borrar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Contenido */}
            <p className="px-4 pb-3 text-sm text-ink whitespace-pre-wrap break-words">{post.body}</p>

            {/* Acciones */}
            <div className="px-4 py-2.5 flex items-center gap-4 border-t border-line/60 mt-2">
              <button
                type="button"
                onClick={() => void handleLike(post)}
                className={`inline-flex items-center gap-1.5 text-xs font-bold transition-colors ${
                  post.liked_by_me ? 'text-red-400' : 'text-mute hover:text-ink'
                }`}
              >
                <Heart className={`w-4 h-4 ${post.liked_by_me ? 'fill-red-400' : ''}`} />
                {post.likes}
              </button>
              <button
                type="button"
                onClick={() => void toggleComments(post.id)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-mute hover:text-ink transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {post.comments}
              </button>
            </div>

            {/* Comentarios */}
            {openComments.has(post.id) && (
              <div className="px-4 pb-3 pt-1 border-t border-line/60 space-y-2.5 bg-bg/40">
                {loadingComments.has(post.id) ? (
                  <p className="text-[11px] text-faint py-2">Cargando comentarios…</p>
                ) : (comments[post.id] ?? []).length > 0 ? (
                  <div className="space-y-2 pt-1">
                    {comments[post.id].map((comment) => (
                      <div key={comment.id} className="flex items-start gap-2">
                        <Avatar url={comment.avatar_url} name={comment.username} id={comment.user_id} size="w-6 h-6 rounded-lg" />
                        <div className="min-w-0">
                          <p className="text-[11px] leading-relaxed">
                            <button
                              type="button"
                              onClick={() => onSelectProfile(comment.user_id)}
                              className="font-bold text-ink hover:underline"
                            >
                              @{comment.username}
                            </button>{' '}
                            <span className="text-mute">{comment.body}</span>
                          </p>
                          <p className="text-[9px] text-faint">{relativeTime(comment.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-faint pt-1">Sin comentarios todavía.</p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={commentDraft[post.id] ?? ''}
                    onChange={(e) =>
                      setCommentDraft((prev) => ({ ...prev, [post.id]: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === 'Enter' && void handleComment(post)}
                    placeholder="Escribí un comentario…"
                    maxLength={500}
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-surface border border-line focus:border-accent text-xs text-ink outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => void handleComment(post)}
                    disabled={!(commentDraft[post.id] ?? '').trim()}
                    className="p-2 rounded-xl bg-accent hover:bg-accent2 text-onaccent transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Comentar"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </article>
        ))
      )}
    </div>
  );
};
