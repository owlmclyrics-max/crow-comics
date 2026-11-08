import React from 'react';
import { ImagePlus } from 'lucide-react';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /**
   * Layout horizontal compacto: preview fija a la izquierda (o placeholder)
   * y controles apilados a la derecha. Ideal dentro de formularios altos,
   * donde la variante normal deja la preview huérfana junto a otros campos.
   */
  compact?: boolean;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({ label, value, onChange, compact }) => {
  if (compact) {
    return (
      <div className="flex gap-3">
        <div className="w-20 h-28 shrink-0 rounded-lg border border-line bg-bg overflow-hidden flex items-center justify-center">
          {value ? (
            <img
              key={value}
              src={value}
              alt={`Vista previa: ${label}`}
              className="w-full h-full object-cover"
              onError={event => { event.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <ImagePlus className="w-6 h-6 text-faint" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <label className="block text-[11px] font-semibold text-mute uppercase tracking-wide">{label}</label>
          <input
            type="text"
            value={value}
            onChange={event => onChange(event.target.value)}
            placeholder="o pega un enlace a la imagen (opcional)"
            aria-label={`${label} por URL`}
            className="w-full min-w-0 rounded-xl border border-line bg-bg px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-semibold text-mute uppercase tracking-wide">{label}</label>
      <input
        type="text"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="URL de imagen (opcional)"
        aria-label={`${label} por URL`}
        className="w-full min-w-0 rounded-xl border border-line bg-bg px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent"
      />
      {value && (
        <img
          key={value}
          src={value}
          alt={`Vista previa: ${label}`}
          className="h-28 w-20 rounded-lg border border-line bg-bg object-cover"
          onError={event => { event.currentTarget.style.display = 'none'; }}
        />
      )}
    </div>
  );
};
