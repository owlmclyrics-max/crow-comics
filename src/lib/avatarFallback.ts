/**
 * Avatar con fallback (v0.10.3): si el perfil no tiene foto, se le asigna
 * uno de los avatares de fábrica según su ID — determinista, así la misma
 * persona SIEMPRE muestra el mismo avatar en todos lados (chat, feed,
 * sugerencias) sin escribir nada en la base.
 */
import { DEFAULT_AVATARS } from './avatarGallery';

const hashId = (id: string): number => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
};

/** URL del avatar, o uno aleatorio-permanente de la galería si no tiene. */
export const avatarOrFallback = (url: string | null | undefined, id: string): string => {
  const clean = url?.trim();
  return clean ? clean : DEFAULT_AVATARS[hashId(id) % DEFAULT_AVATARS.length];
};
