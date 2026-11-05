// ============================================================================
// ROADMAP de Crow Comics — datos de la vista RoadmapView.
// Dos fases: la beta actual (todo lo construido, colapsado en una tarjeta)
// y la próxima versión con los pendientes reales. El estado de marcado se
// persiste en localStorage desde el componente; aquí solo viven los datos y
// el `done` inicial (true = feature ya integrada).
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
    version: 'v0.4',
    title: 'Beta pública',
    subtitle: 'Todo lo construido hasta hoy',
    icon: 'rocket',
    tasks: [
      { id: 'v04-1', label: 'Catálogo con fichas de cómic, tomos y búsqueda (cómics y perfiles)', done: true },
      { id: 'v04-2', label: 'Lectura multiformato: enlaces PDF, Mega, Drive y Mediafire + marcador de página', done: true },
      { id: 'v04-3', label: 'Comunidad: calificaciones, comentarios y reportes de enlaces caídos', done: true },
      { id: 'v04-4', label: 'Cuentas con Google, perfiles públicos y favoritos', done: true },
      { id: 'v04-5', label: 'Listas de lectura, colecciones oficiales e historial', done: true },
      { id: 'v04-6', label: 'Onboarding, guías de lectura e insignias', done: true },
      { id: 'v04-7', label: 'Mini-wiki de personajes: roles, filtros y ficha estilo fandom', done: true },
      { id: 'v04-8', label: 'Temas claro/oscuro y acento personalizable', done: true },
    ],
  },
  {
    version: 'v0.5',
    title: 'Hacia la luna',
    subtitle: 'Lo que viene (en construcción)',
    icon: 'map',
    tasks: [
      { id: 'v05-1', label: 'Migración a Cloudflare Pages (¡en curso!)', done: false },
      { id: 'v05-2', label: 'PWA instalable con lectura offline', done: false },
      { id: 'v05-3', label: 'Dominio propio apuntando a pages.dev', done: false },
      { id: 'v05-4', label: 'Notificaciones de nuevos tomos', done: false },
    ],
  },
];
