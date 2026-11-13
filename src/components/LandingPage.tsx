import React, { useMemo } from 'react';
import { ArrowRight, Feather, Moon, Sparkles, Sun } from 'lucide-react';
import type { Comic } from '../types/comic';
import { useComics } from '../context/ComicsContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useUserAvatar } from './ui/UserAvatar';
import { AccentPicker } from './ui/AccentPicker';
import { proxyImageUrl } from '../lib/imageUrl';

// ==============================================================================
// PANTALLA DE BIENVENIDA (LANDING)
// Fondo de columnas de portadas en bucle infinito alternando dirección,
// emblema central, titular y CTA "LEER COMICS".
//
// Imágenes personalizadas (colócalas en /public y se usan automáticamente):
//   - /crow-logo.png    → lettering rojo "CROW COMICS" (esquina sup. izquierda)
//   - /crow-emblem.png  → emblema circular del cuervo (centro)
// Si no existen, se muestran versiones provisionales de texto/icono.
// ==============================================================================

// Ruta de assets que respeta la base del host (import.meta.env.BASE_URL).
// En Cloudflare Pages/Vercel es "/" (igual que antes); en GitHub Pages con VITE_BASE
// configurado apunta automáticamente a la subcarpeta.
const BASE_URL = import.meta.env.BASE_URL || '/';

interface LandingPageProps {
  onEnterLibrary: () => void;
  onOpenProfile: () => void;
  onOpenSignIn: () => void;
  onOpenSignUp: () => void;
}

// Número de columnas del fondo
const COLUMN_COUNT = 6;
// Duración base del bucle (segundos). Lento y elegante; las columnas
// alternan fases para no ir sincronizadas.
const BASE_DURATION_S = 70;

/** Portadas provisionales (sin catálogo ni carpeta local) mientras carga todo. */
const PLACEHOLDER_COVERS = [
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1613772761876-5c81f35e48a0?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=400',
];

// Portadas locales de src/assets/covers/: se descubren automáticamente en el
// build (sin listar manualmente) y son la fuente prioritaria del mosaico.
// Suelta imágenes ahí y aparecerán en el fondo tras el próximo arranque de dev.
const LOCAL_COVERS = Object.values(
  import.meta.glob('../assets/covers/*.{jpg,jpeg,png,webp,avif}', {
    eager: true,
    import: 'default',
  }),
) as string[];

