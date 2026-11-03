import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useComics } from '../context/ComicsContext';
import { getFeaturedLists, getListItems, type ReadingListRow, type ReadingListItemRow } from '../lib/profile';
import { ListCard } from './ListCard';

interface FeaturedListsRowProps {
  onSelectList: (list: ReadingListRow) => void;
}

/**
 * Fila horizontal "Colecciones del Sitio" (Sprint 3):
 * lista oficial destacada = is_featured. Renderiza null si no hay colecciones.
 */
export const FeaturedListsRow: React.FC<FeaturedListsRowProps> = ({ onSelectList }) => {
  const comics = useComics().comics;
  const [lists, setLists] = useState<ReadingListRow[]>([]);
  const [itemsByList, setItemsByList] = useState<Record<string, ReadingListItemRow[]>>({});

  useEffect(() => {
    let cancelled = false;

    getFeaturedLists().then(async (featured) => {
      if (cancelled || featured.length === 0) {
        if (!cancelled) setLists([]);
        return;
      }
      // Cargar items de cada colección (para el collage y el conteo)
      const itemResults = await Promise.all(featured.map((list) => getListItems(list.id)));
      if (cancelled) return;
      setLists(featured);
      setItemsByList(Object.fromEntries(featured.map((list, i) => [list.id, itemResults[i]])));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const coverUrlsByList = useMemo(() => {
    const byId = new Map<string, string>();
    for (const comic of comics) byId.set(comic.id, comic.cover_url);
    return Object.fromEntries(
      lists.map((list) => [
        list.id,
        (itemsByList[list.id] ?? [])
          .map((item) => byId.get(item.comic_id))
          .filter((url): url is string => Boolean(url)),
      ]),
    );
  }, [lists, itemsByList, comics]);

  if (lists.length === 0) return null;

  return (
    <section className="space-y-4 animate-fade-in" aria-label="Colecciones del sitio">
      <div className="flex items-center gap-2.5">
        <Sparkles className="w-5 h-5 text-red-400" />
        <h3 className="text-lg font-black text-white tracking-tight">Colecciones del Sitio</h3>
        <span className="text-[11px] text-zinc-500 ml-2">seleccionadas por el equipo de Crow</span>
      </div>

      <div className="-mx-1 flex gap-4 overflow-x-auto pb-3 px-1 snap-x snap-mandatory [scrollbar-width:thin]">
        {lists.map((list) => (
          <div key={list.id} className="w-64 sm:w-72 shrink-0 snap-start">
            <ListCard
              name={list.name}
              count={itemsByList[list.id]?.length ?? 0}
              coverUrls={coverUrlsByList[list.id] ?? []}
              isFeatured
              onClick={() => onSelectList(list)}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
