
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Sistema de temas Crow Comics.
 *
 * - `theme`: 'dark' | 'light' → controla fondos, superficies y tinta vía
 *   [data-theme] en <html>. Persistido en localStorage.
 * - `accentHue`: 0-360 → el único valor que gobierna TODOS los rojos/acento
 *   de la UI (botones, enlaces, insignias, logotipos con `.logo-tint`).
 *   Persistido en localStorage.
 *
 * El cambio de tema usa la View Transitions API (aparece un círculo que se
 * expande desde el botón que lo activa). En navegadores sin soporte cae a
 * una transición CSS suave (clase .theme-anim).
 */

export type CrowTheme = 'dark' | 'light';

const THEME_KEY = 'crow_theme';
const HUE_KEY = 'crow_accent_hue';

/** Hue por defecto: el rojo Crow actual. */
export const DEFAULT_HUE = 25;

/** Presets del selector de acento (nombre + hue en OKLCH). */
export const ACCENT_PRESETS: { name: string; hue: number }[] = [
  { name: 'Rojo Crow', hue: 25 },
  { name: 'Naranja', hue: 50 },
  { name: 'Dorado', hue: 80 },
  { name: 'Verde Esmeralda', hue: 150 },
  { name: 'Cian', hue: 195 },
  { name: 'Azul Eléctrico', hue: 255 },
  { name: 'Violeta', hue: 300 },
  { name: 'Rosa Fucsia', hue: 350 },
];

/**
 * Los acentos "brillantes" (amarillos/verdes/ceyes claros) piden luz y texto
 * oscuro encima. Rango aproximado de hues que lo necesitan.
 */
function isBrightHue(hue: number): boolean {
  const normalized = ((hue % 360) + 360) % 360;
  return normalized >= 55 && normalized <= 200;
}

/** Aplica tema + hue al <html> (sin animación, para el arranque). */
function applyGlobals(theme: CrowTheme, hue: number) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.accent = isBrightHue(hue) ? 'bright' : 'deep';
  root.style.setProperty('--crow-hue', String(hue));
}

interface ThemeContextValue {
  theme: CrowTheme;
  /** Alterna tema con transición circular desde el punto (x, y) del clic. */
  toggleTheme: (origin?: { x: number; y: number }) => void;
  accentHue: number;
  setAccentHue: (hue: number, isPreset?: boolean) => void;
  isPreset: boolean;
  isBrightAccent: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialTheme(): CrowTheme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark'; // Crow Comics nace de noche 🦅
}

function readInitialHue(): number {
  const stored = Number(localStorage.getItem(HUE_KEY));
  return Number.isFinite(stored) && stored >= 0 && stored <= 360 ? stored : DEFAULT_HUE;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<CrowTheme>(readInitialTheme);
  const [hue, setHueState] = useState<number>(readInitialHue);
  const [lastPreset, setLastPreset] = useState<boolean>(true);

  useEffect(() => {
    applyGlobals(theme, hue);
  }, [theme, hue]);

  const toggleTheme = useCallback(
    (origin?: { x: number; y: number }) => {
      const next: CrowTheme = theme === 'dark' ? 'light' : 'dark';
      const root = document.documentElement;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Ancla del círculo de expansión (por defecto: esquina sup. derecha).
      if (origin) {
        root.style.setProperty('--vt-x', `${origin.x}px`);
        root.style.setProperty('--vt-y', `${origin.y}px`);
      } else {
        root.style.setProperty('--vt-x', '95%');
        root.style.setProperty('--vt-y', '24px');
      }

      const commit = () => {
        setTheme(next);
        localStorage.setItem(THEME_KEY, next);
      };

      // 1) Chromium: círculo expandiéndose desde el botón.
      if (document.startViewTransition && !reduced) {
        document.startViewTransition(commit);
        return;
      }

      // 2) Fallback: transición CSS suave global durante 450ms.
      if (!reduced) {
        root.classList.add('theme-anim');
        window.setTimeout(() => root.classList.remove('theme-anim'), 480);
      }
      commit();
    },
    [theme],
  );

  const setAccentHue = useCallback((next: number, isPreset = false) => {
    const clamped = Math.max(0, Math.min(360, Math.round(next)));
    setHueState(clamped);
    // Recordamos si el hue actual viene de un preset: al mover la línea
    // dejamos de estar "en preset"; al tocar un preset volvemos a marcarlo.
    setLastPreset(isPreset);
    localStorage.setItem(HUE_KEY, String(clamped));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme,
      accentHue: hue,
      setAccentHue,
      isPreset: lastPreset,
      isBrightAccent: isBrightHue(hue),
    }),
    [theme, toggleTheme, hue, setAccentHue, lastPreset],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
