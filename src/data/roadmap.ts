// ============================================================================
// ROADMAP de Crow Comics — datos de la vista RoadmapView.
// Cada versión agrupa tareas con casillas. El estado de marcado se persiste
// en localStorage desde el componente; aquí solo viven los datos y el
// `done` inicial (true = feature ya integrada al momento de escribir esto).
// ============================================================================

export interface RoadmapTask {
  /** Id estable para persistir el estado del checkbox. */
  id: string;
  label: string;
  /** Valor por defecto cuando el usuario nunca interactuó con la casilla. */
  done: boolean;
}

export interface RoadmapVersion {
  version: string;
  title: string;
  subtitle: string;
  icon: string; // nombre de icono lucide, resuelto en el componente
}

export interface RoadmapVersionWithTasks extends RoadmapVersion {
  tasks: RoadmapTask[];
}

export const ROADMAP_VERSIONS: RoadmapVersionWithTasks[] = [
  {
    version: 'v0.5',
    title: 'Fundación del nido',
    subtitle: 'El catálogo que empezó todo',
    icon: 'rocket',
    tasks: [
      { id: 'v05-1', label: 'Catálogo base con fichas de cómic y tomos', done: true },
      { id: 'v05-2', label: 'Búsqueda por título, guionista y maquetador', done: true },
      { id: 'v05-3', label: 'Filtros por categoría: Popular, Novedad, Éxitos...', done: true },
      { id: 'v05-4', label: 'Tema oscuro con paleta slate-950', done: true },
    ],
  },
  {
    version: 'v0.6',
    title: 'Lectura multiformato',
    subtitle: 'Cada tomo, mil formas de leerlo',
    icon: 'book',
    tasks: [
      { id: 'v06-1', label: 'Enlaces múltiples por capítulo: PDF, Mega, Drive, Mediafire', done: true },
      { id: 'v06-2', label: 'Lector PDF integrado en la ficha del tomo', done: true },
      { id: 'v06-3', label: 'Marcador por página (page_number persistente)', done: true },
      { id: 'v06-4', label: 'Fila "Continuar Leyendo" en el inicio', done: true },
    ],
  },
  {
    version: 'v0.7',
    title: 'Voz de la comunidad',
    subtitle: 'Calificar, comentar, avisar',
    icon: 'message',
    tasks: [
      { id: 'v07-1', label: 'Calificaciones con estrellas y promedio', done: true },
      { id: 'v07-2', label: 'Sección de comentarios por cómic', done: true },
      { id: 'v07-3', label: 'Reportes de enlaces rotos con panel admin', done: true },
      { id: 'v07-4', label: 'Avisos y toasts globales de acciones', done: true },
    ],
  },
  {
    version: 'v0.8',
    title: 'Cuentas y perfiles',
    subtitle: 'Spint 1: tu identidad en el cuervo',
    icon: 'user',
    tasks: [
      { id: 'v08-1', label: 'Autenticación con Google (Supabase Auth)', done: true },
      { id: 'v08-2', label: 'Perfiles con username, bio y avatar', done: true },
      { id: 'v08-3', label: 'Favoritos con corazón persistente', done: true },
      { id: 'v08-4', label: 'Ajustes de privacidad del perfil', done: true },
    ],
  },
  {
    version: 'v0.9',
    title: 'Listas e historial',
    subtitle: 'Sprint 3: biblioteca personal',
    icon: 'list',
    tasks: [
      { id: 'v09-1', label: 'Listas de lectura propias con portadas mosaico', done: true },
      { id: 'v09-2', label: 'Colecciones oficiales destacadas del sitio', done: true },
      { id: 'v09-3', label: 'Historial de lectura con filtros', done: true },
      { id: 'v09-4', label: 'Vista de detalle de lista/colección', done: true },
    ],
  },
  {
    version: 'v1.0',
    title: 'Nido abierto',
    subtitle: 'Sprints 4-5: comunidad y guías',
    icon: 'sparkles',
    tasks: [
      { id: 'v10-1', label: 'Onboarding wizard para cuentas nuevas', done: true },
      { id: 'v10-2', label: 'Perfil público con favoritos respetando privacidad', done: true },
      { id: 'v10-3', label: 'Guías de lectura paso a paso (eventos)', done: true },
      { id: 'v10-4', label: 'Placas/insignias por actividad', done: true },
    ],
  },
  {
    version: 'v1.1',
    title: 'Universo de personajes',
    subtitle: 'Mini-wiki fandom dentro del nido',
    icon: 'users',
    tasks: [
      { id: 'v11-1', label: 'Personajes con ficha wiki completa (alias, poderes, enemigos)', done: true },
      { id: 'v11-2', label: 'Asignación de personajes por capítulo', done: true },
      { id: 'v11-3', label: 'Filtros por rol y editorial en el catálogo', done: true },
      { id: 'v11-4', label: 'Ficha con retrato circular y layout wiki clásico', done: true },
    ],
  },
  {
    version: 'v1.2',
    title: 'Hacia la luna',
    subtitle: 'Lo que viene (en construcción)',
    icon: 'map',
    tasks: [
      { id: 'v12-1', label: 'Code splitting: JS inicial -53% con chunks por vista', done: true },
      { id: 'v12-2', label: 'Avatar elegido en toda la app (navbar, landing, móvil)', done: true },
      { id: 'v12-3', label: 'Migración a Cloudflare Pages completada', done: false },
      { id: 'v12-4', label: 'PWA instalable con lectura offline', done: false },
      { id: 'v12-5', label: 'Dominio propio apuntando a pages.dev', done: false },
      { id: 'v12-6', label: 'Notificaciones de nuevos tomos', done: false },
    ],
  },
];
