import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Trash2, Star } from 'lucide-react';
import type { Comic } from '../types/comic';
import type { ReadingListRow } from '../lib/profile';
import { useAuth } from '../context/AuthContext';
import { useComics } from '../context/ComicsContext';
import { getListItems, removeComicFromList } from '../lib/profile';
import { ComicCard } from './ComicCard';

interface ListDetailPageProps {
  list: ReadingListRow;
  onBack: () => void;
  onSelectComic: (comic: Comic) => void;
  onListChanged?: () => void;
}

/**
 * Detalle de una lista (Sprint 3): todos sus cómics en un grid
 * reutilizando ComicCard. El dueño puede quitar cómics.
 */
export const ListDetailPage: React.FC<ListDetailPageProps> = ({
  list,
  onBack,
  onSelectComic,
  onListChanged,
}) => {
  const { user } = useAuth();
  const comics = useComics().comics;
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwner = Boolean(user?.id === list.user_id);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getListItems(list.id).then((items) => {
      if (!cancelled) {
        // added_at desc orden ya en la consulta; guardamos el orden
        setItemIds(items.map((item) => item.comic_id));
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [list.id]);

  const listComics = useMemo(() => {
    const byId = new Map(comics.map((comic) => [comic.id, comic]));
    return itemIds.map((id) => byId.get(id)).filter((comic): comic is Comic => Boolean(comic));
  }, [itemIds, comics]);

  const handleRemove = async (comicId: string) => {
    // Solo el dueño de la lista puede modificarla (además lo valida la RLS)
    if (!isOwner) return;
    setItemIds((prev) => prev.filter((id) => id !== comicId));
    await removeComicFromList(list.id, comicId);
    onListChanged?.();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-500/40 transition-all"
          title="Volver"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {list.is_featured && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-red-500 text-zinc-950">
                <Star className="w-2.5 h-2.5 fill-zinc-950" />
                Colección del sitio
              </span>
            )}
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">{list.name}</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {listComics.length} {listComics.length === 1 ? 'cómic' : 'cómics'}
            {list.description ? ` · ${list.description}` : ''}
          </p>
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="py-20 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-400">Cargando lista...</p>
        </div>
      ) : listComics.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-zinc-900/40 border border-zinc-800/60 p-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800 text-zinc-400 mb-3">
            <Trash2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Esta lista está vacía</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
            {isOwner
              ? 'Añade cómics desde su página de detalle con el botón "Añadir a lista".'
              : 'Su dueño todavía está armando esta colección.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {listComics.map((comic) => (
            <div key={comic.id} className="relative group">
              <ComicCard comic={comic} onClick={onSelectComic} />
              {isOwner && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleRemove(comic.id);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-950/80 hover:bg-rose-950/90 text-rose-400 hover:text-rose-300 border border-zinc-800 transition-all z-10"
                  title="Quitar de la lista"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
