import React, { useState } from 'react';
import type { Character } from '../types/comic';
import { X, Plus, Trash2, Save, Edit3, Image as ImageIcon, User, Search, AlertCircle } from 'lucide-react';
import { useCharactersContext } from '../context/CharactersContext';
import { matchesCharacterSearch } from '../lib/comicUtils';
import { Modal } from './ui/Modal';

interface CharactersAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CharacterFormState {
  name: string;
  nameSpanish: string;
  realName: string;
  photoUrl: string;
  description: string;
  firstAppearance: string;
  publisher: string;
}

const EMPTY_FORM: CharacterFormState = {
  name: '',
  nameSpanish: '',
  realName: '',
  photoUrl: '',
  description: '',
  firstAppearance: '',
  publisher: '',
};

export const CharactersAdminModal: React.FC<CharactersAdminModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { characters, loading, addCharacter, updateCharacter, deleteCharacter } = useCharactersContext();
  const [isAdding, setIsAdding] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [form, setForm] = useState<CharacterFormState>(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof CharacterFormState,>(
    field: K,
    value: CharacterFormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setError(null);
    setIsAdding(false);
    setEditingCharacterId(null);
  };

  const handleSaveCharacter = async () => {
    if (!form.name.trim()) return;

    setError(null);
    const input = {
      name: form.name,
      name_spanish: form.nameSpanish,
      real_name: form.realName,
      photo_url: form.photoUrl,
      description: form.description,
      first_appearance: form.firstAppearance,
      publisher: form.publisher,
    };
    const result = editingCharacterId
      ? await updateCharacter(editingCharacterId, input)
      : await addCharacter(input);

    if (result.success) {
      resetForm();
    } else {
      setError(result.error ?? 'Error al guardar personaje');
    }
  };

  const handleEditCharacter = (character: Character) => {
    setEditingCharacterId(character.id);
    setForm({
      name: character.name,
      nameSpanish: character.name_spanish ?? '',
      realName: character.real_name ?? '',
      photoUrl: character.photo_url ?? '',
      description: character.description ?? '',
      firstAppearance: character.first_appearance ?? '',
      publisher: character.publisher ?? '',
    });
    setError(null);
    setIsAdding(true);
  };

  const handleDeleteCharacter = async (character: Character) => {
    if (!window.confirm(`¿Estás seguro de eliminar a "${character.name}"?`)) return;

    setError(null);
    const result = await deleteCharacter(character.id);
    if (!result.success) {
      setError(result.error ?? 'Error al eliminar personaje');
    }
  };

  const filteredCharacters = characters.filter((character) =>
    matchesCharacterSearch(character, searchTerm),
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <User className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-black text-ink">Gestionar Personajes</h2>
            <p className="text-xs text-mute">Agrega y edita personajes del universo</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-raised hover:bg-line text-mute hover:text-ink transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute" />
          <input
            type="text"
            placeholder="Buscar personaje..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg border border-line focus:border-accent text-sm text-ink outline-none transition-colors"
          />
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/30 text-accent2 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-accent2" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario de agregar */}
        {isAdding ? (
          <div className="bg-bg/60 border border-accent/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-ink flex items-center gap-2">
              <Plus className="w-5 h-5 text-accent" />
              {editingCharacterId ? 'Editar Personaje' : 'Agregar Nuevo Personaje'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-mute">Nombre (Inglés) *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="ej: Spider-Man"
                  className="w-full px-3.5 py-2 rounded-xl bg-bg border border-line focus:border-accent text-sm text-ink outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-mute">Nombre (Español)</label>
                <input
                  type="text"
                  value={form.nameSpanish}
                  onChange={(event) => updateField('nameSpanish', event.target.value)}
                  placeholder="ej: Hombre Araña"
                  className="w-full px-3.5 py-2 rounded-xl bg-bg border border-line focus:border-accent text-sm text-ink outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-mute">Nombre Real</label>
                <input
                  type="text"
                  value={form.realName}
                  onChange={(event) => updateField('realName', event.target.value)}
                  placeholder="ej: Peter Parker"
                  className="w-full px-3.5 py-2 rounded-xl bg-bg border border-line focus:border-accent text-sm text-ink outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-mute">URL de Foto</label>
                <input
                  type="text"
                  value={form.photoUrl}
                  onChange={(event) => updateField('photoUrl', event.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 rounded-xl bg-bg border border-line focus:border-accent text-sm text-ink outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-mute">Editorial</label>
                <input
                  type="text"
                  value={form.publisher}
                  onChange={(event) => updateField('publisher', event.target.value)}
                  placeholder="ej: Marvel"
                  className="w-full px-3.5 py-2 rounded-xl bg-bg border border-line focus:border-accent text-sm text-ink outline-none"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-mute">Primera Aparición</label>
                <input
                  type="text"
                  value={form.firstAppearance}
                  onChange={(event) => updateField('firstAppearance', event.target.value)}
                  placeholder="ej: Amazing Fantasy #15 (1962)"
                  className="w-full px-3.5 py-2 rounded-xl bg-bg border border-line focus:border-accent text-sm text-ink outline-none"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-mute">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(event) => updateField('description', event.target.value)}
                  placeholder="Breve descripción del personaje..."
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl bg-bg border border-line focus:border-accent text-sm text-ink outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveCharacter}
                disabled={!form.name.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent2 text-onaccent font-bold text-xs shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>{editingCharacterId ? 'Guardar Cambios' : 'Guardar Personaje'}</span>
              </button>
              <button
                onClick={resetForm}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-raised hover:bg-line text-mute text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent2 text-onaccent font-bold text-xs shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Personaje</span>
          </button>
        )}

        {/* Lista de personajes */}
        {loading ? (
          <div className="py-12 text-center text-mute text-sm">Cargando personajes...</div>
        ) : filteredCharacters.length === 0 ? (
          <div className="py-12 text-center rounded-2xl bg-surface/40 border border-line text-mute text-sm">
            {searchTerm ? 'No se encontraron personajes' : 'No hay personajes agregados aún'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCharacters.map((character) => (
              <div
                key={character.id}
                className="bg-surface/60 border border-line rounded-2xl p-4 space-y-3 hover:border-line transition-colors"
              >
                <div className="flex items-start gap-3">
                  {character.photo_url ? (
                    <img
                      src={character.photo_url}
                      alt={character.name}
                      className="w-16 h-16 rounded-xl object-cover bg-bg"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-bg flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-faint" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-ink text-sm truncate">{character.name}</h4>
                    {character.name_spanish && (
                      <p className="text-xs text-accent truncate">{character.name_spanish}</p>
                    )}
                    {character.real_name && (
                      <p className="text-xs text-mute truncate">{character.real_name}</p>
                    )}
                    {character.publisher && (
                      <p className="text-xs text-faint mt-1">{character.publisher}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditCharacter(character)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-raised hover:bg-line text-ink text-xs font-semibold transition-colors border border-line"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => handleDeleteCharacter(character)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent2 text-xs font-semibold transition-colors border border-accent/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
