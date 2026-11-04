import React, { useCallback, useEffect, useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  ListOrdered,
  ArrowUp,
  ArrowDown,
  Loader2,
  Image as ImageIcon,
  Pencil,
  AlertCircle,
  Check,
  Lock
} from 'lucide-react';
import type { ReadingEvent, ReadingEventItem } from '../types/comic';
import { PUBLISHERS } from '../lib/constants';
import { useComics } from '../context/ComicsContext';
import { showToast } from './ui/Toast';
import { Modal } from './ui/Modal';
import { ComicPickerModal } from './ComicPickerModal';
import {
  deleteEvent,
  getEventItems,
  getEvents,
  saveEvent,
  saveEventItems,
  type EventItemInput
} from '../lib/events';

interface EventsAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Notifica al catálogo para refrescar la lista tras guardar/borrar. */
  onSaved?: () => void;
}

/** Paso editable del orden de lectura (en memoria hasta guardar). */
interface DraftItem {
  key: string;               // clave local para el render
  position: number;
  comic_id: string | null;   // null = "Próximamente"
  title: string;             // etiqueta del paso
  is_optional: boolean;
}

const EMPTY_ITEMS: DraftItem[] = [];

/**
 * Modal de administración de Guías de Lectura (Sprint 5):
 * crea/edita/borra eventos y su orden de lectura paso a paso.
 * Recomendaciones integradas:
 *  - Posiciones en múltiplos de 10 para insertar pasos después sin renumerar.
 *  - comic_id opcional: pasos publicables hoy aunque el cómic aún no exista
 *    (aparecen como "Próximamente" y el botón Leer aparece al enlazarlo).
 *  - Etiqueta propia (title) por paso para dar contexto de lectura.
 */
