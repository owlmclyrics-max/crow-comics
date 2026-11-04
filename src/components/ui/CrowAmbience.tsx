
import React from 'react';

/**
 * Ambiente "Crow" (luces del Perfil extendidas a toda la web).
 *
 * Capas que reproduce (idéntico estilo al header del perfil):
 *  - Velo de acento degradado (opcional)
 *  - Textura de puntos halftone (`.crow-dots`, color por tema)
 *  - Resplandor radial borroso del color de acento (sigue `--crow-hue`)
 *  - Emblema del cuervo como marca de agua (`.logo-tint`)
 *
 * Uso: colóquese dentro de un contenedor `relative overflow-hidden`
 * y se posiciona pegado a sus bordes sin robar clics (pointer-events-none).
 */

const GLOW_POS: Record<string, string> = {
  right: '-top-24 right-16 h-48 w-96',
  left: '-top-24 left-16 h-48 w-96',
  center: '-top-32 left-1/2 h-56 w-[30rem] -translate-x-1/2',
};

interface CrowAmbienceProps {
  /** Posición del resplandor principal. Por defecto esquina superior derecha. */
  glow?: 'right' | 'left' | 'center' | 'none';
  /** Marca de agua del emblema del cuervo. Por defecto sí. */
  emblem?: boolean;
  /** Velo degradado del acento. Por defecto sí. */
  veil?: boolean;
  /**
   * 'soft' (default): ambiente sutil de fondo.
   * 'bold': más color del tono elegido — lámina radial del acento,
   * resplandor extra en la esquina inferior y línea de luz superior.
   */
  tint?: 'soft' | 'bold';
  /** Clases extra sobre el contenedor. */
  className?: string;
}

export const CrowAmbience: React.FC<CrowAmbienceProps> = ({
  glow = 'right',
  emblem = true,
  veil = true,
  tint = 'soft',
  className = '',
}) => (
  <div
    className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    aria-hidden="true"
  >
    {tint === 'bold' && (
      <>
        {/* Lámina radial del acento (sigue --crow-hue) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(55% 80% at 18% 10%, oklch(0.6 0.21 var(--crow-hue) / 24%), transparent 70%)',
          }}
        />
        {/* Contraluz en la esquina inferior derecha */}
        <div className="absolute -right-24 -bottom-40 h-[24rem] w-[24rem] rounded-full bg-accent/10 blur-3xl" />
        {/* Línea de luz superior */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
      </>
    )}
    {veil && (
      <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-transparent to-transparent" />
    )}
    <div className="crow-dots absolute inset-0 opacity-70" />
    {glow !== 'none' && (
      <div className={`absolute rounded-full ${tint === 'bold' ? 'bg-accent/25' : 'bg-accent/15'} blur-3xl ${GLOW_POS[glow]}`} />
    )}
    {emblem && (
      <img
        src={`${import.meta.env.BASE_URL}crow-emblem.png`}
        alt=""
        className={`logo-tint absolute right-6 top-1/2 w-24 -translate-y-1/2 select-none sm:right-10 sm:w-32 ${tint === 'bold' ? 'opacity-20' : 'opacity-15'}`}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    )}
  </div>
);
