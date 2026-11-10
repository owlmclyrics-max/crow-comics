
import React from 'react';
import { createPortal } from 'react-dom';
import { X, Library } from 'lucide-react';
import type { ReadingStatus } from '../lib/readingStatus';
import { READING_STATUSES } from '../lib/readingStatus';

interface ChapterStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: ReadingStatus | null;
  saving: boolean;
  onSelect: (status: ReadingStatus) => void;
  /** Punto de color según estado (leyendo=acento, leído=verde, pausa=ámbar). */
  dotClass?: string;
}

/**
 * Modal "Añadir a biblioteca": elige qué relación tiene este tomo con vos
 * (Leyendo / Leído / En pausa / Abandonado). Reemplaza el selector inline.
 */
export const ChapterStatusModal: React.FC<ChapterStatusModalProps> = ({
  isOpen,
  onClose,
  currentStatus,
  saving,
  onSelect,
}) => {
  const dotClass = (value: ReadingStatus): string =>
    READING_STATUSES.find((s) => s.value === value)?.chipClass ?? '';

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Añadir a mi biblioteca"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-surface/90 shadow-2xl shadow-black/50 backdrop-blur-2xl animate-fade-in">
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-ink">
              <Library className="w-4 h-4 text-accent" />
              Mi Biblioteca
            </h3>
            <p className="mt-0.5 text-[11px] text-mute">
              ¿Cómo llevás este tomo? Se guarda en tu cuenta.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-mute hover:text-ink hover:bg-raised transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {READING_STATUSES.map((opt) => {
            const active = currentStatus === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={saving}
                onClick={() => onSelect(opt.value)}
                className={`w-full flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.98] disabled:opacity-70 ${
                  active
                    ? 'border-accent/50 bg-accent/10'
                    : 'border-line bg-bg/40 hover:border-faint hover:bg-raised/60'
                }`}
              >
                <span
                  className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 shrink-0 ${dotClass(opt.value)}`}
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-bold text-ink">
                    {opt.label}
                    {active && (
                      <span className="text-[9px] font-black uppercase tracking-wider text-accent">
                        Actual
                      </span>
                    )}
                  </span>
                  <span className="block text-[11px] text-mute mt-0.5">{opt.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Nota: la fila de chips existente guardaba el valor sin modal; aquí
            se elige igual pero con descripciones (mismo campo reading_status) */}
        <p className="px-5 pb-4 text-[10px] text-faint">
          Leyendo aparece en "Continuar Leyendo"; los demás estados le quitan el foco pero
          quedan en tu historial.
        </p>
      </div>
    </div>,
    document.body,
  );
};
