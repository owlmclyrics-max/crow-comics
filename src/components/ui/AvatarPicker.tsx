import React, { useEffect, useState } from 'react';
import { Check, Code2, ImageOff, Plus, X } from 'lucide-react';
import {
  DEFAULT_AVATARS,
  loadAvatarGallery,
  saveAvatarGallery,
} from '../../lib/avatarGallery';
import { showToast } from './Toast';
import { useAuth } from '../../context/AuthContext';

interface AvatarPickerProps {
  /** URL del avatar seleccionado actualmente. */
  value: string;
  /** Notifica cada cambio de selección (clic en un tile). */
  onChange: (url: string) => void;
}

/**
 * Selector de avatar con galería compartida.
 * - Lista inicial: 8 avatares de fábrica. En cuanto el admin administra
 *   (añade o quita), la lista guardada en app_config es la autoritativa y
 *   TODA ella es editable (se puede quitar también un avatar de fábrica).
 * - "Modo desarrollador" abre un panel con la lista completa: miniatura, URL,
 *   X para quitar y campo para añadir nuevas (p. ej. fotos de personajes).
 */
export const AvatarPicker: React.FC<AvatarPickerProps> = ({ value, onChange }) => {
  const { isAdmin } = useAuth();
  const [avatars, setAvatars] = useState<string[]>(DEFAULT_AVATARS);
  const [devOpen, setDevOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [busy, setBusy] = useState(false);
  // URLs cuya imagen está rota (para avisar en el panel)
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    void loadAvatarGallery().then((saved) => {
      // Si hay lista guardada, es autoritativa (incluye quitados/añadidos).
      // Si está vacía (primera vez), se conservan los de fábrica.
      if (!cancelled && saved.length > 0) setAvatars(saved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = async (next: string[]) => {
    setAvatars(next);
    setBusy(true);
    const ok = await saveAvatarGallery(next);
    setBusy(false);
    if (!ok) {
      showToast('Se guardó solo en este navegador: revisa el SQL de app_config para compartirlo', 'error');
    } else {
      showToast('Galería de avatares actualizada para todos los usuarios');
    }
  };

  const handleAdd = async () => {
    // Tolerante: si pegan "www.ejemplo.com/foto.jpg" añadimos el https:// solo.
    let url = newUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (!/^https?:\/\/\S+\.\S+/.test(url)) {
      showToast('Pega una URL de imagen válida (ej. https://ejemplo.com/foto.jpg)', 'info');
      return;
    }
    if (avatars.includes(url)) {
      showToast('Ese avatar ya está en la galería', 'info');
      return;
    }
    setNewUrl('');
    const next = [...avatars, url];
    await persist(next);
    // Lo dejamos seleccionado para que se vea el resultado al instante
    onChange(url);
  };

  const handleRemove = async (url: string) => {
    if (avatars.length <= 1) {
      showToast('Debe quedar al menos un avatar en la galería', 'info');
      return;
    }
    const next = avatars.filter((a) => a !== url);
    await persist(next);
    // Si quitamos el seleccionado, pasa al primero disponible
    if (value === url) onChange(next[0]);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        {avatars.map((avatar) => (
          <button
            key={avatar}
            type="button"
            onClick={() => onChange(avatar)}
            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
              value === avatar
                ? 'border-red-500 ring-2 ring-red-500/40'
                : 'border-zinc-700 hover:border-zinc-500'
            }`}
          >
            <img
              src={avatar}
              alt="Avatar"
              loading="lazy"
              className="w-full h-full object-cover"
              onError={(e) => {
                setBroken((prev) => ({ ...prev, [avatar]: true }));
                e.currentTarget.style.opacity = '0.15';
              }}
            />
            {value === avatar && (
              <div className="absolute inset-0 bg-red-500/25 flex items-center justify-center">
                <Check className="w-6 h-6 text-white drop-shadow" />
              </div>
            )}
            {/* X de borrado: solo en modo dev, sobre cualquier avatar */}
            {devOpen && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleRemove(avatar);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    void handleRemove(avatar);
                  }
                }}
                title="Quitar de la galería"
                className="absolute top-1 right-1 p-1 rounded-full bg-zinc-950/90 border border-zinc-600 text-zinc-300 hover:bg-red-500 hover:border-red-500 hover:text-zinc-950 transition-colors"
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Modo desarrollador: SOLO administradores (la galería es global) */}
      {isAdmin && (
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={() => setDevOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors ${
              devOpen ? 'text-red-400' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            {devOpen ? 'Cerrar modo desarrollador' : 'Modo desarrollador: administrar avatares'}
          </button>

          {devOpen && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-3">
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Añade o QUITA avatares de la galería que eligen todos los usuarios (incluidos los 8
                de fábrica). Lo que guardes aquí es lo que verá todo el sitio.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleAdd();
                  }}
                  placeholder="https://... (foto del personaje)"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-red-500 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => void handleAdd()}
                  disabled={busy || !newUrl.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-zinc-950 text-xs font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Añadir
                </button>
              </div>

              {/* Lista completa de la galería, editable aquí mismo */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Galería actual ({avatars.length})
                </p>
                <div className="space-y-1.5">
                  {avatars.map((url) => (
                    <div
                      key={url}
                      className="flex items-center gap-2.5 p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800"
                    >
                      <div className="w-9 h-9 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800 shrink-0">
                        {broken[url] ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageOff className="w-4 h-4 text-zinc-600" />
                          </div>
                        ) : (
                          <img
                            src={url}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover"
                            onError={() => setBroken((prev) => ({ ...prev, [url]: true }))}
                          />
                        )}
                      </div>
                      <span className="flex-1 min-w-0 text-[10px] text-zinc-400 truncate font-mono">
                        {url}
                      </span>
                      {broken[url] && (
                        <span className="text-[9px] text-rose-400 font-semibold shrink-0">
                          imagen rota
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleRemove(url)}
                        title="Quitar de la galería"
                        className="p-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-red-500 hover:border-red-500 hover:text-zinc-950 transition-colors shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
