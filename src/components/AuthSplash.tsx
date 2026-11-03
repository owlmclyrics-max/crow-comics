import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Banner de confirmación cuando alguien inicia sesión
 * (Google, email o consola admin): chulito animado + "Sesión iniciada".
 * Se oculta automáticamente tras unos segundos.
 */
export const AuthSplash: React.FC = () => {
  const { user, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const initialized = React.useRef(false);

  useEffect(() => {
    if (loading) return;

    // La primera resolución (restauración de sesión al recargar) no lanza el splash
    if (!initialized.current) {
      initialized.current = true;
      return;
    }

    if (user) {
      setVisible(true);
      const timer = window.setTimeout(() => setVisible(false), 3000);
      return () => window.clearTimeout(timer);
    }
  }, [user, loading]);

  if (!visible || !user) return null;

  return (
    <div className="fixed inset-x-0 top-6 z-[100] flex justify-center pointer-events-none px-4">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-3.5 px-6 py-3.5 rounded-2xl bg-zinc-900/95 border border-red-500/40 shadow-2xl shadow-red-950/60 backdrop-blur-md animate-fade-in"
      >
        <CheckCircle2
          className="w-7 h-7 text-red-500 stroke-[2.5] check-pop drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]"
        />
        <div>
          <p className="text-sm font-bold text-white leading-tight">Sesión iniciada</p>
          <p className="text-[11px] text-zinc-400">Bienvenido, {user.email?.split('@')[0]}</p>
        </div>
      </div>
    </div>
  );
};
