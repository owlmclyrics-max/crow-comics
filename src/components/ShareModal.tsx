import React, { useEffect, useState } from 'react';
import { X, Share2, Copy, Check } from 'lucide-react';
import { Modal } from './ui/Modal';
import { showToast } from './ui/Toast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

/**
 * v0.9.9.5: modal de compartir con el estilo de la página. Muestra el link
 * legible (con embed de Discord) y un botón de copiar. Nada de la ventana
 * nativa del sistema.
 */
export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, url, title }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) setCopied(false);
  }, [isOpen]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('No se pudo copiar el link', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-3 p-5 border-b border-line">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
            <Share2 className="w-4 h-4 text-accent" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-ink">Compartir</h3>
            <p className="text-[11px] text-mute truncate">{title}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl bg-raised hover:bg-line text-mute hover:text-ink transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="shrink-0 p-5 space-y-3">
        <div className="flex items-stretch gap-2">
          <input
            type="text"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-raised border border-line text-xs text-mute font-mono focus:border-accent focus:outline-none"
            aria-label="Link para compartir"
          />
          <button
            type="button"
            onClick={() => void copy()}
            className={`shrink-0 inline-flex items-center gap-1.5 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              copied
                ? 'bg-accent text-onaccent'
                : 'bg-accent hover:bg-accent2 text-onaccent'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
          </button>
        </div>
        <p className="text-[11px] text-faint">
          Pegalo en Discord, WhatsApp o donde quieras: se ve la carátula con
          nombre, editorial y tomo 🦅
        </p>
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-end p-4 border-t border-line bg-raised/40">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center px-5 py-2.5 rounded-xl bg-accent hover:bg-accent2 text-onaccent text-xs font-bold transition-all active:scale-95"
        >
          Listo
        </button>
      </div>
    </Modal>
  );
};
