import React, { useCallback, useEffect, useState } from 'react';
import type { Comment } from '../types/comic';
import { useComics } from '../context/ComicsContext';
import { useAuth } from '../context/AuthContext';
import { StarRating } from './ui/StarRating';
import { OPEN_AUTH_EVENT } from './FavoriteButton';
import { AlertCircle, LogIn, MessageSquare, Send, User } from 'lucide-react';

interface CommentsSectionProps {
  comicId: string;
  rating: number;
  onRatingChange: (rating: number) => void;
  showRatingInput?: boolean;
  heading?: string;
  subheading?: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  comicId,
  rating,
  onRatingChange,
  showRatingInput = false,
  heading = 'Comentarios',
  subheading = 'Lee y comparte opiniones sobre este cómic con la comunidad.',
}) => {
  const { addComment, getComments } = useComics();
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    const data = await getComments(comicId);
    setComments(data);
  }, [comicId, getComments]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    // Sprint 4: el nombre ya no se escribe a mano — sale de la cuenta.
    const fallbackName = (profile?.username?.trim() || user?.email || 'lector').split('@')[0];

    const result = await addComment(comicId, {
      user_id: user?.id,
      user_name: fallbackName,
      user_email: user?.email ?? undefined,
      content: content.trim(),
      rating,
    });

    if (result.success) {
      setContent('');
      onRatingChange(0);
      await loadComments();
    } else {
      setError(result.error ?? 'No se pudo publicar el comentario');
    }

    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-line pb-4">
        <h3 className="text-2xl font-black text-ink flex items-center gap-2.5">
          <MessageSquare className="w-6 h-6 text-accent" />
          <span>
            {heading} ({comments.length})
          </span>
        </h3>
        <p className="text-xs sm:text-sm text-mute mt-1">{subheading}</p>
      </div>

      <div className="bg-surface/60 border border-line rounded-2xl p-6 space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/30 text-accent2 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-accent2" />
            <span>{error}</span>
          </div>
        )}

        {!user ? (
          /* Sprint 4: comentar requiere cuenta */
          <div className="py-4 flex flex-col items-center text-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-raised flex items-center justify-center">
              <LogIn className="w-4.5 h-4.5 text-accent" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-ink">Comenta con tu cuenta</p>
              <p className="text-xs text-mute max-w-sm">
                Inicia sesión para publicar opiniones y calificar. Tu comentario aparecerá con el
                username de tu perfil.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_AUTH_EVENT))}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent2 text-onaccent text-xs font-bold shadow-lg shadow-accent/20 transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              Entrar / Crear cuenta
            </button>
          </div>
        ) : (
          <>
            <textarea
              placeholder={`Comentando como @${profile?.username?.trim() || (user.email ?? 'lector').split('@')[0]}...`}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-bg border border-line focus:border-accent text-sm text-ink outline-none transition-colors resize-none"
            />

            <div className="flex items-center justify-between flex-wrap gap-3">
              {showRatingInput && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-mute">Tu nota:</span>
                  <StarRating value={rating} onChange={onRatingChange} size="md" showValue />
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !content.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent2 text-onaccent font-bold text-xs shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ml-auto"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Enviando...' : 'Publicar Comentario'}</span>
              </button>
            </div>
          </>
        )}
      </div>

      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-surface/40 border border-line text-mute text-sm animate-fade-in">
            Aún no hay comentarios. ¡Sé el primero en opinar!
          </div>
        ) : (
          comments.map((comment, index) => (
            <div
              key={comment.id}
              className="bg-surface/40 border border-line rounded-2xl p-5 space-y-3 hover:border-accent smooth-transition animate-slide-in-left"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center">
                    <User className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink">{comment.user_name}</p>
                    <p className="text-xs text-faint">
                      {new Date(comment.created_at).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                {comment.rating ? <StarRating value={comment.rating} readOnly size="sm" /> : null}
              </div>
              <p className="text-sm text-mute leading-relaxed">{comment.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