export const EventsAdminModal: React.FC<EventsAdminModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const { comics } = useComics();

  // Lista de eventos existentes
  const [events, setEvents] = useState<ReadingEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Evento/edito actual
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    publisher: '',
    cover_url: '',
    year: '',
    is_complete: false,
  });
  const [items, setItems] = useState<DraftItem[]>(EMPTY_ITEMS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null );

  // Selector visual de cómics: 'new' (añadiendo paso), clave de item
  // (cambiando el cómic de un paso) o null (cerrado).
  const [pickerTarget, setPickerTarget] = useState<string | 'new' | null>(null);

  // Portada y título del cómic elegido en cada paso
  const comicById = React.useMemo(
    () => new Map(comics.map((comic) => [comic.id, comic])),
    [comics]
  );

  const loadEvents = useCallback(async (): Promise<ReadingEvent[]> => {
    setLoadingEvents(true);
    const loaded = await getEvents();
    setEvents(loaded);
    setLoadingEvents(false);
    return loaded;
  }, []);

  useEffect(() => {
    if (isOpen) {
      void loadEvents();
      setError(null);
    }
  }, [isOpen, loadEvents]);

  const updateField = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetEditor = () => {
    setEditingEventId(null);
    setForm({ title: '', description: '', publisher: '', cover_url: '', year: '', is_complete: false });
    setItems(EMPTY_ITEMS);
    setError(null);
  };

  const loadEventForEdit = async (event: ReadingEvent) => {
    setEditingEventId(event.id);
    setForm({
      title: event.title,
      description: event.description ?? '',
      publisher: event.publisher ?? '',
      cover_url: event.cover_url ?? '',
      year: event.year ? String(event.year) : '',
      is_complete: event.is_complete,
    });
    setError(null);

    const loaded: ReadingEventItem[] = await getEventItems(event.id);
    setItems(
      loaded.map((item) => ({
        key: item.id,
        position: item.position,
        comic_id: item.comic_id,
        title: item.title ?? '',
        is_optional: item.is_optional,
      }))
    );
  };

  // Abre el selector de cómics; al elegir (o "Sin cómic"), crea el paso con
  // la siguiente posición disponible (múltiplos de 10) o actualiza el paso.
  const openPickerForNew = () => setPickerTarget('new');

  const handlePickerSelect = (comicId: string | null) => {
    if (!pickerTarget) return;

    if (pickerTarget === 'new') {
      const nextPosition = items.length > 0 ? Math.max(...items.map((i) => i.position)) + 10 : 10;
      setItems((prev) => [
        ...prev,
        {
          key: `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          position: nextPosition,
          comic_id: comicId,
          title: '',
          is_optional: false,
        },
      ]);
    } else {
      updateItem(pickerTarget, { comic_id: comicId });
    }
    setPickerTarget(null);
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const moveItem = (key: string, direction: -1 | 1) => {
    setItems((prev) => {
      const sorted = [...prev].sort((a, b) => a.position - b.position);
      const index = sorted.findIndex((item) => item.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= sorted.length) return prev;

      // Intercambia únicamente las posiciones de los dos pasos adyacentes
      const a = sorted[index];
      const b = sorted[target];
      const positionA = a.position;
      sorted[index] = { ...a, position: b.position };
      sorted[target] = { ...b, position: positionA };

      return [...sorted].sort((x, y) => x.position - y.position);
    });
  };

  const updateItem = (key: string, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('La guía necesita un título.');
      return;
    }

    setSaving(true);
    setError(null);

    const result = await saveEvent({
      id: editingEventId ?? undefined,
      title: form.title,
      description: form.description,
      publisher: form.publisher,
      cover_url: form.cover_url,
      year: form.year ? Number(form.year) : undefined,
      is_complete: form.is_complete,
    });

    if (!result.success || !result.id) {
      setSaving(false);
      setError(result.error ?? 'Error al guardar la guía.');
      return;
    }

    const savedId = result.id;

    const itemPayload: EventItemInput[] = items
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        position: item.position,
        comic_id: item.comic_id || null,
        title: item.title,
        is_optional: item.is_optional,
      }));

    const itemsResult = await saveEventItems(result.id, itemPayload);
    setSaving(false);

    if (!itemsResult.success) {
      setError(itemsResult.error ?? 'Error al guardar el orden de lectura.');
      return;
    }

    showToast('Guía de lectura guardada con éxito');
    const all = await loadEvents();
    onSaved?.();

    // Si era un evento nuevo, dejamos el editor en modo edición con sus datos
    const saved = all.find((entry) => entry.id === savedId);
    if (saved) {
      setEditingEventId(savedId);
      await loadEventForEdit(saved);
    }
  };

  const handleDelete = async (event: ReadingEvent) => {
    if (!window.confirm(`¿Eliminar la guía "${event.title}" y todos sus pasos?`)) return;

    const result = await deleteEvent(event.id);
    if (!result.success) {
      setError(result.error ?? 'Error al eliminar la guía.');
      return;
    }

    showToast('Guía eliminada');
    if (editingEventId === event.id) resetEditor();
    await loadEvents();
    onSaved?.();
  };

  const sortedItems = [...items].sort((a, b) => a.position - b.position);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center border border-accent/30">
            <ListOrdered className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-black text-ink">Gestionar Guías de Lectura</h2>
            <p className="text-xs text-mute">Crea crossovers y define el orden paso a paso</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-raised hover:bg-line text-mute text-ink transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Contenido en dos paneles */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Panel izquierdo: lista de guías existentes */}
        <div className="md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-line flex flex-col">
          <div className="p-4 space-y-2 overflow-y-auto flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-faint px-1">
              Guías existentes
            </p>
            {loadingEvents ? (
              <div className="flex items-center gap-2 p-3 text-xs text-mute">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                Cargando...
              </div>
            ) : events.length === 0 ? (
              <p className="text-xs text-faint p-3">Aún no hay guías creadas.</p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className={`p-3 rounded-xl border transition-colors ${
                    editingEventId === event.id
                      ? 'bg-raised/80 border-accent/30'
                      : 'bg-bg/60 border-line hover:border-line'
                  }`}
                >
                  <button
                    onClick={() => loadEventForEdit(event)}
                    className="w-full text-left"
                  >
                    <p className="text-xs font-bold text-ink line-clamp-1">{event.title}</p>
                    <p className="text-[10px] text-faint mt-0.5">
                      {event.publisher ?? 'Sin editorial'} {event.year ? `· ${event.year}` : ''}
                    </p>
                  </button>
                  <div className="flex items-center gap-1 mt-2">
                    <button
                      onClick={() => loadEventForEdit(event)}
                      className="p-1.5 rounded-lg bg-raised hover:bg-line text-mute text-ink transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(event)}
                      className="p-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent2 transition-colors"
                      title="Eliminar guía"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t border-line">
            <button
              onClick={resetEditor}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-accent hover:bg-accent2 text-onaccent transition-all shadow-md shadow-accent/40 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Nueva Guía
            </button>
          </div>
        </div>

        {/* Panel derecho: editor */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-accent/10 border border-accent/30 text-accent2 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Datos del evento */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-mute">
              {editingEventId ? 'Editando guía' : 'Nueva guía'}
            </h3>

            <div className="flex gap-3">
              {/* Preview de portada */}
              <div className="w-28 aspect-video rounded-xl overflow-hidden border border-line bg-bg shrink-0 flex items-center justify-center">
                {form.cover_url ? (
                  <img src={form.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-faint" />
                )}
              </div>

              <div className="flex-1 space-y-2.5 min-w-0">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Título de la guía (ej. La Muerte de Superman)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-line focus:border-accent/60 text-sm text-ink placeholder:text-faint outline-none transition-colors"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <select
                    value={form.publisher}
                    onChange={(e) => updateField('publisher', e.target.value)}
                    className="px-3 py-2.5 rounded-xl bg-bg border border-line focus:border-accent/60 text-sm text-ink outline-none transition-colors"
                  >
                    <option value="">Editorial...</option>
                    {PUBLISHERS.map((publisher) => (
                      <option key={publisher} value={publisher}>{publisher}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => updateField('year', e.target.value)}
                    placeholder="Año"
                    className="px-3.5 py-2.5 rounded-xl bg-bg border border-line focus:border-accent/60 text-sm text-ink placeholder:text-faint outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <input
              type="text"
              value={form.cover_url}
              onChange={(e) => updateField('cover_url', e.target.value)}
              placeholder="URL de la imagen panorámica (16:9 recomendado)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-line focus:border-accent/60 text-sm text-ink placeholder:text-faint outline-none transition-colors"
            />
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Descripción de la saga (qué cruza, por qué importa...)"
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-line focus:border-accent/60 text-sm text-ink placeholder:text-faint outline-none transition-colors resize-none"
            />

            {/* Interruptor "Saga completa" */}
            <button
              type="button"
              onClick={() => updateField('is_complete', !form.is_complete)}
              className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-surface border border-line hover:border-accent/40 transition-colors"
              aria-pressed={form.is_complete}
            >
              <span className="text-xs font-bold text-mute">Saga completa</span>
              <span className={`relative w-9 h-5 rounded-full transition-colors ${form.is_complete ? 'bg-accent' : 'bg-line'}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.is_complete ? 'translate-x-4' : ''}`} />
              </span>
            </button>
          </div>

          {/* Orden de lectura */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-mute">
                Orden de lectura ({sortedItems.length} pasos)
              </h3>
              <button
                onClick={openPickerForNew}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-raised hover:bg-line text-ink border border-line transition-colors active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-accent" />
                Añadir paso
              </button>
            </div>

            {sortedItems.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-surface/40 border border-line text-faint text-xs">
                Sin pasos todavía. Añade el primero con "Añadir paso".
              </div>
            ) : (
              <div className="space-y-2">
                {sortedItems.map((item, index) => (
                  <div
                    key={item.key}
                    className="p-3 rounded-xl bg-surface/60 border border-line space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      {/* Número de orden */}
                      <span className="w-10 h-10 rounded-lg bg-bg border border-line flex items-center justify-center shrink-0 text-sm font-black text-accent font-mono">
                        {String(item.position).padStart(2, '0')}
                      </span>

                      {/* Tile del cómic del paso (abre el selector visual) */}
                      <button
                        type="button"
                        onClick={() => setPickerTarget(item.key)}
                        className={`flex-1 min-w-0 flex items-center gap-2.5 px-2 py-1.5 rounded-lg border transition-all text-left active:scale-[0.98] ${
                          item.comic_id && comicById.has(item.comic_id)
                            ? 'bg-bg border-line hover:border-accent/50'
                            : 'bg-bg/60 border-line hover:border-line border-dashed'
                        }`}
                        title="Elegir cómic del catálogo"
                      >
                        {item.comic_id && comicById.get(item.comic_id) ? (
                          <>
                            <img
                              src={comicById.get(item.comic_id)!.cover_url}
                              alt=""
                              className="w-8 h-11 object-cover rounded-md border border-line shrink-0"
                            />
                            <span className="flex-1 min-w-0 text-xs font-bold text-ink truncate">
                              {comicById.get(item.comic_id)!.title}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="w-8 h-11 rounded-md bg-surface border border-line flex items-center justify-center shrink-0">
                              <Lock className="w-3.5 h-3.5 text-faint" />
                            </span>
                            <span className="flex-1 min-w-0 text-xs font-semibold text-faint truncate">
                              {item.title || 'Sin cómic (Próximamente) — clic para elegir'}
                            </span>
                          </>
                        )}
                      </button>

                      {/* Reordenar + borrar */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => moveItem(item.key, -1)}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg bg-raised hover:bg-line text-mute text-ink disabled:opacity-30 transition-colors"
                          title="Subir"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveItem(item.key, 1)}
                          disabled={index === sortedItems.length - 1}
                          className="p-1.5 rounded-lg bg-raised hover:bg-line text-mute text-ink disabled:opacity-30 transition-colors"
                          title="Bajar"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeItem(item.key)}
                          className="p-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent2 transition-colors"
                          title="Quitar paso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Etiqueta del paso */}
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateItem(item.key, { title: e.target.value })}
                        placeholder={item.comic_id ? 'Etiqueta del paso (opcional)' : 'Título del número futuro (ej. Superman #75)'}
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-bg border border-line focus:border-accent/60 text-xs text-ink placeholder:text-faint outline-none transition-colors"
                      />
                      {/* Toggle opcional */}
                      <button
                        type="button"
                        onClick={() => updateItem(item.key, { is_optional: !item.is_optional })}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase border transition-colors shrink-0 ${
                          item.is_optional
                            ? 'bg-raised text-mute border-line'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                        }`}
                        title="Los opcionales se ocultan con 'Mostrar solo esenciales'"
                      >
                        {item.is_optional ? <Check className="w-3 h-3" /> : null}
                        {item.is_optional ? 'Opcional' : 'Esencial'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 p-5 border-t border-line">
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl bg-raised hover:bg-line text-mute text-xs font-semibold transition-colors"
        >
          Cerrar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-accent hover:bg-accent2 text-onaccent transition-all shadow-md shadow-accent/40 active:scale-95 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Guardando...' : editingEventId ? 'Guardar cambios' : 'Crear Guía'}
        </button>
      </div>

      {/* Selector visual de cómics (con portadas y búsqueda) */}
      <ComicPickerModal
        isOpen={pickerTarget !== null}
        comics={comics}
        title={pickerTarget === 'new' ? 'Añadir Paso — Elegir Cómic' : 'Cambiar Cómic del Paso'}
        onClose={() => setPickerTarget(null)}
        onSelect={handlePickerSelect}
      />
    </Modal>
  );
};
