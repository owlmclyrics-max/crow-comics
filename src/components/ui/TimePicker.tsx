import React, { useState } from 'react';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value?: string; // ISO time string (HH:mm or full datetime)
  onChange: (time: string) => void;
  onClose?: () => void;
  label?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, onClose, label }) => {
  const [hours, setHours] = useState(() => {
    if (value) {
      const d = new Date(value);
      return d.getHours();
    }
    return 12;
  });
  const [minutes, setMinutes] = useState(() => {
    if (value) {
      const d = new Date(value);
      return d.getMinutes();
    }
    return 0;
  });

  const handleSave = () => {
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    onChange(timeStr);
    onClose?.();
  };

  const handleQuickTime = (h: number, m: number) => {
    setHours(h);
    setMinutes(m);
  };

  return (
    <div className="bg-surface border border-line rounded-2xl shadow-2xl p-4 w-full max-w-sm">
      {label && (
        <p className="text-xs font-bold text-mute uppercase tracking-wider mb-3">{label}</p>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-accent" />
        <span className="text-sm font-bold text-ink">Hora de lanzamiento</span>
      </div>

      {/* Time display */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="flex flex-col items-center">
          <input
            type="number"
            min="0"
            max="23"
            value={hours}
            onChange={(e) => setHours(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
            className="w-20 h-16 text-3xl font-bold text-center rounded-xl bg-bg border border-line focus:border-accent outline-none"
          />
          <span className="text-[10px] text-mute mt-1">Horas</span>
        </div>
        <span className="text-3xl font-bold text-mute">:</span>
        <div className="flex flex-col items-center">
          <input
            type="number"
            min="0"
            max="59"
            value={minutes}
            onChange={(e) => setMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
            className="w-20 h-16 text-3xl font-bold text-center rounded-xl bg-bg border border-line focus:border-accent outline-none"
          />
          <span className="text-[10px] text-mute mt-1">Minutos</span>
        </div>
      </div>

      {/* Quick times */}
      <div className="mb-4">
        <p className="text-[10px] text-mute mb-2">Horas rápidas:</p>
        <div className="flex flex-wrap gap-2">
          {[
            { h: 0, m: 0, label: '12:00 AM' },
            { h: 6, m: 0, label: '6:00 AM' },
            { h: 12, m: 0, label: '12:00 PM' },
            { h: 18, m: 0, label: '6:00 PM' },
            { h: 21, m: 0, label: '9:00 PM' },
          ].map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => handleQuickTime(t.h, t.m)}
              className="px-3 py-1.5 rounded-lg bg-bg border border-line hover:border-accent text-[11px] font-semibold text-mute hover:text-ink transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-raised hover:bg-bg text-xs font-semibold text-mute hover:text-ink transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-accent hover:bg-accent2 text-onaccent text-xs font-bold transition-colors"
        >
          Guardar
        </button>
      </div>
    </div>
  );
};
