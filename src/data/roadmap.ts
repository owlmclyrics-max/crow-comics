// ============================================================================
// ROADMAP de Crow Comics — datos de la vista RoadmapView.
// Fases: la beta actual (historial colapsado), la versión en curso y las
// ideas futuras. El estado de marcado se persiste en localStorage desde el
// componente; aquí solo viven los datos y el `done` inicial.
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
      { id: 'v04-8', label: 'Temas claro/oscuro, acento personalizable y hosting en Cloudflare Pages', done: true },
    ],
  },
  {
    version: 'v0.5',
    title: 'Hacia la luna',
    subtitle: 'La beta instalable en tu bolsillo',
    icon: 'map',
    tasks: [
      { id: 'v05-1', label: 'Migración a Cloudflare Pages completada', done: true },
      { id: 'v05-2', label: 'Dominio propio apuntando a pages.dev', done: false },
      { id: 'v05-3', label: 'PWA instalable con lectura offline', done: false },
      { id: 'v05-4', label: 'Notificaciones de nuevos tomos', done: false },
    ],
  },
  {
    version: 'v0.6',
    title: 'El lector definitivo',
    subtitle: 'Leer dentro del sitio, a pantalla completa y sin distracciones',
    icon: 'book',
    tasks: [
      { id: 'v06-1', label: 'Modo lectura inmersivo: visor online a pantalla completa con la navbar oculta (tipo visor de Google)', done: false },
      { id: 'v06-2', label: 'Modos de lectura: horizontal, webtoon continuo y doble página', done: false },
      { id: 'v06-3', label: 'Zoom, brillo y modo noche dentro del lector', done: false },
    ],
  },
  {
    version: 'v0.7',
    title: 'Racha Cuervo',
    subtitle: 'Que leer dé nivel, like el gym',
    icon: 'flame',
    tasks: [
      { id: 'v07-1', label: 'Estadísticas de lectura bien organizadas: tomos, capítulos, horas y racha en tu perfil', done: false },
      { id: 'v07-2', label: 'XP y niveles con insignias por hitos de lectura', done: false },
      { id: 'v07-3', label: '"Tu año en cómics": anuario estilo Wrapped con tu top', done: false },
      { id: 'v07-4', label: 'Meta semanal con recompensa: foto de perfil exclusiva nueva cada semana', done: false },
    ],
  },
  {
    version: 'v0.8',
    title: 'Nido conectado',
    subtitle: 'La comunidad se conoce entre sí',
    icon: 'users',
    tasks: [
      { id: 'v08-1', label: 'Seguir amigos y feed de actividad de lectura', done: false },
      { id: 'v08-2', label: 'Comentarios con respuestas, reacciones y menciones', done: false },
      { id: 'v08-3', label: 'Compartir listas y fichas en redes con preview bonito', done: false },
      { id: 'v08-4', label: 'Clanes/círculos de lectura con retos conjuntos', done: false },
    ],
  },
  {
    version: 'v0.9',
    title: 'El cuervo te conoce',
    subtitle: 'Descubrimiento inteligente',
    icon: 'sparkles',
    tasks: [
      { id: 'v09-1', label: 'Recomendaciones "porque leíste…" en el inicio', done: false },
      { id: 'v09-2', label: 'Búsqueda avanzada combinada: personaje + editorial + año', done: false },
      { id: 'v09-3', label: 'Colecciones inteligentes que se arman solas por tus gustos', done: false },
      { id: 'v09-4', label: 'Panel de estadísticas para admins: lo más leído y usuarios activos', done: false },
    ],
  },
];
