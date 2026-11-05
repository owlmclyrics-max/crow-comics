import React, { useEffect, useMemo, useState } from 'react';
import { Search, User, X, Skull, Check, Pencil, Plus, Loader2 } from 'lucide-react';
import type { Character } from '../types/comic';
import { getAlignmentBadgeClass } from '../lib/constants';
import { accentless, characterNameMatches } from '../lib/comicUtils';
import { useCharactersContext } from '../context/CharactersContext';
import { Modal } from './ui/Modal';
import { showToast } from './ui/Toast';

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

/** Líneas limpias de un campo guardado "uno por línea". */
const lines = (value: string | undefined): string[] =>
  (value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/** Alias o nombre real con el que coincide la búsqueda (para mostrarlo). */
const matchedExtraText = (c: Character, query: string): string | null => {
  const q = accentless(query);
  if (!q) return null;
  const real = c.real_name ?? '';
  if (real && accentless(real).includes(q)) return real;
  const alias = lines(c.aliases).find((a) => accentless(a).includes(q));
  return alias ?? null;
};

/** Resalta el fragmento que coincide con la búsqueda dentro del texto. */
const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  const q = accentless(query);
  if (!q) return <>{text}</>;
  const idx = accentless(text).indexOf(q);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-accent">{text.slice(idx, idx + q.length)}</span>
      {text.slice(idx + q.length)}
    </>
  );
};

/**
 * Modal para elegir personajes del wiki como enemigos. Dos caminos:
 * 1) Buscar y elegir de la lista (retrato circular estilo reparto); la
 *    búsqueda cubre nombre inglés, español, real y cada alias, sin acentos.
 * 2) "Escribir a mano": mientras tecleas se ofrecen coincidencias del wiki y,
 *    si nadie coincide, crear una FICHA RÁPIDA con ese nombre.
 * Multi-elección: se queda abierto hasta cerrar, para agregar varios de corrido.
 */
