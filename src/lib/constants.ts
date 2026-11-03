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

export const PUBLISHER_FILTERS: (ComicPublisher | 'Todas')[] = ['Todas', ...PUBLISHERS];

export const CATEGORY_FILTERS: (ComicTag | 'All')[] = ['All', ...TAGS];

export const FALLBACK_COVER_URL =
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800';
