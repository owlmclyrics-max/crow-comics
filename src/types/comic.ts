export type ComicPublisher = 
  | 'Marvel' 
  | 'DC Comics' 
  | 'Image Comics' 
  | 'Dynamite' 
  | 'Dark Horse' 
  | 'Vertigo' 
  | 'Independiente';

export type ComicTag = 'Popular' | 'Novedad' | 'Éxitos' | 'Más Descargados' | 'Trending';
export type ComicStatus = 'En curso' | 'Finalizado';

export interface ChapterLink {
  id: string;
  name: string; // ej. "PDF Online", "Mega", "Google Drive", "Mediafire", "1Fichier"
  url: string;
  type?: 'pdf' | 'cloud' | 'download' | 'other';
}

export interface Chapter {
  id: string;
  comic_id: string;
  chapter_number: number;
  title: string;
  cover_url?: string; // Portada individual del capítulo / volumen
  pages_count?: number; // Ej: 32 págs
  release_date?: string;
  links: ChapterLink[];
  pdf_url?: string; // URL del PDF para leer online (Google Drive preview, etc.)
  created_at?: string;
}

export interface Comic {
  id: string;
  title: string;
  original_title?: string;
  cover_url: string;
  banner_url?: string; // Fondo cinemático estilo Ankergames
  synopsis: string;
  publisher: ComicPublisher;   // Editorial: Marvel, DC, Dynamite, Image, etc.
  tag: ComicTag;               // Etiqueta: Popular, Novedad, Éxitos, Más Descargados, Trending
  status: ComicStatus;
  writer: string;              // Guionista
  artist?: string;             // Dibujante
  translator_typesetter: string; // Maquetador / Traductor
  year?: number;
  total_issues_label?: string; // Ej: "#1-4 Completo" o "Volúmenes 1-6"
  full_download_links?: ChapterLink[]; // Enlaces para descargar toda la serie en un solo paquete
  chapters?: Chapter[];
  created_at?: string;
  average_rating?: number;     // Calificación promedio (0-5)
  total_ratings?: number;       // Total de calificaciones
  download_count?: number;     // Contador de descargas
}

export interface Comment {
  id: string;
  comic_id: string;
  user_id?: string;          // ID del usuario autenticado
  user_name: string;         // Username del perfil
  user_email?: string;       // Email (legacy)
  content: string;
  rating?: number;             // Calificación del usuario (0-5)
  created_at: string;
}

export interface Character {
  id: string;
  name: string;           // Nombre en inglés
  name_spanish?: string;  // Nombre en español
  real_name?: string;
  photo_url?: string;
  description?: string;
  first_appearance?: string;
  publisher?: string;
  alignment?: string;  // Rol: Héroe, Villano, Anti-héroe, Antagonista, etc.
  // ── MINI-WIKI (ficha estilo Marvel) ──
  aliases?: string;       // Alias, uno por línea (ej. "Rey de Negro\nDios de los Simbiontes")
  species?: string;       // Especie (ej. "Entidad cósmica primordial")
  universe?: string;      // Universo (ej. "Tierra-616")
  origin_place?: string;  // Lugar de origen (ej. "Vacío primordial")
  creators?: string;      // Creadores (ej. "Donny Cates y Ryan Stegman")
  enemies?: string;       // Enemigos principales, uno por línea
  powers?: string;        // Poderes y habilidades, uno por línea
  weapon?: string;        // Arma principal (ej. "All-Black, la Necroespada")
  created_at?: string;
}

export interface CharacterVariant {
  id: string;
  character_id: string;  // ID del personaje principal
  name: string;           // Nombre de la variante (ej: "Absolute Black Canary")
  universe: string;      // Universo / Continuidad (ej: "Absolute Universe")
  earth?: string;         // Tierra (ej: "Tierra-616")
  image_url: string;      // Imagen representativa
  description: string;    // Descripción de la variante
  first_appearance?: string; // Primera aparición
  differences?: string;   // Diferencias / Características
  created_at?: string;
}

export interface ChapterWithComic extends Chapter {
  comic_title: string;
  comic_cover_url: string;
  comic_synopsis: string;
  comic_publisher: ComicPublisher;
  comic_tag: ComicTag;
  comic_status: ComicStatus;
  comic_writer: string;
  comic_artist?: string;
  comic_translator_typesetter: string;
  comic_year?: number;
}

export interface LinkReport {
  id: string;
  chapter_id: string;
  comic_title: string;
  chapter_title: string;
  link_name: string;
  link_url: string;
  reporter_name?: string;
  message?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface ChapterCharacter {
  id: string;
  chapter_id: string;
  character_id: string;
  role?: string;
  created_at?: string;
}

// ============================================================================
// SPRINT 5: GUÍAS DE LECTURA Y EVENTOS (crossings entre series)
// ============================================================================

export interface ReadingEvent {
  id: string;
  title: string;
  description?: string;
  publisher?: string;
  cover_url?: string;
  year?: number;
  is_complete: boolean;
  created_at?: string;
}

export interface ReadingEventItem {
  id: string;
  event_id: string;
  comic_id: string | null; // nullable: el número puede aún no estar en el catálogo
  position: number;
  is_essential: boolean;
  is_optional: boolean;
  title?: string; // etiqueta propia del número (ej. "Wonder Woman #12")
  created_at?: string;
}

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  prefs: {
    onboarding_completed: boolean;
    favorite_publishers: string[];
    favorite_characters: string[];
    reading_style?: string;
  };
  created_at: string;
  updated_at: string;
}
