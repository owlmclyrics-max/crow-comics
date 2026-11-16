/**
 * Helpers de Google Drive (v0.9.9.9.3).
 * Usados por el conversor del panel de ayuda y por el formulario de tomos:
 * ahí, pegar cualquier link de compartir de Drive se convierte SOLO en
 * lectura online (/preview) + descarga directa (uc?export=download).
 */

/** Extrae el FILE_ID de cualquier variante de link de Drive:
    /file/d/ID/view, open?id=ID, uc?export=download&id=ID, /d/ID. */
export const parseDriveId = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  let m = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  m = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  m = trimmed.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  return null;
};

/** URL del visor embebido (la que usa "Leer Online — PDF"). */
export const buildDrivePreviewUrl = (fileId: string): string =>
  `https://drive.google.com/file/d/${fileId}/preview`;

/** URL de descarga directa (baja el archivo sin abrir Drive). */
export const buildDriveDownloadUrl = (fileId: string): string =>
  `https://drive.google.com/uc?export=download&id=${fileId}`;

/** ¿La URL apunta a Google Drive? */
export const isDriveLink = (url: string): boolean => url.includes('drive.google.com');

/* ── v0.9.9.9.4: auto-detección del servidor ─────────────────────────────── */

export type ChapterLinkType = 'pdf' | 'cloud' | 'download' | 'other';

export interface ServerMatch {
  name: string;
  type: ChapterLinkType;
}

/** Nombres que el sistema pone solo — si el link dice otra cosa, es un
    nombre puesto a mano y no lo pisamos. */
export const GENERIC_SERVER_NAMES = ['mega', 'drive', 'mediafire', '1fichier', ''];

export const detectServer = (url: string): ServerMatch | null => {
  const u = url.toLowerCase();
  if (isDriveLink(u)) return { name: 'Drive', type: 'cloud' };
  if (/mega(\.nz|\.io|\.cx)\//.test(u)) return { name: 'Mega', type: 'cloud' };
  if (/mediafire\.com\//.test(u)) return { name: 'Mediafire', type: 'download' };
  if (/1fichier\.com\//.test(u)) return { name: '1Fichier', type: 'download' };
  return null;
};
