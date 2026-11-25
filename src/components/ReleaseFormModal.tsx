/**
 * ReleaseFormModal (v0.11.0): alta/edición de un lanzamiento del calendario.
 * Permite vincular un cómic del catálogo para heredar título, editorial y
 * portada, o anunciar algo que todavía no está en el catálogo.
 */
import React, { useEffect, useState } from 'react';
import { CalendarClock, Link2, Loader2, Save, X } from 'lucide-react';
import type { Comic } from '../types/comic';
import { useAuth } from '../context/AuthContext';
import { Modal } from './ui/Modal';
import { ImageUploadField } from './ImageUploadField';
import { ComicPickerModal } from './ComicPickerModal';
import { showToast } from './ui/Toast';
import { proxyImageUrl } from '../lib/imageUrl';
import {
  createRelease,
  updateRelease,
  toLocalInput,
  fromLocalInput,
  type ReleaseItem,
} from '../lib/releases';

interface ReleaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** null = nuevo lanzamiento. */
  release: ReleaseItem | null;
  comics: Comic[];
  onSaved: () => void;
}

const inputCls =
  'w-full px-3 py-2 rounded-xl bg-bg border border-line focus:border-accent text-sm text-ink outline-none transition-colors placeholder:text-faint';

const Field: React.FC<{ label: string; children: React.ReactNode; col2?: boolean }> = ({
  label,
  children,
  col2,
}) => (
  <div className={`space-y-1 ${col2 ? 'sm:col-span-2' : ''}`}>
    <label className="text-[11px] font-semibold text-mute uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

const defaultDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return toLocalInput(d.toISOString());
};

export const ReleaseFormModal: React.FC<ReleaseFormModalProps> = ({
  isOpen,
  onClose,
  release,
  comics,
  onSaved,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [chapterLabel, setChapterLabel] = useState('');
  const [publisher, setPublisher] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [releaseAt, setReleaseAt] = useState(defaultDate());
  const [notes, setNotes] = useState('');
  const [comicId, setComicId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (release) {
      setTitle(release.title);
      setChapterLabel(release.chapter_label ?? '');
      setPublisher(release.publisher ?? '');
      setCoverUrl(release.cover_url ?? '');
      setReleaseAt(toLocalInput(release.release_at));
      setNotes(release.notes ?? '');
      setComicId(release.comic_id);
    } else {
      setTitle('');
      setChapterLabel('');
      setPublisher('');
      setCoverUrl('');
      setReleaseAt(defaultDate());
      setNotes('');
      setComicId(null);
    }
  }, [isOpen, release]);

  const selectedComic = comicId ? comics.find((c) => c.id === comicId) ?? null : null;

  const handlePickComic = (id: string | null) => {
    setComicId(id);
    setPickerOpen(false);
    if (!id) return;
    const comic = comics.find((c) => c.id === id);
    if (!comic) return;
    setTitle(comic.title);
    setPublisher(comic.publisher);
    setCoverUrl(comic.banner_url || comic.cover_url || '');
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Poné un título para el lanzamiento.');
      return;
    }
    const iso = fromLocalInput(releaseAt);
    if (!iso) {
      setError('Elegí una fecha y hora válidas.');
      return;
    }
    if (!user) {
      setError('Necesitás iniciar sesión.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = {
        comic_id: comicId,
        title,
        chapter_label: chapterLabel,
        publisher,
        cover_url: coverUrl,
        release_at: iso,
        notes,
      };
      if (release) await updateRelease(release.id, input);
      else await createRelease(input, user.id);
      showToast(release ? 'Lanzamiento actualizado ✅' : 'Lanzamiento agregado al calendario ✅', 'success');
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-line shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-ink truncate">
                {release ? 'Editar lanzamiento' : 'Nuevo lanzamiento'}
              </h2>
              <p className="text-[11px] text-faint">Aparece en el calendario público</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-raised hover:bg-line text-mute hover:text-ink transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Cómic vinculado */}
          <div className="rounded-xl border border-line bg-bg/50 p-3">
            {selectedComic ? (
              <div className="flex items-center gap-3">
                <img
                  src={proxyImageUrl(selectedComic.cover_url)}
                  alt=""
                  className="w-10 h-14 rounded-lg object-cover border border-line shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-ink truncate">{selectedComic.title}</p>
                  <p className="text-[10px] text-mute">{selectedComic.publisher}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setComicId(null)}
                  className="px-2.5 py-1.5 rounded-lg bg-raised hover:bg-line text-[11px] font-semibold text-mute transition-colors"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink">¿Ya está en el catálogo?</p>
                  <p className="text-[10px] text-faint">
                    Vinculalo y se llenan título, editorial y portada solos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 text-[11px] font-bold transition-colors shrink-0"
                >
                  <Link2 className="w-3.5 h-3.5" /> Vincular
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Título *" col2>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Deadpool vs. Thanos"
                className={inputCls}
                autoFocus
              />
            </Field>
            <Field label="Tomo / número">
              <input
                type="text"
                value={chapterLabel}
                onChange={(e) => setChapterLabel(e.target.value)}
                placeholder="Ej. Tomo #5"
                className={inputCls}
              />
            </Field>
            <Field label="Editorial">
              <input
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="Marvel, DC…"
                className={inputCls}
              />
            </Field>
            <Field label="Fecha y hora *">
              <input
                type="datetime-local"
                value={releaseAt}
                onChange={(e) => setReleaseAt(e.target.value)}
                className={inputCls}
              />
              <p className="text-[10px] text-faint">Hora de Colombia (GMT-5)</p>
            </Field>
            <Field label="Portada">
              <ImageUploadField label="Portada" value={coverUrl} onChange={setCoverUrl} compact />
            </Field>
            <Field label="Notas" col2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Opcional: detalles, extras, aviso de horario…"
                className={`${inputCls} resize-none`}
              />
            </Field>
          </div>

          {error && (
            <p className="text-[11px] text-accent2 bg-accent/10 border border-accent/30 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-line flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-raised hover:bg-line text-xs font-semibold text-mute hover:text-ink transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent2 text-onaccent text-xs font-bold transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </Modal>

      <ComicPickerModal
        isOpen={pickerOpen}
        comics={comics}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickComic}
        title="Vincular cómic al lanzamiento"
      />
    </>
  );
};
