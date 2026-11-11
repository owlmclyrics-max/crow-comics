import React, { useCallback, useEffect, useState } from 'react';
import { X, User, Sparkles, Check } from 'lucide-react';
import { fetchChapterCast, setChapterCharacterVariant } from '../lib/chapterCharacters';
import type { ChapterCastEntry } from '../lib/chapterCharacters';
import { Modal } from './ui/Modal';
import { showToast } from './ui/Toast';

interface ChapterVariantPickerModalProps {
  isOpen: boolean;
  chapterId: string;
  onClose: () => void;
}

// ============================================================================
// v0.9.9.2: ELEGIR VARIANTE PARA EL REPARTO DE UN TOMO
//  1) Grilla de círculos: SOLO los personajes asignados al tomo que tienen
//     variantes registradas.
//  2) Al tocar uno: se muestran sus versiones en círculos (Principal + cada
//     variante) y se elige cuál mostrar en el reparto de este tomo.
// La elección se guarda por tomo (chapter_characters.variant_id).
// ============================================================================

export const ChapterVariantPickerModal: React.FC<ChapterVariantPickerModalProps> = ({
  isOpen,
  chapterId,
  onClose,
}) => {
  const [entries, setEntries] = useState<ChapterCastEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ChapterCastEntry | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await fetchChapterCast(chapterId));
    } catch (err) {
      console.error('Error cargando reparto del tomo:', err);
      showToast('No se pudo cargar el reparto del tomo', 'error');
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    if (isOpen) {
      setSelected(null);
      void load();
    }
  }, [isOpen, load]);

  const withVariants = entries.filter((entry) => entry.variants.length > 0);

  const handleChoose = async (entry: ChapterCastEntry, variantId: string | null) => {
    if (savingId) return;
    setSavingId(entry.character.id);
    try {
      await setChapterCharacterVariant(chapterId, entry.character.id, variantId);
      // Estado local coherente sin reconsultar
      setEntries((current) =>
        current.map((item) =>
          item.character.id === entry.character.id
            ? {
                ...item,
                variant: variantId
                  ? (item.variants.find((v) => v.id === variantId) ?? null)
                  : null,
              }
            : item,
        ),
      );
      showToast(
        variantId
          ? `Este tomo muestra "${entry.variants.find((v) => v.id === variantId)?.name}" para ${entry.character.name}`
          : `Este tomo vuelve a mostrar a ${entry.character.name} principal`,
        'success',
      );
      setSelected(null);
    } catch (err) {
      console.error('Error eligiendo variante:', err);
      showToast(
        'No se pudo guardar. ¿Ya corriste el SQL add-chapter-character-variant.sql?',
        'error',
      );
    } finally {
      setSavingId(null);
    }
  };

  const circleImage = (src?: string | null, alt = '') =>
    src ? (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full h-full object-cover"
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center">
        <User className="w-5 h-5 text-faint" />
      </div>
    );

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-3 p-5 border-b border-line">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-accent" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-ink">
              {selected ? `Variantes de ${selected.character.name}` : 'Variante en el reparto'}
            </h3>
            <p className="text-[11px] text-mute truncate">
              {selected
                ? 'Toca la versión que mostrará este tomo'
                : 'Personajes de este tomo con variantes registradas'}
            </p>
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

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5">
        {loading ? (
          <p className="text-xs text-mute text-center py-8">Cargando personajes...</p>
        ) : selected ? (
          /* ── Vista 2: variantes del personaje elegido ── */
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-[11px] font-bold text-mute hover:text-ink transition-colors"
            >
              ← Volver a los personajes
            </button>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-4">
              {/* Volver a la ficha principal */}
              <button
                type="button"
                onClick={() => void handleChoose(selected, null)}
                disabled={savingId === selected.character.id}
                aria-pressed={!selected.variant}
                className={`group/opt relative flex flex-col items-center gap-1.5 p-2 rounded-2xl border text-center transition-all focus:outline-none ${
                  !selected.variant
                    ? 'bg-accent/10 border-accent/50'
                    : 'bg-surface border-line hover:border-accent/40'
                } disabled:opacity-60`}
              >
                {!selected.variant && (
                  <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-accent text-onaccent flex items-center justify-center shadow z-10">
                    <Check className="w-3 h-3" />
                  </span>
                )}
                <div
                  className={`w-14 h-14 rounded-full overflow-hidden border-2 bg-bg shrink-0 transition-colors ${
                    !selected.variant ? 'border-accent' : 'border-line group-hover/opt:border-accent/50'
                  }`}
                >
                  {circleImage(selected.character.photo_url, selected.character.name)}
                </div>
                <p
                  className={`text-[11px] font-bold leading-tight line-clamp-2 ${
                    !selected.variant ? 'text-accent' : 'text-ink group-hover/opt:text-accent'
                  }`}
                >
                  Principal
                </p>
                <p className="text-[9px] text-faint leading-tight line-clamp-1">
                  {selected.character.name}
                </p>
              </button>

              {/* Cada variante registrada */}
              {selected.variants.map((variant) => {
                const active = selected.variant?.id === variant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => void handleChoose(selected, variant.id)}
                    disabled={savingId === selected.character.id}
                    aria-pressed={active}
                    className={`group/opt relative flex flex-col items-center gap-1.5 p-2 rounded-2xl border text-center transition-all focus:outline-none ${
                      active
                        ? 'bg-accent/10 border-accent/50'
                        : 'bg-surface border-line hover:border-accent/40'
                    } disabled:opacity-60`}
                  >
                    {active && (
                      <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-accent text-onaccent flex items-center justify-center shadow z-10">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                    <div
                      className={`w-14 h-14 rounded-full overflow-hidden border-2 bg-bg shrink-0 transition-colors ${
                        active ? 'border-accent' : 'border-line group-hover/opt:border-accent/50'
                      }`}
                    >
                      {circleImage(variant.image_url, variant.name)}
                    </div>
                    <p
                      className={`text-[11px] font-bold leading-tight line-clamp-2 ${
                        active ? 'text-accent' : 'text-ink group-hover/opt:text-accent'
                      }`}
                    >
                      {variant.name}
                    </p>
                    <p className="text-[9px] text-faint leading-tight line-clamp-1">
                      {variant.universe}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : withVariants.length === 0 ? (
          <p className="text-xs text-faint italic text-center py-8">
            Ninguno de los personajes asignados a este tomo tiene variantes todavía.
            <br />
            Crealas desde la ficha del personaje ("Nueva variante").
          </p>
        ) : (
          /* ── Vista 1: personajes con variantes ── */
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-3">
            {withVariants.map((entry) => (
              <button
                key={entry.character.id}
                type="button"
                onClick={() => setSelected(entry)}
                className="group/var relative flex flex-col items-center gap-1.5 p-2 rounded-2xl border bg-surface border-line hover:border-accent/40 text-center transition-all focus:outline-none"
              >
                {/* La versión actual de este tomo (si hay) se ve en el círculo */}
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-line bg-bg shrink-0 transition-colors group-hover/var:border-accent/50">
                  {circleImage(
                    entry.variant?.image_url ?? entry.character.photo_url,
                    entry.variant?.name ?? entry.character.name,
                  )}
                </div>
                <div className="min-w-0 w-full">
                  <p className="text-[11px] font-bold leading-tight line-clamp-1 text-ink group-hover/var:text-accent transition-colors">
                    {entry.character.name}
                  </p>
                  <p className="text-[9px] text-faint leading-tight line-clamp-1">
                    {entry.variant
                      ? `Mostrando: ${entry.variant.name}`
                      : `${entry.variants.length} variante${entry.variants.length > 1 ? 's' : ''}`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-end p-4 border-t border-line bg-raised/40">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center px-5 py-2.5 rounded-xl bg-accent hover:bg-accent2 text-onaccent text-xs font-bold transition-all active:scale-95"
        >
          Listo
        </button>
      </div>
    </Modal>
  );
};
