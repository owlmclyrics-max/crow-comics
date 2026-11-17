
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link2, Palette, RotateCcw, X } from 'lucide-react';
import {
  useTheme,
  ACCENT_PRESETS,
  type CrowAmbienceLevel,
  type CrowMotion,
  type CrowRadius,
} from '../../context/ThemeContext';

/** Grupo de botones compacto (esquinas / ambiente / animaciones). */
const OptionGroup: React.FC<{
  label: string;
  hint?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}> = ({ label, hint, value, options, onChange }) => (
  <div className="mt-4">
    <div className="flex items-center justify-between">
      <label className="text-[10px] font-semibold text-mute uppercase tracking-wider">
        {label}
      </label>
      {hint && <span className="text-[10px] text-faint">{hint}</span>}
    </div>
    <div
      className={`mt-2 gap-1.5 ${options.length >= 3 ? 'grid grid-cols-3' : 'grid grid-cols-2'}`}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-2 py-2 rounded-xl text-[11px] font-bold transition-colors ${
            value === opt.value
              ? 'bg-accent text-onaccent'
              : 'bg-bg border border-line text-mute hover:text-ink hover:bg-raised'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

/**
 * Controles de personalización: color de acento, acento secundario
 * bicolor, esquinas, ambiente y animaciones (v0.9.9.9.9.4).
 * Reutilizados por el popover del navbar y por el diálogo centrado.
 */
const AccentControls: React.FC<{ onPick?: () => void }> = ({ onPick }) => {
  const {
    accentHue,
    setAccentHue,
    accent2Hue,
    setAccent2Hue,
    radius,
    setRadius,
    ambience,
    setAmbience,
    motion,
    setMotion,
    resetCustomization,
  } = useTheme();
  const linked = accent2Hue === null;

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

      {/* ── Acento secundario (v0.9.9.9.9.4): degradados bicolor ── */}
      <div className="mt-4 pt-3 border-t border-line">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[10px] font-semibold text-mute uppercase tracking-wider flex items-center gap-1.5">
            <Link2 className="w-3 h-3" />
            Segundo color
          </label>
          <button
            type="button"
            onClick={() => setAccent2Hue(linked ? 255 : null)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
              linked
                ? 'bg-bg border border-line text-mute hover:text-ink'
                : 'bg-accent text-onaccent'
            }`}
          >
            {linked ? 'Separado' : 'Mismo color'}
          </button>
        </div>
        {!linked && (
          <div className="mt-2">
            <p className="text-[10px] text-faint leading-relaxed">
              Los degradados (hero, botones grandes) pasan a ser de dos colores.
            </p>
            <input
              type="range"
              min={0}
              max={359}
              value={Math.round(accent2Hue ?? 255)}
              onChange={(e) => setAccent2Hue(Number(e.target.value))}
              className="mt-2 w-full h-3 rounded-full appearance-none cursor-pointer touch-none
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md
                [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink
                [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-ink"
              style={{
                background:
                  'linear-gradient(to right, oklch(0.53 0.22 0), oklch(0.53 0.22 60), oklch(0.53 0.22 120), oklch(0.53 0.22 180), oklch(0.53 0.22 240), oklch(0.53 0.22 300), oklch(0.53 0.22 360))',
              }}
            />
          </div>
        )}
      </div>

      {/* ── Forma y ambiente ── */}
      <OptionGroup
        label="Esquinas"
        value={radius}
        onChange={(v) => setRadius(v as CrowRadius)}
        options={[
          { value: 'soft', label: 'Redondas' },
          { value: 'normal', label: 'Normales' },
          { value: 'sharp', label: 'Rectas' },
        ]}
      />
      <OptionGroup
        label="Ambiente de fondo"
        value={ambience}
        onChange={(v) => setAmbience(v as CrowAmbienceLevel)}
        options={[
          { value: 'on', label: 'Normal' },
          { value: 'dim', label: 'Tenue' },
          { value: 'off', label: 'Apagado' },
        ]}
      />
      <OptionGroup
        label="Animaciones"
        value={motion}
        onChange={(v) => setMotion(v as CrowMotion)}
        options={[
          { value: 'full', label: 'Completas' },
          { value: 'calm', label: 'Serenas' },
        ]}
      />
      <div className="mt-4">
        <button
          type="button"
          onClick={resetCustomization}
          title="Volver todo a los valores originales"
          className="w-full px-2 py-2 rounded-xl text-[11px] font-bold bg-bg border border-line text-mute hover:text-red-400 hover:bg-raised transition-colors inline-flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3 h-3" />
          Restaurar todo
        </button>
      </div>

      {/* Vista previa */}
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-raised p-2.5">
        <span
          className="w-6 h-6 rounded-lg shrink-0"
          style={{ backgroundColor: 'oklch(0.6 0.21 var(--crow-hue))' }}
        />
        <span
          className="w-6 h-6 rounded-lg shrink-0"
          style={{ backgroundColor: 'oklch(0.53 0.22 var(--crow-hue2, var(--crow-hue)))' }}
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
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(80vw,18rem)] rounded-2xl border border-line bg-surface p-4 shadow-2xl animate-fade-in sm:w-72 max-h-[70svh] overflow-y-auto">
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