export const EnemyPickerModal: React.FC<EnemyPickerModalProps> = ({
  isOpen,
  onClose,
  characters,
  excludeId,
  existingEnemies,
  onPick,
}) => {
  const { addCharacter } = useCharactersContext();
  const [query, setQuery] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualName, setManualName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Cada vez que abre, todo empieza limpio.
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setManualMode(false);
      setManualName('');
    }
  }, [isOpen]);

  const isAlreadyEnemy = (c: Character) =>
    existingEnemies.some((enemy) => characterNameMatches(c, enemy));

  const results = useMemo(() => {
    const q = accentless(query);
    const list = characters.filter((c) => c.id !== excludeId);
    if (!q) return list.sort((a, b) => a.name.localeCompare(b.name));

    // Buscar en TODOS los nombres y alias disponibles.
    const matches = list.filter((c) => {
      const haystacks = [c.name, c.name_spanish, c.real_name, ...lines(c.aliases)];
      return haystacks.some((value) => accentless(value ?? '').includes(q));
    });

    // Exactos primero, luego los que empiezan con la búsqueda, alfabético al final.
    const rank = (c: Character): number => {
      const en = accentless(c.name);
      const es = accentless(c.name_spanish ?? '');
      if (en === q || es === q) return 0;
      if (en.startsWith(q) || es.startsWith(q)) return 1;
      return 2;
    };
    return matches.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }, [characters, excludeId, query]);

  // ── Modo manual: coincidencias en vivo + ficha rápida ──
  const manualQuery = manualName.trim();
  const manualMatches = useMemo(() => {
    const q = accentless(manualQuery);
    if (!q) return [];
    return characters
      .filter((c) => c.id !== excludeId && !isAlreadyEnemy(c))
      .filter((c) => {
        const haystacks = [c.name, c.name_spanish, c.real_name, ...lines(c.aliases)];
        return haystacks.some((value) => accentless(value ?? '').includes(q));
      })
      .slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characters, excludeId, manualQuery, existingEnemies]);

  // ¿Lo tecleado ya ES una ficha del wiki? Entonces no ofrecer crear duplicado.
  const exactWikiMatch = useMemo(
    () =>
      manualQuery
        ? characters.find((c) => c.id !== excludeId && characterNameMatches(c, manualQuery))
        : undefined,
    [characters, excludeId, manualQuery],
  );

  const createQuickCharacter = async () => {
    if (!manualQuery || isCreating) return;
    setIsCreating(true);
    const result = await addCharacter({ name: manualQuery });
    setIsCreating(false);
    if (result.success) {
      onPick(manualQuery);
      setManualName('');
      setManualMode(false);
      showToast(`Ficha rápida de "${manualQuery}" creada en el wiki`, 'success');
    } else {
      showToast(result.error ?? 'No se pudo crear la ficha rápida', 'error');
    }
  };

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

      {/* Buscador + botonsito del modo manual */}
      <div className="shrink-0 px-5 py-3 border-b border-line space-y-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mute pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre, alias o nombre real..."
            autoFocus
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg border border-line focus:border-accent text-sm text-ink outline-none transition-colors placeholder:text-faint"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setManualMode((open) => !open)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
              manualMode
                ? 'bg-accent/15 border-accent/40 text-accent'
                : 'bg-raised border-line text-mute hover:text-ink hover:border-accent/40'
            }`}
          >
            <Pencil className="w-3 h-3" />
            {manualMode ? 'Ocultar escritura' : 'Escribir a mano'}
          </button>
        </div>

        {/* Modo manual: texto libre con coincidencias en vivo + ficha rápida */}
        {manualMode && (
          <div className="rounded-xl border border-line bg-bg/60 p-3 space-y-2 animate-fade-in">
            <input
              type="text"
              value={manualName}
              onChange={(event) => setManualName(event.target.value)}
              placeholder="Nombre del enemigo..."
              className="w-full px-3 py-2 rounded-lg bg-bg border border-line focus:border-accent text-sm text-ink outline-none transition-colors placeholder:text-faint"
            />

            {manualQuery && (
              <>
                <p className="text-[9px] font-black uppercase tracking-widest text-faint">
                  Coincidencias del wiki
                </p>
                {manualMatches.length > 0 ? (
                  <div className="space-y-1">
                    {manualMatches.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          onPick(c.name);
                          setManualName('');
                        }}
                        className="w-full flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-raised transition-colors group/match"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-line bg-bg shrink-0">
                          {c.photo_url ? (
                            <img
                              src={c.photo_url}
                              alt={c.name}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-3.5 h-3.5 text-faint" />
                            </div>
                          )}
                        </div>
                        <p className="flex-1 min-w-0 text-left text-xs font-bold text-ink truncate group-hover/match:text-accent transition-colors">
                          {c.name}
                          {c.name_spanish && (
                            <span className="text-faint font-semibold"> — {c.name_spanish}</span>
                          )}
                        </p>
                        <Plus className="w-3.5 h-3.5 text-accent shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-faint">Sin coincidencias en el wiki.</p>
                )}

                {/* Ficha rápida: solo si NO es ya una ficha del wiki */}
                {exactWikiMatch ? (
                  <p className="text-[10px] text-mute">
                    Ya existe una ficha llamada así — elígela arriba ☝️
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => void createQuickCharacter()}
                    disabled={isCreating}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-accent/15 border border-accent/40 text-accent text-[11px] font-bold hover:bg-accent hover:text-onaccent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    {isCreating
                      ? 'Creando ficha...'
                      : `Crear ficha rápida: "${manualQuery}"`}
                  </button>
                )}
              </>
            )}
          </div>
        )}
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
            const extra = matchedExtraText(c, query);
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
                    <Highlight text={c.name} query={query} />
                  </p>
                  {c.name_spanish && (
                    <p className="text-[11px] text-accent font-semibold truncate">
                      <Highlight text={c.name_spanish} query={query} />
                    </p>
                  )}
                  {extra && (
                    <p className="text-[10px] text-mute truncate">
                      Coincide: <Highlight text={extra} query={query} />
                    </p>
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
