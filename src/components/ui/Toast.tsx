import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

// ==============================================================================
// SPRINT 2.5: micro-sistema de notificaciones (toast).
// Sin contexto ni providers: showToast() emite un evento de ventana y el
// <ToastHost> montado en App lo escucha y apila los avisos arriba a la derecha.
// ==============================================================================

const TOAST_EVENT = 'crow:toast';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

/** Lanza una notificación global: showToast('¡Añadido a terminados!') */
export const showToast = (message: string, variant: ToastVariant = 'success'): void => {
  window.dispatchEvent(
    new CustomEvent<ToastItem>(TOAST_EVENT, {
      detail: { id: Date.now() + Math.random(), message, variant },
    }),
  );
};

const VARIANT_STYLES: Record<ToastVariant, { icon: React.ReactNode; ring: string }> = {
  success: {
    icon: <CheckCircle2 className="w-5 h-5 text-accent stroke-[2.5] shrink-0" />,
    ring: 'border-accent/30',
  },
  error: {
    icon: <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />,
    ring: 'border-amber-500/40',
  },
  info: {
    icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
    ring: 'border-sky-500/40',
  },
};

/** Host fijo de notificaciones: se monta una vez en App y permanece invisible hasta que showToast() lo despierta. */
export const ToastHost: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const toast = (event as CustomEvent<ToastItem>).detail;
      setToasts((prev) => [...prev.slice(-2), toast]); // máximo 3 apilados

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 3200);
    };

    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-6 right-4 sm:right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface/95 border ${
            VARIANT_STYLES[toast.variant].ring
          } shadow-2xl shadow-accent/30 backdrop-blur-md animate-fade-in max-w-xs`}
        >
          {VARIANT_STYLES[toast.variant].icon}
          <p className="text-sm font-semibold text-ink leading-tight">{toast.message}</p>
          <button
            type="button"
            aria-label="Cerrar notificación"
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="p-1 rounded-lg text-faint hover:text-ink transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
