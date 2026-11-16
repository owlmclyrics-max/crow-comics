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
