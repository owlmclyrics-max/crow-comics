import React, { useState } from 'react';
import { X, Image as ImageIcon, Sparkles } from 'lucide-react';
import type { CharacterVariant } from '../types/comic';
import { showToast } from './ui/Toast';

interface CharacterVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (variant: Omit<CharacterVariant, 'id' | 'created_at'>) => void;
  characterId: string;
}

// ============================================================================
// MODAL "NUEVA VARIANTE" (solo admin)
// Crea una versión alternativa de un personaje (otro universo / continuidad).
// v0.9.7: colores del tema (tokens) en vez de slate hardcodeado — se ve bien
// en tema claro y oscuro; campo Alias agregado (el estado existía pero no el
// input); botón muerto "Seleccionar" eliminado; validación con toast.
// ============================================================================

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-bg border border-line text-ink placeholder-faint focus:border-accent focus:outline-none transition-colors';

export const CharacterVariantModal: React.FC<CharacterVariantModalProps> = ({
  isOpen,
  onClose,
  onSave,
  characterId,
}) => {
  const [name, setName] = useState('');
  const [universe, setUniverse] = useState('');
  const [earth, setEarth] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [firstAppearance, setFirstAppearance] = useState('');
  const [differences, setDifferences] = useState('');
  const [aliases, setAliases] = useState('');

  if (!isOpen) return null;

  const reset = () => {
    setName('');
    setUniverse('');
    setEarth('');
    setImageUrl('');
    setDescription('');
    setFirstAppearance('');
    setDifferences('');
    setAliases('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !universe.trim() || !imageUrl.trim() || !description.trim()) {
      showToast('Completá los campos obligatorios: nombre, universo, imagen y descripción', 'error');
      return;
    }

    onSave({
      character_id: characterId,
      name,
      universe,
      earth: earth || undefined,
      image_url: imageUrl,
      description,
      first_appearance: firstAppearance || undefined,
      differences: differences || undefined,
      aliases: aliases || undefined,
    });

    reset();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-black text-ink">Nueva variante</h2>
              <p className="text-xs text-mute">Vinculada a la ficha principal del personaje</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-raised hover:bg-bg text-mute hover:text-ink transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Nombre de la variante */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-ink">
              Nombre de la variante <span className="text-accent">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cómo aparecerá en el selector. Ej: Absolute Black Canary"
              className={inputClass}
              required
            />
          </div>

          {/* Alias (estado existía pero faltaba el campo en el formulario) */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-ink">Alias</label>
            <textarea
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              placeholder="Nombres alternativos de esta versión, uno por línea…"
              rows={2}
              className={`${inputClass} resize-none`}
            />
            <p className="text-xs text-faint">Opcional — puede quedar vacío</p>
          </div>

          {/* Universo / Continuidad */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-ink">
              Universo / Continuidad <span className="text-accent">*</span>
            </label>
            <input
              type="text"
              value={universe}
              onChange={(e) => setUniverse(e.target.value)}
              placeholder="Ej: Absolute Universe"
              className={inputClass}
              required
            />
          </div>

          {/* Tierra */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-ink">Tierra</label>
            <input
              type="text"
              value={earth}
              onChange={(e) => setEarth(e.target.value)}
              placeholder="Ej: Tierra-0, Tierra-616, Tierra-6160…"
              className={inputClass}
            />
            <p className="text-xs text-faint">Puede quedar vacío si no hay información confirmada</p>
          </div>

          {/* Imagen representativa */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-ink">
              <span className="inline-flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-accent" />
                Imagen representativa <span className="text-accent">*</span>
              </span>
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="URL de la imagen (retrato o arte de esta versión)"
              className={inputClass}
              required
            />
            {/* Vista previa en vivo */}
            {imageUrl.trim() && (
              <div className="flex items-center gap-3 p-2 rounded-xl bg-bg border border-line">
                <img
                  src={imageUrl}
                  alt="Vista previa"
                  className="w-14 h-14 rounded-lg object-cover border border-line"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <p className="text-xs text-mute">Vista previa de la imagen</p>
              </div>
            )}
          </div>

          {/* Descripción de la variante */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-ink">
              Descripción de la variante <span className="text-accent">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción de qué distingue a esta versión del personaje…"
              rows={3}
              className={`${inputClass} resize-none`}
              required
            />
          </div>

          {/* Primera aparición */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-ink">Primera aparición</label>
            <input
              type="text"
              value={firstAppearance}
              onChange={(e) => setFirstAppearance(e.target.value)}
              placeholder="Ej: Absolute Green Arrow #1"
              className={inputClass}
            />
            <p className="text-xs text-faint">Puede quedar vacío si no hay información confirmada</p>
          </div>

          {/* Diferencias / Características */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-ink">Diferencias / Características</label>
            <textarea
              value={differences}
              onChange={(e) => setDifferences(e.target.value)}
              placeholder="Apariencia, personalidad, poderes diferentes, historia…"
              rows={3}
              className={`${inputClass} resize-none`}
            />
            <p className="text-xs text-faint">Solo lo que cambia respecto a la ficha principal</p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-raised hover:bg-bg text-mute hover:text-ink text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent2 text-onaccent text-sm font-bold transition-colors shadow-lg shadow-accent/20 active:scale-95"
            >
              Guardar variante
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
