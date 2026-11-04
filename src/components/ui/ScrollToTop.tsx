import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Botón flotante para volver arriba. Aparece tras bajar ~500px y no se
 * muestra a media altura en la pantalla de bienvenida (allí es un one-screen).
 */
export const ScrollToTop: React.FC<{ hidden?: boolean }> = ({ hidden = false }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (hidden || !visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Volver arriba"
      className="fixed bottom-20 md:bottom-6 right-4 z-40 p-3 rounded-full bg-accent text-onaccent shadow-2xl shadow-accent/30 hover:bg-accent2 transition-all hover:-translate-y-1 active:scale-90 animate-fade-in"
    >
      <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
    </button>
  );
};
