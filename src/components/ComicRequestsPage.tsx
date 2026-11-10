import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Send, Loader2, Inbox } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  createComicRequest,
  getComicRequests,
  type ComicRequestRow,
  type ComicRequestState,
} from '../lib/requests';
import { showToast } from './ui/Toast';

interface ComicRequestsPageProps {
  onBack: () => void;
}

const STATUS_LABEL: Record<ComicRequestState, string> = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  agregado: 'Agregado 🎉',
  rechazado: 'Cancelado',
};

const STATUS_CLASS: Record<ComicRequestState, string> = {
  pendiente: 'bg-accent/15 text-accent border-accent/30',
  en_revision: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  agregado: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  rechazado: 'bg-raised text-mute border-line',
};

/**
 * v0.7: SOLICITUDES DE CÓMICS — pedí que subamos una serie y seguí el estado
 * de la petición. Necesita la tabla `comic_requests` (add-comic-requests.sql);
 * sin ella se guarda local (solo en este navegador).
 */
export const ComicRequestsPage: React.FC<ComicRequestsPageProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [publisher, setPublisher] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [rows, setRows] = useState<ComicRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [localOnly, setLocalOnly] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await getComicRequests({ userId: user.id });
    setRows(data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      showToast('Iniciá sesión para enviar tu solicitud', 'info');
      return;
    }
    const t = title.trim();
    if (t.length < 2) {
      showToast('Escribí el nombre del cómic', 'error');
      return;
    }
    setSending(true);
    try {
      const { row, storedRemote } = await createComicRequest({
        userId: user.id,
        title: t,
        publisher,
        notes,
      });
      setRows((prev) => [row, ...prev.filter((r) => r.id !== row.id)]);
      if (!storedRemote) setLocalOnly(true);
      setTitle('');
      setPublisher('');
      setNotes('');
      showToast('¡Solicitud enviada! 📩 la revisamos pronto', 'success');
    } catch {
      showToast('No se pudo enviar la solicitud', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-mute hover:bg-raised hover:text-ink transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 text-accent group-hover:-translate-x-1 transition-transform" />
          Volver
        </button>
        <div className="text-right">
          <h1 className="flex items-center justify-end gap-2 text-xl sm:text-2xl font-black text-ink">
            <Send className="w-5 h-5 text-accent" />
            Solicitar cómics
          </h1>
          <p className="text-[11px] text-mute mt-0.5">
            Pedí la serie que querés leer y la subimos para vos.
          </p>
        </div>
      </div>

      {/* Formulario */}
      <form
        onSubmit={submit}
        className="space-y-4 rounded-3xl border border-line bg-surface/40 p-5 sm:p-6"
      >
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-mute" htmlFor="req-title">
            Nombre del cómic o manga *
          </label>
          <input
            id="req-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Ultimate Spider-Man (2024)"
            className="w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm text-ink placeholder:text-faint focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/40"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-mute" htmlFor="req-pub">
            Editorial <span className="text-faint normal-case">(opcional)</span>
          </label>
          <input
            id="req-pub"
            type="text"
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
            placeholder="Marvel, DC, Kodansha…"
            className="w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm text-ink placeholder:text-faint focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/40"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-mute" htmlFor="req-notes">
            Detalles <span className="text-faint normal-case">(opcional)</span>
          </label>
          <textarea
            id="req-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Cómo lo conociste, tomos que querés, enlaces de referencia…"
            className="w-full resize-none rounded-xl border border-line bg-bg px-4 py-3 text-sm text-ink placeholder:text-faint focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/40"
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-black text-onaccent shadow-lg shadow-accent/20 transition-all hover:bg-accent2 active:scale-95 disabled:opacity-60 sm:w-auto"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {sending ? 'Enviando…' : 'Enviar solicitud'}
        </button>

        {localOnly && (
          <p className="text-[10px] text-amber-500">
            La tabla de solicitudes aún no está configurada en el servidor: tu petición quedó
            guardada solo en este navegador hasta la próxima migración.
          </p>
        )}
      </form>

      {/* Mis solicitudes */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-mute">
          Mis solicitudes
        </h2>
        {!user ? (
          <p className="rounded-2xl border border-line/60 bg-surface/40 px-4 py-6 text-center text-xs text-mute">
            Iniciá sesión para seguir el estado de tus solicitudes.
          </p>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-line/60 bg-surface/40 px-4 py-10 text-center space-y-2">
            <Inbox className="w-7 h-7 text-mute" />
            <p className="text-xs text-mute">
              Todavía no pediste nada — arriba podés enviar tu primera solicitud.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{r.title}</p>
                  <p className="text-[10px] text-mute">
                    {r.publisher ? `${r.publisher} · ` : ''}
                    {new Date(r.created_at).toLocaleDateString()}
                    {r.notes ? ' · con detalles' : ''}
                  </p>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${
                    STATUS_CLASS[r.status]
                  }`}
                >
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