/** Mezcla aleatoria determinista (same-página siempre igual, sin saltos de patrón). */
const shuffleStable = (list: string[]): string[] => {
  const result = [...list];
  let seed = 421;
  for (let i = result.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280;
    const j = Math.floor((seed / 233280) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterLibrary,
  onOpenProfile,
  onOpenSignIn,
  onOpenSignUp,
}) => {
  const comics: Comic[] = useComics().comics;
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { src: avatarSrc, initials: avatarInitials } = useUserAvatar();

  // Cambio de tema con transición circular desde el botón
  const handleThemeToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    toggleTheme({ x: e.clientX, y: e.clientY });
  };

  // Pool de portadas: locales (src/assets/covers) + catálogo de Supabase,
  // deduplicadas y mezcladas de forma estable para que el patrón no "salte".
  const columns = useMemo(() => {
    const seen = new Set<string>();
    const pool: string[] = [];
    for (const cover of [...LOCAL_COVERS, ...comics.map((comic) => proxyImageUrl(comic.cover_url))]) {
      if (cover && !seen.has(cover)) {
        seen.add(cover);
        pool.push(cover);
      }
    }

    const covers = pool.length === 0 ? PLACEHOLDER_COVERS : shuffleStable(pool);

    // Rellenar hasta tener suficientes portadas para mantener el patrón denso
    const minCovers = COLUMN_COUNT * 3;
    while (covers.length > 0 && covers.length < minCovers) {
      covers.push(...covers);
    }

    return Array.from({ length: COLUMN_COUNT }, (_, colIndex) => {
      // Barremos el catálogo avanzando con offset distinto por columna
      // para que no haya repeticiones adyacentes.
      const columnCovers = covers.length === 0
        ? [...PLACEHOLDER_COVERS, ...PLACEHOLDER_COVERS]
        : covers.filter((_, i) => i % COLUMN_COUNT === colIndex);

      // Copia exactamente duplicada: así al desplazar -50% el patrón encadena
      return [...columnCovers, ...columnCovers];
    });
  }, [comics]);

  return (
    <div className="relative h-[100svh] w-full overflow-hidden bg-bg select-none">
      {/* ====== FONDO: COLUMNAS EN MOSAICO ====== */}
      <div
        className="absolute inset-0 flex gap-2 sm:gap-4 -mx-3 sm:-mx-6"
        aria-hidden="true"
      >
        {columns.map((columnCovers, colIndex) => {
          const goesUp = colIndex % 2 === 0;
          // Fases negativas para que las columnas no vayan sincronizadas
          const delay = -(colIndex * (BASE_DURATION_S / COLUMN_COUNT)) % BASE_DURATION_S;

          return (
            <div
              key={colIndex}
              className={`min-w-0 flex-1 overflow-hidden ${colIndex >= 3 ? 'hidden sm:block' : ''}`}
            >
              <div
                className={`crow-column-track ${goesUp ? 'crow-column-up' : 'crow-column-down'}`}
                style={{
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ['--crow-duration' as any]: `${BASE_DURATION_S + colIndex * 4}s`,
                  animationDelay: `${delay}s`,
                }}
              >
                {columnCovers.map((coverUrl, coverIndex) => (
                  <img
                    key={`${colIndex}-${coverIndex}`}
                    src={coverUrl}
                    alt=""
                    loading="lazy"
                    className="w-full aspect-[2/3] object-cover rounded-lg sm:rounded-xl border border-line shadow-xl my-1.5 sm:my-2 opacity-70"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PLACEHOLDER_COVERS[0];
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ====== SUPERPOSICIÓN: VIÑETA NEGRA + TOQUE ROJO EN LA BASE ====== */}
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/40" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.8) 100%)',
        }}
      />
      {/* Glow rojo bajo el emblema */}
      <div className="absolute left-1/2 top-[8%] -translate-x-1/2 w-72 h-72 sm:w-[36rem] sm:h-[36rem] bg-accent/15 blur-3xl rounded-full pointer-events-none" />

      {/* ====== CONTENIDO ====== */}
      <div className="relative z-10 flex h-full min-h-[100svh] flex-col">
        {/* Barra superior: logo + botones de sesión */}
        <div className="flex items-center justify-between gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-10 sm:pt-6">
          {/* Logo: usa /crow-logo.png si el usuario lo sube a /public */}
          <a
            href="/crow-logo.png"
            onClick={(e) => e.preventDefault()}
            className="group"
            title="Crow Comics"
          >
            <img
              src={`${BASE_URL}crow-logo.png`}
              alt="Crow Comics"
              className="logo-tint h-8 max-w-[38vw] object-contain object-left sm:h-14 md:h-16 sm:max-w-none w-auto drop-shadow-[0_2px_12px_oklch(0.63_0.21_var(--crow-hue)/45%)] transition-transform group-hover:scale-105"
              onError={(e) => {
                // Fallback: si no existe crow-logo.png, mostramos el texto estilizado
                const target = e.currentTarget;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <span className="hidden font-landing text-xl sm:text-4xl md:text-5xl text-accent uppercase tracking-wide font-black drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] group-hover:text-accent2 transition-colors">
              Crow Comics
            </span>
          </a>

          {/* Tema claro/oscuro (junto a los botones de sesión) */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              onClick={handleThemeToggle}
              className="rounded-full border border-white/15 bg-black/35 p-2 text-white shadow-lg backdrop-blur-md transition-all hover:bg-black/50 active:scale-90 sm:p-2.5"
              title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            >
              {theme === 'dark'
                ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
                : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>

            {/* Selector de color de acento (mismo control que el Navbar) */}
            <AccentPicker variant="pill" />

            {user ? (
              /* Ya con sesión: botón bonito directo al perfil */
              <button
                onClick={onOpenProfile}
                className="group flex items-center gap-2 rounded-full border border-accent/30 bg-gradient-to-b from-accent to-accent2 px-2.5 py-1.5 text-[11px] font-bold text-onaccent shadow-lg shadow-accent/25 transition-all hover:from-accent2 hover:to-accent2 active:scale-95 sm:gap-2.5 sm:px-6 sm:py-2.5 sm:text-sm"
                title="Ir a mi perfil"
              >
                <span className="relative w-6 h-6 rounded-full bg-onaccent/10 overflow-hidden flex items-center justify-center text-[10px] font-black uppercase shrink-0 sm:w-7 sm:h-7 sm:text-[11px]">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    avatarInitials
                  )}
                </span>
                <span className="sm:hidden">Perfil</span>
                <span className="hidden sm:inline">Mi Perfil</span>
              </button>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-4">
              <button
                onClick={onOpenSignIn}
                className="rounded-full border border-white/15 bg-black/35 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-lg backdrop-blur-md transition-all hover:bg-black/50 sm:px-7 sm:py-2.5 sm:text-base sm:tracking-wider"
              >
                <span className="sm:hidden">Entrar</span>
                <span className="hidden sm:inline">Iniciar sesión</span>
              </button>
              <button
                onClick={onOpenSignUp}
                className="rounded-full px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide shadow-lg shadow-accent/25 bg-gradient-to-b from-accent to-accent2 border border-accent/30 text-onaccent transition-all active:scale-95 sm:px-7 sm:py-2.5 sm:text-base sm:tracking-wider"
              >
                <span className="sm:hidden">Crear cuenta</span>
                <span className="hidden sm:inline">Registrarse</span>
              </button>
            </div>
          )}
          </div>
        </div>

        {/* Centro: emblema + titular + CTA */}
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 py-4 sm:px-6 sm:py-0">
          {/* Tarjeta siempre "dark glass": el fondo es la foto de portadas con
              viñeta negra en AMBOS temas, así el texto claro es fijo y legible */}
          <div className="relative flex w-full max-w-2xl flex-col items-center gap-3 rounded-[1.5rem] border border-white/10 bg-black/35 px-4 py-4 text-center shadow-[0_25px_100px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:gap-5 sm:rounded-[2rem] sm:border-0 sm:bg-transparent sm:px-6 sm:py-8 sm:shadow-none sm:backdrop-blur-0">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.22em] text-accent sm:px-3 sm:py-1.5 sm:text-[10px]">
            <Sparkles className="h-3 w-3 text-accent" />
            Tu universo de cómics
          </div>
          {/* Emblema: usa /crow-emblem.png si el usuario lo sube a /public */}
          <div className="relative rounded-full bg-accent/10 p-2 ring-1 ring-accent/20 shadow-[0_0_70px_oklch(0.63_0.21_var(--crow-hue)/22%)] sm:p-0 sm:ring-0 sm:shadow-none">
            <img
              src={`${BASE_URL}crow-emblem.png`}
              alt="Emblema de Crow Comics"
              className="logo-tint h-[26svh] w-[26svh] object-contain drop-shadow-[0_10px_40px_oklch(0.63_0.21_var(--crow-hue)/60%)] animate-parallax-float sm:h-[32svh] sm:w-[32svh] md:h-[36svh] md:w-[36svh]"
              onError={(e) => {
                // Fallback: círculo con emblema genérico de pluma
                const target = e.currentTarget;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div
              className="hidden h-[26svh] w-[26svh] items-center justify-center rounded-full border-4 border-accent/30 bg-gradient-to-br from-accent via-accent2 to-accent2 shadow-[0_10px_50px_oklch(0.63_0.21_var(--crow-hue)/50%)] animate-parallax-float sm:h-[32svh] sm:w-[32svh] sm:border-8 md:h-[36svh] md:w-[36svh]"
            >
              <Feather className="h-14 w-14 text-accent stroke-[1.5] sm:h-28 sm:w-28" />
            </div>
          </div>

          {/* Titular estilo cómic — texto claro FIJO: el fondo del héroe es
              la foto de portadas con viñeta (oscura en ambos temas) */}
          <h1 className="max-w-xl font-landing text-2xl font-black leading-[1.08] tracking-tight text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)] sm:text-4xl md:text-5xl">
            Lee, guarda tus <span className="text-accent">cómics</span>
          </h1>
          <p className="max-w-md text-xs leading-relaxed text-white/80 sm:text-base">
            Descubre nuevas historias, sigue tus lecturas y encuentra a tus personajes favoritos.
          </p>

          {/* Botón principal */}
          <button
            onClick={onEnterLibrary}
            className="group flex w-full max-w-sm items-center justify-center gap-2.5 rounded-2xl border border-accent/30 bg-gradient-to-b from-accent to-accent2 px-5 py-2.5 shadow-xl shadow-accent/25 transition-all hover:from-accent2 hover:to-accent2 hover:scale-[1.03] active:scale-95 sm:gap-4 sm:px-10 sm:py-4"
          >
            <span className="font-landing text-base font-black uppercase tracking-[0.12em] text-onaccent drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] sm:text-2xl sm:tracking-wider">
              Explorar cómics
            </span>
            <ArrowRight className="h-4 w-4 text-onaccent transition-transform group-hover:translate-x-1 sm:h-6 sm:w-6" />
          </button>
          <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-white/60 sm:text-[10px]">
            Historias para descubrir · Lecturas para guardar
          </span>
          </div>
        </main>
        </div>
      </div>
  );
};
