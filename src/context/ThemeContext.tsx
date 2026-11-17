
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Sistema de temas Crow Comics.
 *
 * - `theme`: 'dark' | 'light' → controla fondos, superficies y tinta vía
 *   [data-theme] en <html>. Persistido en localStorage.
 * - `accentHue`: 0-360 → el único valor que gobierna TODOS los rojos/acento
 *   de la UI (botones, enlaces, insignias, logotipos con `.logo-tint`).
 *   Persistido en localStorage.
 * - `accent2Hue` (v0.9.9.9.9.4): hue propio para el color secundario
 *   (acento2). null = "ligado": accent2 usa el mismo hue del acento
 *   (comportamiento clásico). Los degradados accent→accent2 pasan a ser
 *   bicolor cuando se elige un hue distinto.
 * - `radius` / `ambience` / `motion`: personalización de forma — esquinas
 *   de la UI, intensidad del ambiente de fondo y nivel de animación.
 *   Persistidos y aplicados como data-atributos en <html>.
 *
 * El cambio de tema usa la View Transitions API (aparece un círculo que se
 * expande desde el botón que lo activa). En navegadores sin soporte cae a
 * una transición CSS suave (clase .theme-anim).
 */

export type CrowTheme = 'dark' | 'light';
/** v0.9.9.9.9.4: forma de las esquinas de toda la interfaz. */
export type CrowRadius = 'normal' | 'soft' | 'sharp';
/** v0.9.9.9.9.4: intensidad del ambiente de fondo (resplandor/dots). */
export type CrowAmbienceLevel = 'on' | 'dim' | 'off';
/** v0.9.9.9.9.4: nivel de animación. */
export type CrowMotion = 'full' | 'calm';

const THEME_KEY = 'crow_theme';
const HUE_KEY = 'crow_accent_hue';
const HUE2_KEY = 'crow_accent2_hue';
const RADIUS_KEY = 'crow_radius';
const AMBIENCE_KEY = 'crow_ambience';
const MOTION_KEY = 'crow_motion';

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

/** Aplica tema + hue + personalización al <html> (sin animación, para el arranque). */
function applyGlobals(
  theme: CrowTheme,
  hue: number,
  hue2: number | null,
  radius: CrowRadius,
  ambience: CrowAmbienceLevel,
  motion: CrowMotion,
) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.accent = isBrightHue(hue) ? 'bright' : 'deep';
  root.dataset.radius = radius;
  root.dataset.ambience = ambience;
  root.dataset.motion = motion;
  root.style.setProperty('--crow-hue', String(hue));
  if (hue2 === null) {
    // Ligado: accent2 comparte el hue del acento (comportamiento clásico).
    root.style.removeProperty('--crow-hue2');
  } else {
    root.style.setProperty('--crow-hue2', String(hue2));
  }
}

interface ThemeContextValue {
  theme: CrowTheme;
  /** Alterna tema con transición circular desde el punto (x, y) del clic. */
  toggleTheme: (origin?: { x: number; y: number }) => void;
  accentHue: number;
  setAccentHue: (hue: number, isPreset?: boolean) => void;
  isPreset: boolean;
  isBrightAccent: boolean;
  /** v0.9.9.9.9.4: hue del acento secundario (null = ligado al acento). */
  accent2Hue: number | null;
  setAccent2Hue: (hue: number | null) => void;
  radius: CrowRadius;
  setRadius: (radius: CrowRadius) => void;
  ambience: CrowAmbienceLevel;
  setAmbience: (level: CrowAmbienceLevel) => void;
  motion: CrowMotion;
  setMotion: (motion: CrowMotion) => void;
  /** Vuelve todo (tema incluido no: solo forma y colores) a los defaults. */
  resetCustomization: () => void;
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

function readInitialHue2(): number | null {
  const raw = localStorage.getItem(HUE2_KEY);
  if (raw === null) return null; // ligado por defecto
  const stored = Number(raw);
  return Number.isFinite(stored) && stored >= 0 && stored <= 360 ? stored : null;
}

function readInitialRadius(): CrowRadius {
  const stored = localStorage.getItem(RADIUS_KEY);
  if (stored === 'soft' || stored === 'normal' || stored === 'sharp') return stored;
  return 'normal';
}

function readInitialAmbience(): CrowAmbienceLevel {
  const stored = localStorage.getItem(AMBIENCE_KEY);
  if (stored === 'on' || stored === 'dim' || stored === 'off') return stored;
  return 'on';
}

function readInitialMotion(): CrowMotion {
  const stored = localStorage.getItem(MOTION_KEY);
  if (stored === 'full' || stored === 'calm') return stored;
  return 'full';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<CrowTheme>(readInitialTheme);
  const [hue, setHueState] = useState<number>(readInitialHue);
  const [lastPreset, setLastPreset] = useState<boolean>(true);
  // v0.9.9.9.9.4: personalización de forma
  const [hue2, setHue2State] = useState<number | null>(readInitialHue2);
  const [radius, setRadiusState] = useState<CrowRadius>(readInitialRadius);
  const [ambience, setAmbienceState] = useState<CrowAmbienceLevel>(readInitialAmbience);
  const [motion, setMotionState] = useState<CrowMotion>(readInitialMotion);

  useEffect(() => {
    applyGlobals(theme, hue, hue2, radius, ambience, motion);
  }, [theme, hue, hue2, radius, ambience, motion]);

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

  /** v0.9.9.9.9.4: hue del secundario. null lo vuelve a ligar al acento. */
  const setAccent2Hue = useCallback((next: number | null) => {
    if (next === null) {
      setHue2State(null);
      localStorage.removeItem(HUE2_KEY);
      return;
    }
    const clamped = Math.max(0, Math.min(360, Math.round(next)));
    setHue2State(clamped);
    localStorage.setItem(HUE2_KEY, String(clamped));
  }, []);

  const setRadius = useCallback((next: CrowRadius) => {
    setRadiusState(next);
    localStorage.setItem(RADIUS_KEY, next);
  }, []);

  const setAmbience = useCallback((next: CrowAmbienceLevel) => {
    setAmbienceState(next);
    localStorage.setItem(AMBIENCE_KEY, next);
  }, []);

  const setMotion = useCallback((next: CrowMotion) => {
    setMotionState(next);
    localStorage.setItem(MOTION_KEY, next);
  }, []);

  /** Restaurar colores y forma (el claro/oscuro se queda como esté). */
  const resetCustomization = useCallback(() => {
    setHue2State(null);
    localStorage.removeItem(HUE2_KEY);
    setRadiusState('normal');
    localStorage.setItem(RADIUS_KEY, 'normal');
    setAmbienceState('on');
    localStorage.setItem(AMBIENCE_KEY, 'on');
    setMotionState('full');
    localStorage.setItem(MOTION_KEY, 'full');
    setHueState(DEFAULT_HUE);
    setLastPreset(true);
    localStorage.setItem(HUE_KEY, String(DEFAULT_HUE));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme,
      accentHue: hue,
      setAccentHue,
      isPreset: lastPreset,
      isBrightAccent: isBrightHue(hue),
      accent2Hue: hue2,
      setAccent2Hue,
      radius,
      setRadius,
      ambience,
      setAmbience,
      motion,
      setMotion,
      resetCustomization,
    }),
    [theme, toggleTheme, hue, setAccentHue, lastPreset, hue2, setAccent2Hue, radius, setRadius, ambience, setAmbience, motion, setMotion, resetCustomization],
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
