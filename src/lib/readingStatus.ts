/**
 * Estados de lectura por tomo (v0.6-9): cada lector marca su relación
 * con un tomo concreto de la serie.
 *
 * Los valores viajan a la base de datos (columna reading_status de
 * reading_progress), así que NUNCA renombrarlos sin migración SQL.
 */
export type ReadingStatus = 'leyendo' | 'leido' | 'en_pausa' | 'abandonado';

export interface ReadingStatusOption {
  value: ReadingStatus;
  label: string;
  /** Explicación corta del efecto en la app (tooltip / descripción). */
  hint: string;
  /** Clases Tailwind del chip/píldora ACTIVADA. */
  chipClass: string;
}

export const READING_STATUSES: ReadingStatusOption[] = [
  {
    value: 'leyendo',
    label: 'Leyendo',
    hint: 'El tomo aparece en "Continuar Leyendo" con su marcador de página',
    chipClass: 'bg-accent text-onaccent border-accent',
  },
  {
    value: 'leido',
    label: 'Leído',
    hint: 'Tomo terminado: sale de "Continuar Leyendo" y queda en tu historial',
    chipClass: 'bg-emerald-600 text-emerald-50 border-emerald-500',
  },
  {
    value: 'en_pausa',
    label: 'En pausa',
    hint: 'Sale de "Continuar Leyendo" pero conservas el marcador para retomarlo',
    chipClass: 'bg-amber-500 text-zinc-950 border-amber-500',
  },
  {
    value: 'abandonado',
    label: 'Abandonado',
    hint: 'Dejaste la serie: sale de "Continuar Leyendo" y el historial lo registra',
    chipClass: 'bg-raised text-mute border-line',
  },
];

/** Etiqueta legible de un estado guardado (undefined/null → vacío). */
export const readingStatusLabel = (value?: ReadingStatus | null): string =>
  READING_STATUSES.find((s) => s.value === value)?.label ?? '';

/** Clases del chip para un estado guardado (undefined/null → vacío). */
export const readingStatusChipClass = (value?: ReadingStatus | null): string =>
  READING_STATUSES.find((s) => s.value === value)?.chipClass ?? '';
