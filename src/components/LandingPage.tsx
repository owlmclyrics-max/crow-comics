import React, { useMemo } from 'react';
import { Feather, Play } from 'lucide-react';
import type { Comic } from '../types/comic';
import { useComics } from '../context/ComicsContext';
import { useAuth } from '../context/AuthContext';

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
// En Vercel/Netlify es "/" (igual que antes); en GitHub Pages con VITE_BASE
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

  // Pool de portadas: locales (src/assets/covers) + catálogo de Supabase,
  // deduplicadas y mezcladas de forma estable para que el patrón no "salte".
  const columns = useMemo(() => {
    const seen = new Set<string>();
    const pool: string[] = [];
    for (const cover of [...LOCAL_COVERS, ...comics.map((comic) => comic.cover_url)]) {
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
    <div className="fixed inset-0 overflow-hidden bg-zinc-950 select-none">
      {/* ====== FONDO: COLUMNAS EN MOSAICO ====== */}
      <div
        className="absolute inset-0 flex gap-3 sm:gap-4 -mx-6"
        aria-hidden="true"
      >
        {columns.map((columnCovers, colIndex) => {
          const goesUp = colIndex % 2 === 0;
          // Fases negativas para que las columnas no vayan sincronizadas
          const delay = -(colIndex * (BASE_DURATION_S / COLUMN_COUNT)) % BASE_DURATION_S;

          return (
            <div
              key={colIndex}
              className="flex-1 overflow-hidden"
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
                    className="w-full aspect-[2/3] object-cover rounded-xl border border-zinc-900 shadow-xl my-2 opacity-70"
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
      <div className="absolute left-1/2 top-[8%] -tranzinc-x-1/2 w-[36rem] h-[36rem] bg-red-600/15 blur-3xl rounded-full pointer-events-none" />

      {/* ====== CONTENIDO ====== */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Barra superior: logo + botones de sesión */}
        <div className="flex items-center justify-between px-6 sm:px-10 pt-6">
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
              className="h-12 sm:h-14 md:h-16 w-auto drop-shadow-[0_2px_12px_rgba(220,38,38,0.45)] transition-transform group-hover:scale-105"
              onError={(e) => {
                // Fallback: si no existe crow-logo.png, mostramos el texto estilizado
                const target = e.currentTarget;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <span className="hidden font-landing text-3xl sm:text-4xl md:text-5xl text-red-600 uppercase tracking-wide font-black drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] group-hover:text-red-500 transition-colors">
              Crow Comics
            </span>
          </a>

          {user ? (
            /* Ya con sesión: botón bonito directo al perfil */
            <button
              onClick={onOpenProfile}
              className="group flex items-center gap-2.5 px-5 sm:px-6 py-2.5 rounded-full bg-gradient-to-b from-red-500 to-red-700 text-white text-sm font-bold shadow-lg shadow-red-900/50 border border-red-400/30 hover:from-red-400 hover:to-red-600 transition-all active:scale-95"
              title="Ir a mi perfil"
            >
              <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-[11px] font-black uppercase shrink-0">
                {(user.email ?? '?').slice(0, 2)}
              </span>
              <span className="hidden sm:inline">Mi Perfil</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={onOpenSignIn}
                className="px-5 sm:px-7 py-2.5 rounded-full border border-zinc-300/40 bg-gradient-to-b from-zinc-700/80 to-zinc-900/90 text-zinc-100 text-sm sm:text-base font-landing uppercase tracking-wider shadow-lg hover:from-zinc-600/80 hover:to-zinc-800 transition-all"
              >
                Iniciar Sesion
              </button>
              <button
                onClick={onOpenSignUp}
                className="px-5 sm:px-7 py-2.5 rounded-full bg-gradient-to-b from-red-500 to-red-700 text-white text-sm sm:text-base font-landing uppercase tracking-wider shadow-lg shadow-red-900/50 border border-red-400/30 hover:from-red-400 hover:to-red-600 transition-all"
              >
                Registrarse
              </button>
            </div>
          )}
        </div>

        {/* Centro: emblema + titular + CTA */}
        <div className="flex-1 flex flex-col items-center justify-center gap-7 px-6 -mt-6">
          {/* Emblema: usa /crow-emblem.png si el usuario lo sube a /public */}
          <div className="relative">
            <img
              src={`${BASE_URL}crow-emblem.png`}
              alt="Emblema de Crow Comics"
              className="w-52 h-52 sm:w-72 sm:h-72 object-contain drop-shadow-[0_10px_50px_rgba(185,28,28,0.55)] animate-parallax-float"
              onError={(e) => {
                // Fallback: círculo con emblema genérico de pluma
                const target = e.currentTarget;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div
              className="hidden w-52 h-52 sm:w-72 sm:h-72 rounded-full bg-gradient-to-br from-red-500 via-red-800 to-red-950 border-8 border-red-900 flex items-center justify-center shadow-[0_10px_50px_rgba(185,28,28,0.5)] animate-parallax-float"
            >
              <Feather className="w-20 h-20 sm:w-28 sm:h-28 text-red-200 stroke-[1.5]" />
            </div>
          </div>

          {/* Titular estilo cómic */}
          <h1 className="font-landing text-center text-white text-2xl sm:text-4xl leading-snug drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)] max-w-xl">
            Lee, guarda tus comics
            <br />
            y mira tus personajes
            <br />
            favoritos
          </h1>

          {/* Botón principal */}
          <button
            onClick={onEnterLibrary}
            className="group flex items-center gap-4 px-8 sm:px-10 py-3.5 rounded-2xl bg-gradient-to-b from-red-500 to-red-700 border-2 border-red-900 shadow-xl shadow-red-900/60 hover:from-red-400 hover:to-red-600 hover:scale-[1.03] active:scale-95 transition-all"
          >
            <span className="font-landing text-white text-xl sm:text-2xl uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Leer Comics
            </span>
            <Play className="w-6 h-6 fill-zinc-900 text-zinc-900 group-hover:tranzinc-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
