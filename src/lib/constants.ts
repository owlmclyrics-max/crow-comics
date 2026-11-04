import type { ComicPublisher, ComicStatus, ComicTag } from '../types/comic';

export const PUBLISHERS: ComicPublisher[] = [
  'Marvel',
  'DC Comics',
  'Image Comics',
  'Dynamite',
  'Dark Horse',
  'Vertigo',
  'Independiente',
];

export const TAGS: ComicTag[] = [
  'Popular',
  'Novedad',
  'Éxitos',
  'Más Descargados',
  'Trending',
];

export const STATUSES: ComicStatus[] = ['En curso', 'Finalizado'];

// Rol/tipo del personaje en la historia (para badges y filtros)
export const CHARACTER_ALIGNMENTS = [
  'Héroe',
  'Villano',
  'Anti-héroe',
  'Protagonista',
  'Antagonista',
  'Secundario',
] as const;

// Badge de color por rol (se mantienen literales: son semánticos, no del tema)
export const ALIGNMENT_BADGE: Record<string, string> = {
  'Héroe': 'bg-emerald-500/15 text-emerald-500 border-emerald-500/40',
  'Villano': 'bg-red-500/15 text-red-500 border-red-500/40',
  'Anti-héroe': 'bg-amber-500/15 text-amber-500 border-amber-500/40',
  'Protagonista': 'bg-sky-500/15 text-sky-500 border-sky-500/40',
  'Antagonista': 'bg-fuchsia-500/15 text-fuchsia-500 border-fuchsia-500/40',
  'Secundario': 'bg-zinc-500/15 text-zinc-500 border-zinc-500/40',
};

export const getAlignmentBadgeClass = (alignment?: string): string =>
  ALIGNMENT_BADGE[alignment ?? ''] ?? 'bg-accent/10 text-accent border-accent/30';

export const PUBLISHER_FILTERS: (ComicPublisher | 'Todas')[] = ['Todas', ...PUBLISHERS];

export const CATEGORY_FILTERS: (ComicTag | 'All')[] = ['All', ...TAGS];

export const FALLBACK_COVER_URL =
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800';
