import type { Comic } from '../types/comic';

export const INITIAL_MOCK_COMICS: Comic[] = [
  {
    id: '1',
    title: 'The Crow: Calaveras de Hierro',
    original_title: 'The Crow: Iron Skulls',
    cover_url: 'https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?auto=format&fit=crop&q=80&w=800',
    banner_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=1600',
    synopsis: 'Una historia oscura y descarnada sobre la venganza en los callejones olvidados de una metrópolis decadente. Eric regresa bajo el manto del cuervo guiado por almas en pena para ajustar cuentas con el bajo mundo sin dejar sobrevivientes.',
    publisher: 'Independiente',
    tag: 'Novedad',
    status: 'Finalizado',
    writer: 'James O’Barr',
    artist: 'David Lloyd',
    translator_typesetter: 'CrowScan Team (Kael & Darko)',
    year: 2023,
    average_rating: 4.5,
    total_ratings: 128,
    download_count: 3420,
    total_issues_label: '#1-2 Completo (Pack CBR)',
    full_download_links: [
      { id: 'f1', name: 'Mega (Pack Completo)', url: 'https://mega.nz/file/mock-pack-crow', type: 'cloud' },
      { id: 'f2', name: 'Google Drive', url: 'https://drive.google.com/file/d/mock-pack-crow', type: 'cloud' },
      { id: 'f3', name: 'Mediafire', url: 'https://mediafire.com/file/mock-pack-crow', type: 'download' }
    ],
    chapters: [
      {
        id: 'c1',
        comic_id: '1',
        chapter_number: 1,
        title: 'Capítulo #1: La Noche del Cuervo',
        cover_url: 'https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?auto=format&fit=crop&q=80&w=600',
        pages_count: 36,
        release_date: '2023-11-15',
        links: [
          { id: 'l1', name: 'Leer PDF Online', url: 'https://example.com/reader/crow-01', type: 'pdf' },
          { id: 'l2', name: 'Mega (CBR)', url: 'https://mega.nz/file/mock-crow-01', type: 'cloud' },
          { id: 'l3', name: 'Mediafire', url: 'https://mediafire.com/file/mock-crow-01', type: 'download' }
        ]
      },
      {
        id: 'c2',
        comic_id: '1',
        chapter_number: 2,
        title: 'Capítulo #2: Sombras de Acero',
        cover_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=600',
        pages_count: 42,
        release_date: '2023-12-01',
        links: [
          { id: 'l4', name: 'Leer PDF Online', url: 'https://example.com/reader/crow-02', type: 'pdf' },
          { id: 'l5', name: 'Mega (CBR)', url: 'https://mega.nz/file/mock-crow-02', type: 'cloud' },
          { id: 'l5b', name: 'Google Drive', url: 'https://drive.google.com/file/d/mock-crow-02', type: 'cloud' }
        ]
      }
    ]
  },
  {
    id: '2',
    title: 'Daredevil: Noches de Sangre',
    original_title: 'Daredevil: Blood and Faith',
    cover_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=800',
    banner_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1600',
    synopsis: 'Matt Murdock libra una guerra sin cuartel contra la mafia de Hell’s Kitchen mientras su fe es puesta a prueba como nunca antes por un nuevo justiciero implacable.',
    publisher: 'Marvel',
    tag: 'Popular',
    status: 'En curso',
    writer: 'Chip Zdarsky',
    artist: 'Marco Checchetto',
    translator_typesetter: 'MarvelHispano / Alex V.',
    year: 2024,
    average_rating: 4.8,
    total_ratings: 256,
    download_count: 5210,
    total_issues_label: '#1-4 Serie Completa',
    full_download_links: [
      { id: 'f4', name: 'Mega (Pack Completo #1-4)', url: 'https://mega.nz/file/dd-pack', type: 'cloud' },
      { id: 'f5', name: 'Mediafire', url: 'https://mediafire.com/file/dd-pack', type: 'download' }
    ],
    chapters: [
      {
        id: 'c3',
        comic_id: '2',
        chapter_number: 1,
        title: 'Número #1: El Juicio Ciego',
        cover_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=600',
        pages_count: 28,
        release_date: '2024-02-10',
        links: [
          { id: 'l6', name: 'Leer Online (PDF)', url: 'https://example.com/reader/dd-01', type: 'pdf' },
          { id: 'l7', name: 'Mega', url: 'https://mega.nz/file/dd-01', type: 'cloud' }
        ]
      },
      {
        id: 'c3b',
        comic_id: '2',
        chapter_number: 2,
        title: 'Número #2: Confesionario en Llamas',
        cover_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&q=80&w=600',
        pages_count: 32,
        release_date: '2024-03-01',
        links: [
          { id: 'l6b', name: 'Leer Online (PDF)', url: 'https://example.com/reader/dd-02', type: 'pdf' },
          { id: 'l7b', name: 'Google Drive', url: 'https://drive.google.com/file/d/dd-02', type: 'cloud' }
        ]
      }
    ]
  },
  {
    id: '3',
    title: 'Batman: Ciudad de Sombras',
    original_title: 'Batman: Gotham Shadows',
    cover_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=800',
    banner_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=1600',
    synopsis: 'El Caballero Oscuro enfrenta una conspiración subterránea en Gotham donde antiguos secretos de la corte de los búhos amenazan con derrumbar la mansión Wayne.',
    publisher: 'DC Comics',
    tag: 'Éxitos',
    status: 'En curso',
    writer: 'Scott Snyder',
    artist: 'Greg Capullo',
    translator_typesetter: 'Nocturno Maquetas',
    year: 2024,
    average_rating: 4.7,
    total_ratings: 312,
    download_count: 4890,
    total_issues_label: '#1-3 Colección',
    full_download_links: [
      { id: 'f6', name: 'Mega (Pack Completo)', url: 'https://mega.nz/file/batman-full', type: 'cloud' }
    ],
    chapters: [
      {
        id: 'c4',
        comic_id: '3',
        chapter_number: 1,
        title: 'Número #1: Asfalto Frío',
        cover_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=600',
        pages_count: 34,
        release_date: '2024-01-20',
        links: [
          { id: 'l9', name: 'Leer Online (PDF)', url: 'https://example.com/reader/batman-01', type: 'pdf' },
          { id: 'l10', name: 'Google Drive', url: 'https://drive.google.com/file/d/batman-01', type: 'cloud' },
          { id: 'l10b', name: 'Mega', url: 'https://mega.nz/file/batman-01', type: 'cloud' }
        ]
      }
    ]
  },
  {
    id: '4',
    title: 'The Boys: Sangre y Venganza',
    original_title: 'The Boys: Butcher Edition',
    cover_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&q=80&w=800',
    banner_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=1600',
    synopsis: 'Un grupo de operaciones encubiertas financiado por la CIA se encarga de monitorear y castigar con extrema violencia a los superhéroes corruptos.',
    publisher: 'Dynamite',
    tag: 'Más Descargados',
    status: 'Finalizado',
    writer: 'Garth Ennis',
    artist: 'Darick Robertson',
    translator_typesetter: 'Dynamite Scan Team',
    year: 2021,
    average_rating: 4.9,
    total_ratings: 445,
    download_count: 6780,
    total_issues_label: '#1-6 Tomo Completo Definitive Edition',
    full_download_links: [
      { id: 'f7', name: 'Mega (Tomo Completo)', url: 'https://mega.nz/file/boys-full', type: 'cloud' },
      { id: 'f8', name: 'Mediafire (Tomo Completo)', url: 'https://mediafire.com/file/boys-full', type: 'download' }
    ],
    chapters: [
      {
        id: 'c6',
        comic_id: '4',
        chapter_number: 1,
        title: 'Tomo #1: El Nombre del Juego',
        cover_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&q=80&w=600',
        pages_count: 140,
        release_date: '2021-05-18',
        links: [
          { id: 'l13', name: 'Leer Online (PDF)', url: 'https://example.com/reader/boys-tomo1', type: 'pdf' },
          { id: 'l14', name: 'Mega', url: 'https://mega.nz/file/boys-tomo1', type: 'cloud' }
        ]
      }
    ]
  }
];
