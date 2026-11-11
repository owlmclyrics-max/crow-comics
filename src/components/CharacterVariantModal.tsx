import React, { useState } from 'react';
import { X, Image as ImageIcon, Sparkles } from 'lucide-react';
import type { CharacterVariant } from '../types/comic';

interface CharacterVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (variant: Omit<CharacterVariant, 'id' | 'created_at'>) => void;
  characterId: string;
}

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !universe || !imageUrl || !description) {
      alert('Por favor completa los campos obligatorios');
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

    // Reset form
    setName('');
    setUniverse('');
    setEarth('');
    setImageUrl('');
    setDescription('');
    setFirstAppearance('');
    setDifferences('');
    setAliases('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Nueva variante</h2>
              <p className="text-xs text-slate-400">Vinculada a la ficha principal del personaje</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nombre de la variante */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-white">
              Nombre de la variante
              <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cómo aparecerá en el selector"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Universo / Continuidad */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-white">
              Universo / Continuidad
              <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={universe}
              onChange={(e) => setUniverse(e.target.value)}
              placeholder="Ej: Absolute Universe"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Tierra */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-white">Tierra</label>
            <input
              type="text"
              value={earth}
              onChange={(e) => setEarth(e.target.value)}
              placeholder="Ej: Tierra-0, Tierra-616, Tierra-6160..."
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none transition-colors"
            />
            <p className="text-xs text-slate-500">Puede quedar vacío si no hay información confirmada</p>
          </div>

          {/* Imagen representativa */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-white">
              Imagen representativa
              <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-3">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="URL de la imagen"
                className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none transition-colors"
                required
              />
              <button
                type="button"
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                <span className="text-sm">Seleccionar</span>
              </button>
            </div>
            <p className="text-xs text-slate-500">Retrato o imagen de esta versión</p>
          </div>

          {/* Descripción de la variante */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-white">
              Descripción de la variante
              <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción de qué distingue a esta versión del personaje..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none transition-colors resize-none"
              required
            />
          </div>

          {/* Primera aparición */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-white">Primera aparición</label>
            <input
              type="text"
              value={firstAppearance}
              onChange={(e) => setFirstAppearance(e.target.value)}
              placeholder="Ej: Absolute Green Arrow #1"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none transition-colors"
            />
            <p className="text-xs text-slate-500">Puede quedar vacío si no hay información confirmada</p>
          </div>

          {/* Diferencias / Características */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-white">Diferencias / Características</label>
            <textarea
              value={differences}
              onChange={(e) => setDifferences(e.target.value)}
              placeholder="Apariencia, personalidad, poderes diferentes, historia..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none transition-colors resize-none"
            />
            <p className="text-xs text-slate-500">Solo lo que cambia respecto a la ficha principal</p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-zinc-950 text-sm font-bold transition-colors shadow-lg shadow-red-500/20"
            >
              Guardar variante
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
