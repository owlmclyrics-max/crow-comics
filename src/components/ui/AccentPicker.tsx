
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Palette, X } from 'lucide-react';
import { useTheme, ACCENT_PRESETS } from '../../context/ThemeContext';

/**
 * Controles de color de acento (presets + tono personalizado).
 * Reutilizados por el popover del navbar y por el diálogo centrado.
 */
const AccentControls: React.FC<{ onPick?: () => void }> = ({ onPick }) => {
  const { accentHue, setAccentHue } = useTheme();

  return (
    <>
      <p className="text-[11px] font-bold text-ink uppercase tracking-wider">Color de acento</p>
      <p className="text-[10px] text-mute mt-0.5">Pinta logo, botones y detalles de la web.</p>

      {/* Preajustes */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {ACCENT_PRESETS.map((preset) => {
          const isActive = Math.round(accentHue) === preset.hue;
          return (
            <button
              key={preset.hue}
              type="button"
              title={preset.name}
              onClick={() => {
                setAccentHue(preset.hue, true);
                onPick?.();
              }}
              className={`h-9 rounded-xl border-2 transition-transform active:scale-90 ${
                isActive ? 'border-ink scale-105' : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: 'oklch(0.6 0.21 ' + preset.hue + ')' }}
            />
          );
        })}
      </div>

      {/* Línea de tono personalizado */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold text-mute uppercase tracking-wider">
            Tono personalizado
          </label>
          <span className="text-[10px] font-mono text-faint">{Math.round(accentHue)}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={359}
          value={Math.round(accentHue)}
          onChange={(e) => setAccentHue(Number(e.target.value))}
          className="mt-2 w-full h-3 rounded-full appearance-none cursor-pointer touch-none
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink
            [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-ink"
          style={{
            background:
              'linear-gradient(to right, oklch(0.63 0.21 0), oklch(0.63 0.21 60), oklch(0.63 0.21 120), oklch(0.63 0.21 180), oklch(0.63 0.21 240), oklch(0.63 0.21 300), oklch(0.63 0.21 360))',
          }}
        />
      </div>

      {/* Vista previa */}
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-raised p-2.5">
        <span
          className="w-6 h-6 rounded-lg shrink-0"
          style={{ backgroundColor: 'oklch(0.6 0.21 var(--crow-hue))' }}
        />
        <span className="text-xs font-black text-ink uppercase">
          CROW <span className="text-accent">COMICS</span>
        </span>
      </div>
    </>
  );
};

/** Botón de paleta que abre un popover (landing / navbar). */
export const AccentPicker: React.FC<{ variant?: 'box' | 'pill' }> = ({
  variant = 'box',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const triggerClass =
    variant === 'pill'
      ? 'rounded-full border border-white/15 bg-black/35 p-2 text-white shadow-lg backdrop-blur-md transition-all hover:bg-black/50 active:scale-90 sm:p-2.5'
      : 'p-2 rounded-xl bg-surface hover:bg-raised text-mute hover:text-ink border border-line transition-all active:scale-90';

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Cambiar color de acento"
        aria-expanded={isOpen}
        title="Color de acento"
        className={triggerClass}
      >
        <Palette
          className={variant === 'pill' ? 'h-4 w-4 sm:h-5 sm:w-5' : 'w-4 h-4'}
          style={{ color: 'oklch(0.63 0.21 var(--crow-hue))' }}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(80vw,18rem)] rounded-2xl border border-line bg-surface p-4 shadow-2xl animate-fade-in sm:w-72">
          <AccentControls />
        </div>
      )}
    </div>
  );
};

/**
 * Diálogo centrado de color de acento. Se monta en <body> con un portal para
 * que ningún contenedor (sidebar, backdrop-blur, overflow) lo recorte.
 */
export const AccentDialog: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Color de acento"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-3xl border border-line bg-surface p-5 shadow-2xl animate-fade-in">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 p-1.5 rounded-lg text-mute hover:text-ink hover:bg-raised transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <AccentControls />
      </div>
    </div>,
    document.body,
  );
};
