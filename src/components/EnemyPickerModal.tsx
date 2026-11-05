import React, { useEffect, useMemo, useState } from 'react';
import { Search, User, X, Skull, Check } from 'lucide-react';
import type { Character } from '../types/comic';
import { getAlignmentBadgeClass } from '../lib/constants';
import { Modal } from './ui/Modal';

interface EnemyPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Catálogo completo del wiki. */
  characters: Character[];
  /** ID del personaje que se está editando (no puede ser su propio enemigo). */
  excludeId?: string | null;
  /** Nombres ya agregados como enemigos. */
  existingEnemies: string[];
  /** Se dispara al elegir un personaje (agrega por nombre). */
  onPick: (name: string) => void;
}

/**
 * Modal para elegir personajes del wiki como enemigos: buscador + filas
 * con retrato circular estilo reparto. Multi-elección: se queda abierto
 * hasta que el editor cierra, para agregar varios de corrido.
 */
export const EnemyPickerModal: React.FC<EnemyPickerModalProps> = ({
  isOpen,
  onClose,
  characters,
  excludeId,
  existingEnemies,
  onPick,
}) => {
  const [query, setQuery] = useState('');

  // Cada vez que abre, la búsqueda empieza limpia.
  useEffect(() => {
    if (isOpen) setQuery('');
  }, [isOpen]);

  const isAlreadyEnemy = (c: Character) =>
    existingEnemies.some(
      (enemy) =>
        enemy.toLowerCase() === c.name.toLowerCase() ||
        enemy.toLowerCase() === (c.name_spanish ?? '').toLowerCase(),
    );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return characters
      .filter((c) => c.id !== excludeId)
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          (c.name_spanish ?? '').toLowerCase().includes(q) ||
          (c.aliases ?? '').toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [characters, excludeId, query]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md" closeOnBackdrop>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-3 p-5 border-b border-line">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
            <Skull className="w-4 h-4 text-accent" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-ink">Elegir enemigo del wiki</h3>
            <p className="text-[11px] text-mute">Agrega tantos como quieras</p>
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

      {/* Buscador */}
      <div className="shrink-0 px-5 py-3 border-b border-line">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mute pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, alias..."
            autoFocus
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg border border-line focus:border-accent text-sm text-ink outline-none transition-colors placeholder:text-faint"
          />
        </div>
      </div>

      {/* Lista con retratos circulares */}
      <div className="overflow-y-auto divide-y divide-line" style={{ maxHeight: '50dvh' }}>
        {results.length === 0 ? (
          <div className="p-8 text-center text-xs text-faint">
            Nadie en el wiki coincide con "{query}"
          </div>
        ) : (
          results.map((c) => {
            const taken = isAlreadyEnemy(c);
            return (
              <button
                key={c.id}
                type="button"
                disabled={taken}
                onClick={() => onPick(c.name)}
                className={`w-full text-left p-3.5 flex items-center gap-3 transition-colors ${
                  taken
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-raised/80 cursor-pointer group'
                }`}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-line group-hover:border-accent/70 bg-bg shrink-0 transition-colors">
                  {c.photo_url ? (
                    <img
                      src={c.photo_url}
                      alt={c.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-5 h-5 text-faint" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink truncate group-hover:text-accent transition-colors">
                    {c.name}
                  </p>
                  {c.name_spanish && (
                    <p className="text-[11px] text-accent font-semibold truncate">{c.name_spanish}</p>
                  )}
                </div>
                {c.alignment && (
                  <span
                    className={`shrink-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide rounded-full border ${getAlignmentBadgeClass(c.alignment)}`}
                  >
                    {c.alignment}
                  </span>
                )}
                {taken && (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    Agregado
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 p-4 border-t border-line bg-raised/40">
        <button
          type="button"
          onClick={onClose}
          className="w-full inline-flex justify-center items-center px-4 py-2.5 rounded-xl bg-accent hover:bg-accent2 text-onaccent text-xs font-bold transition-all active:scale-95"
        >
          Listo
        </button>
      </div>
    </Modal>
  );
};
