/**
 * Captura GLOBAL del evento de instalación PWA (beforeinstallprompt).
 *
 * El problema: Chrome/Edge disparan ese evento en cuanto el service worker se
 * activa, a veces ANTES de que React monte los componentes. Si el listener
 * vive dentro de un componente, el evento se pierde y el botón "Instalar"
 * deja de funcionar aunque el navegador sí lo permitiría.
 *
 * Solución: registrar el listener a nivel de módulo (se evalúa apenas carga
 * el bundle, antes del render) y guardar el evento en un caché de módulo.
 * Los componentes se enteran vía eventos custom de window.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Eventos custom que emite este módulo. */
export const INSTALL_PROMPT_EVENT = 'crow:installprompt';
export const APP_INSTALLED_EVENT = 'crow:appinstalled';

let cachedPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Evitar el mini-infobar nativo de Chrome; nosotros ofrecemos el botón.
    e.preventDefault();
    cachedPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event(INSTALL_PROMPT_EVENT));
  });

  window.addEventListener('appinstalled', () => {
    cachedPrompt = null;
    window.dispatchEvent(new Event(APP_INSTALLED_EVENT));
  });
}

/** El evento pendiente del navegador, si ya llegó. */
export const getInstallPrompt = (): BeforeInstallPromptEvent | null => cachedPrompt;

/**
 * ¿La web ya corre como app instalada (ventana propia, sin barra del
 * navegador)? Detecta Chrome/Edge (display-mode) e iOS Safari (navigator).
 */
export const isRunningStandalone = (): boolean => {
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if ((window.navigator as Navigator & { standalone?: boolean }).standalone) return true;
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;
    return false;
  } catch {
    return false;
  }
};
