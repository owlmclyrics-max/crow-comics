import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
}

/** Selector de elementos enfocables dentro del panel (para el focus trap). */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Contenedor común para los modales de la app.
 * Gestiona Escape, backdrop, focus trap, bloqueo de scroll del fondo y la
 * estructura visual del panel.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className = '',
  closeOnBackdrop = false,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Foco inicial dentro del panel: evita que Tab mande al fondo de página.
    const previousActive = document.activeElement as HTMLElement | null;
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    focusables?.[0]?.focus();

    // Bloquear el scroll de la página mientras el modal está abierto.
    document.body.classList.add('crow-modal-open');

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      // Focus trap: Tab / Shift+Tab ciclan DENTRO del panel.
      if (event.key === 'Tab' && panelRef.current) {
        const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('crow-modal-open');
      previousActive?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-bg/80 backdrop-blur-sm animate-fade-in"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={`bg-surface border border-line rounded-2xl sm:rounded-3xl shadow-2xl w-full max-h-[calc(100dvh_-_1rem)] sm:max-h-[90dvh] overflow-hidden flex flex-col animate-scale-in [overscroll-behavior:contain] ${className}`}
      >
        {children}
      </div>
    </div>
  );
};
