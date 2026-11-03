import React from 'react';
import { BookOpen, Star } from 'lucide-react';

interface ListCardProps {
  name: string;
  description?: string;
  count: number;
  coverUrls: string[]; // hasta 4 portadas para el collage
  isFeatured?: boolean;
  onClick: () => void;
}

/**
 * Tarjeta de lista (Sprint 3): collage dinámico 2×2 con las primeras
 * portadas de la lista, nombre y conteo. Se usa en "Mis Listas" del
 * perfil y en la fila "Colecciones del Sitio" del home.
 */
export const ListCard: React.FC<ListCardProps> = ({
  name,
  count,
  coverUrls,
  isFeatured = false,
  onClick,
}) => {
  const covers = coverUrls.slice(0, 4);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full text-left rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-red-500/50 overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-red-950/40 cursor-pointer"
    >
      {/* Collage de portadas */}
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {covers.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 gap-2">
            <BookOpen className="w-8 h-8 text-zinc-700" />
            <span className="text-[10px] text-zinc-600">Lista vacía</span>
          </div>
        ) : covers.length === 1 ? (
          <img
            src={covers[0]}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={`w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5`}>
            {covers.map((url, index) => (
              <img
                key={index}
                src={url}
                alt=""
                loading="lazy"
                className={`w-full h-full object-cover ${
                  covers.length === 2 && index === 0 ? 'row-span-2' : ''
                } ${covers.length === 3 && index === 0 ? 'row-span-2' : ''}`}
              />
            ))}
          </div>
        )}

        {/* Degradado para legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />

        {isFeatured && (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-red-500 text-zinc-950 shadow-md">
            <Star className="w-2.5 h-2.5 fill-zinc-950" />
            Oficial
          </span>
        )}

        {/* Nombre + conteo */}
        <div className="absolute bottom-0 inset-x-0 p-3">
          <h4 className="text-sm font-black text-white truncate drop-shadow-[0_1px_4px_rgba(0,0,0,1)] group-hover:text-red-400 transition-colors">
            {name}
          </h4>
          <p className="text-[10px] text-zinc-300 mt-0.5">
            {count} {count === 1 ? 'cómic' : 'cómics'}
          </p>
        </div>
      </div>
    </button>
  );
};
