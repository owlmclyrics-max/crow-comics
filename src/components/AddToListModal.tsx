import React, { useEffect, useState } from 'react';
import { Check, Plus, X, ListPlus, AlertCircle, Loader2 } from 'lucide-react';
import type { Comic } from '../types/comic';
import { useAuth } from '../context/AuthContext';
import {
  getReadingLists,
  getListItems,
  addComicToList,
  removeComicFromList,
  createReadingList,
  type ReadingListRow,
} from '../lib/profile';
import { Modal } from './ui/Modal';
import { showToast } from './ui/Toast';

interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  comic: Comic;
}

/**
 * Modal "Añadir a lista": muestra las listas del usuario con checkboxes
 * (marcadas si ya contienen el cómic) y permite crear una lista nueva
 * sobre la marcha, añadiendo el cómic automáticamente.
 */
export const AddToListModal: React.FC<AddToListModalProps> = ({ isOpen, onClose, comic }) => {
  const { user } = useAuth();
  const [lists, setLists] = useState<ReadingListRow[]>([]);
  const [memberLists, setMemberLists] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadLists = React.useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    const listRows = await getReadingLists(user.id);

    // Pertenencia por lista: deuda mínima y exacta
    const memberships = await Promise.all(
      listRows.map((list) =>
        getListItems(list.id).then((items) =>
          items.some((item) => item.comic_id === comic.id) ? list.id : null,
        ),
      ),
    );

    setLists(listRows);
    setMemberLists(new Set(memberships.filter((id): id is string => id !== null)));
    setLoading(false);
  }, [user?.id, comic.id]);

  useEffect(() => {
    if (isOpen) void loadLists();
  }, [isOpen, loadLists]);

  const handleToggle = async (list: ReadingListRow) => {
    if (!user?.id) return;
    const belongs = memberLists.has(list.id);

    // Optimista
    setMemberLists((prev) => {
      const next = new Set(prev);
      if (belongs) next.delete(list.id);
      else next.add(list.id);
      return next;
    });

    try {
      if (belongs) {
        await removeComicFromList(list.id, comic.id);
      } else {
        await addComicToList(list.id, comic.id);
      }
    } catch (err: unknown) {
      // Revertir si Supabase rechaza
      console.warn('Error actualizando la lista:', err);
      setMemberLists((prev) => {
        const next = new Set(prev);
        if (belongs) next.add(list.id);
        else next.delete(list.id);
        return next;
      });
      setError('No se pudo actualizar la lista. Intenta de nuevo.');
    }
  };

  const handleCreate = async () => {
    const name = newListName.trim();
    if (!name || !user?.id) return;
    setCreating(true);
    try {
      const created = await createReadingList(user.id, name);
      if (created) {
        await addComicToList(created.id, comic.id);
        setLists((prev) => [...prev, created]);
        setMemberLists((prev) => new Set(prev).add(created.id));
        setNewListName('');
        showToast(`Lista "${created.name}" creada con este cómic`, 'success');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Intenta de nuevo';
      console.error('Error creando lista:', message);
      setError(`No se pudo crear la lista: ${message}`);
    } finally {
      setCreating(false);
    }
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <div className="p-5 sm:p-6 space-y-4">
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
              <ListPlus className="w-4.5 h-4.5 text-red-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">Añadir a lista</h3>
              <p className="text-[10px] text-zinc-400 truncate">{comic.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-[11px] flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Listas existentes con checkbox */}
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
          {loading && (
            <div className="py-6 flex justify-center">
              <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
            </div>
          )}

          {!loading && lists.length === 0 && (
            <div className="py-6 text-center text-xs text-zinc-500">
              Todavía no tienes listas. Crea la primera abajo ↓
            </div>
          )}

          {!loading && lists.map((list) => {
            const belongs = memberLists.has(list.id);
            return (
              <button
                key={list.id}
                type="button"
                onClick={() => void handleToggle(list)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                  belongs
                    ? 'bg-red-950/40 border-red-500/40'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                {/* Checkbox */}
                <span
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    belongs ? 'bg-red-500 border-red-500 text-zinc-950' : 'border-zinc-600 bg-transparent'
                  }`}
                >
                  {belongs && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-bold text-zinc-100 truncate">{list.name}</span>
                  {list.description && (
                    <span className="block text-[10px] text-zinc-400 truncate">{list.description}</span>
                  )}
                </span>
                {list.is_public && (
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 shrink-0">
                    Pública
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Crear nueva lista al vuelo */}
        <div className="pt-3 border-t border-zinc-800 flex items-center gap-2">
          <input
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
            placeholder="Nueva lista (ej. Pendientes de leer)"
            className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-red-500 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors"
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating || !newListName.trim()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-zinc-950 text-xs font-bold transition-all shadow-md shadow-red-500/20 disabled:opacity-40 active:scale-95"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
            Crear
          </button>
        </div>
      </div>
    </Modal>
  );
};
