/**
 * PasteDateInput (v0.11.4): campo de fecha que SÍ acepta pegar.
 *
 * El `<input type="date">` nativo ignora el pegado en la mayoría de los
 * navegadores. Este campo muestra la fecha como dd/mm/aaaa y entiende, al
 * pegar o escribir:
 *   - 22/11/2026 · 22-11-2026 · 22.11.2026
 *   - 22/11/26
 *   - 2026-11-22 (ISO, también con hora: 2026-11-22T18:30)
 *   - texto con la fecha adentro, ej. "Fecha: 22/11/2026"
 *   - fechas en inglés/español, ej. "July 4, 2012." o "4 de julio de 2012"
 *
 * El icono del calendario abre el selector nativo. El valor que emite
 * `onChange` es siempre ISO (YYYY-MM-DD), igual que el resto de la app.
 */
import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';

const pad2 = (n: number) => String(n).padStart(2, '0');

const buildIso = (y: number, m: number, d: number): string | null => {
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
};

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1, ene: 1, enero: 1,
  feb: 2, february: 2, febrero: 2,
  mar: 3, march: 3, marzo: 3,
  apr: 4, april: 4, abr: 4, abril: 4,
  may: 5, mayo: 5,
  jun: 6, june: 6, junio: 6,
  jul: 7, july: 7, julio: 7,
  aug: 8, august: 8, ago: 8, agosto: 8,
  sep: 9, sept: 9, september: 9, set: 9, septiembre: 9, setiembre: 9,
  oct: 10, october: 10, octubre: 10,
  nov: 11, november: 11, noviembre: 11,
  dec: 12, december: 12, diciembre: 12,
};

const monthNumber = (word: string): number | null => {
  const key = word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/gi, '')
    .toLowerCase();
  return MONTH_NAMES[key] ?? null;
};

/** Convierte casi cualquier fecha copiada a ISO (YYYY-MM-DD). */
export const parseAnyDate = (raw: string): string | null => {
  const text = raw.trim();
  if (!text) return null;
  // ISO primero: 2026-11-22 (con o sin hora).
  let m = text.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return buildIso(Number(m[1]), Number(m[2]), Number(m[3]));
  // Formato latino: 22/11/2026 o 22-11-26.
  m = text.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    const year = Number(m[3]);
    return buildIso(year < 100 ? 2000 + year : year, Number(m[2]), Number(m[1]));
  }
  // Fechas con mes en letras, típicas de Fandom/Wikipedia:
  // "July 4, 2012." · "Jul 4 2012" · "4 July 2012" · "4 de julio de 2012".
  m = text.match(/([a-záéíóúüñ.]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(?:de\s+)?(\d{2,4})/i);
  if (m) {
    const month = monthNumber(m[1]);
    const year = Number(m[3]);
    if (month) return buildIso(year < 100 ? 2000 + year : year, month, Number(m[2]));
  }
  m = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:de\s+)?([a-záéíóúüñ.]+),?\s+(?:de\s+)?(\d{2,4})/i);
  if (m) {
    const month = monthNumber(m[2]);
    const year = Number(m[3]);
    if (month) return buildIso(year < 100 ? 2000 + year : year, month, Number(m[1]));
  }
  return null;
};

const isoToDisplay = (iso: string): string => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

interface PasteDateInputProps {
  value: string;
  onChange: (iso: string) => void;
  label?: string;
  compact?: boolean;
  className?: string;
}

export const PasteDateInput: React.FC<PasteDateInputProps> = ({
  value,
  onChange,
  label,
  compact = false,
  className = '',
}) => {
  const nativeRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => isoToDisplay(value));

  // Si el valor cambia desde afuera (p. ej. "fecha para todos"), reflejarlo.
  useEffect(() => {
    setText(isoToDisplay(value));
  }, [value]);

  const commit = (raw: string): boolean => {
    const iso = parseAnyDate(raw);
    if (!iso) return false;
    onChange(iso);
    setText(isoToDisplay(iso));
    return true;
  };

  const openPicker = () => {
    const el = nativeRef.current;
    if (!el) return;
    const picker = el as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === 'function') {
      try {
        picker.showPicker();
        return;
      } catch {
        /* fallback abajo */
      }
    }
    el.focus();
  };

  return (
    <div className={`relative w-full min-w-0 ${className}`}>
      <input
        type="text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          commit(e.target.value);
        }}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData('text');
          if (commit(pasted)) e.preventDefault();
        }}
        onBlur={() => {
          const iso = parseAnyDate(text);
          setText(iso ? isoToDisplay(iso) : isoToDisplay(value));
        }}
        placeholder="dd/mm/aaaa"
        aria-label={label ?? 'Fecha de publicación'}
        spellCheck={false}
        className={`w-full pl-3 pr-9 rounded-xl bg-bg border border-line focus:border-accent text-ink outline-none transition-colors placeholder:text-faint ${
          compact ? 'text-[11px] py-1.5' : 'text-sm py-2'
        }`}
      />
      <button
        type="button"
        onClick={openPicker}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-faint hover:text-accent hover:bg-raised transition-colors"
        title="Elegir en el calendario"
        aria-label="Abrir calendario"
      >
        <CalendarDays className="w-3.5 h-3.5" />
      </button>
      <input
        ref={nativeRef}
        type="date"
        value={value || ''}
        onChange={(e) => {
          if (e.target.value) {
            onChange(e.target.value);
            setText(isoToDisplay(e.target.value));
          }
        }}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute right-0 top-0 w-0 h-0 opacity-0 pointer-events-none"
      />
    </div>
  );
};
