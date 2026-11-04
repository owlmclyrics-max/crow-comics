import React, { useEffect, useRef, useState } from 'react';
import type { Character } from '../types/comic';
import {
  X,
  Plus,
  Trash2,
  Save,
  Edit3,
  Image as ImageIcon,
  User,
  Search,
  AlertCircle,
  AtSign,
  BookOpen,
  Dna,
  Swords,
  Skull,
  Zap,
  Eye,
} from 'lucide-react';
import { useCharactersContext } from '../context/CharactersContext';
import { matchesCharacterSearch } from '../lib/comicUtils';
import { Modal } from './ui/Modal';

interface CharactersAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** ID de personaje a editar directo (botón "Editar Personaje" de su ficha). */
  editTargetId?: string | null;
}

interface CharacterFormState {
  name: string;
  nameSpanish: string;
  realName: string;
  photoUrl: string;
  description: string;
  firstAppearance: string;
  publisher: string;
  // Mini-wiki
  species: string;
  universe: string;
  originPlace: string;
  creators: string;
  weapon: string;
  aliases: string; // uno por línea
  enemies: string; // uno por línea
  powers: string; // uno por línea
}

const EMPTY_FORM: CharacterFormState = {
  name: '',
  nameSpanish: '',
  realName: '',
  photoUrl: '',
  description: '',
  firstAppearance: '',
  publisher: '',
  species: '',
  universe: '',
  originPlace: '',
  creators: '',
  weapon: '',
  aliases: '',
  enemies: '',
  powers: '',
};

const splitLines = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/* ── Inputs del formulario ─────────────────────────────────────────────── */

const inputClass =
  'w-full px-3.5 py-2 rounded-xl bg-bg border border-line focus:border-accent text-sm text-ink outline-none transition-colors';

const TextInput: React.FC<{
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}> = ({ label, placeholder, value, onChange, required }) => (
  <div className="space-y-1">
    <label className="text-xs font-semibold text-mute">
      {label} {required && <span className="text-accent">*</span>}
    </label>
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    />
  </div>
);

const TextArea: React.FC<{
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  hint?: string;
}> = ({ label, placeholder, value, onChange, rows = 3, hint }) => (
  <div className="space-y-1">
    <label className="text-xs font-semibold text-mute">{label}</label>
    {hint && <span className="block text-[10px] text-faint -mt-0.5">{hint}</span>}
    <textarea
      value={value}
      placeholder={placeholder}
      rows={rows}
      onChange={(event) => onChange(event.target.value)}
      className={`${inputClass} resize-none leading-relaxed`}
    />
  </div>
);

const SectionTitle: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-mute">
    <span className="text-accent">{icon}</span>
    {text}
  </h4>
);

/* ── Vista previa en vivo de la ficha ──────────────────────────────────── */

const WikiPreview: React.FC<{ form: CharacterFormState }> = ({ form }) => {
  const aliases = splitLines(form.aliases);
  const enemies = splitLines(form.enemies);
  const powers = splitLines(form.powers);
  const hasContent =
    Boolean(form.name || form.photoUrl || form.species || form.universe || form.description) ||
    aliases.length > 0;

  return (
    <div className="rounded-3xl border border-accent/25 bg-surface overflow-hidden shadow-xl">
      {/* Franja superior */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line bg-raised/60">
        <Eye className="w-3.5 h-3.5 text-accent" />
        <span className="text-[10px] font-black uppercase tracking-widest text-mute">
          Vista previa de la ficha
        </span>
      </div>

      {!hasContent ? (
        <div className="p-8 text-center text-xs text-faint">
          Llena el formulario y aquí verás cómo quedará la ficha del personaje.
        </div>
      ) : (
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-4">
            {form.photoUrl ? (
              <img
                src={form.photoUrl}
                alt=""
                className="w-16 h-16 rounded-full object-cover border-2 border-line bg-bg shrink-0"
                onError={(event) => {
                  event.currentTarget.style.visibility = 'hidden';
                }}
              />
            ) : (
              <div className="w-16 h-16 rounded-full border-2 border-line bg-bg flex items-center justify-center shrink-0">
                <User className="w-7 h-7 text-faint" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-black text-ink leading-tight">{form.name || 'Nombre'}</p>
              {form.nameSpanish && <p className="text-xs text-accent font-semibold">{form.nameSpanish}</p>}
              {form.realName && <p className="text-[11px] text-mute italic">({form.realName})</p>}
            </div>
          </div>

          {(form.publisher || form.species || form.universe || form.firstAppearance) && (
            <div className="flex flex-wrap gap-1.5">
              {form.publisher && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-amber-500 text-zinc-950">
                  {form.publisher}
                </span>
              )}
              {form.species && (
                <span className="px-2 py-0.5 text-[10px] rounded-md bg-accent/10 text-accent border border-accent/30">
                  {form.species}
                </span>
              )}
              {form.universe && (
                <span className="px-2 py-0.5 text-[10px] rounded-md bg-raised text-mute border border-line">
                  {form.universe}
                </span>
              )}
              {form.firstAppearance && (
                <span className="px-2 py-0.5 text-[10px] rounded-md bg-raised text-mute border border-line">
                  {form.firstAppearance}
                </span>
              )}
            </div>
          )}

          {form.description && (
            <p className="text-[11px] text-mute leading-relaxed line-clamp-4">{form.description}</p>
          )}

          {aliases.length > 0 && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-mute">
                <AtSign className="w-3 h-3 text-accent" /> Alias
              </p>
              <div className="flex flex-wrap gap-1">
                {aliases.map((alias) => (
                  <span
                    key={alias}
                    className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-accent/10 text-accent2 border border-accent/25"
                  >
                    {alias}
                  </span>
                ))}
              </div>
            </div>
          )}

          {enemies.length > 0 && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-mute">
                <Skull className="w-3 h-3 text-accent" /> Enemigos
              </p>
              <div className="flex flex-wrap gap-1">
                {enemies.map((enemy) => (
                  <span
                    key={enemy}
                    className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-raised text-ink border border-line"
                  >
                    {enemy}
                  </span>
                ))}
              </div>
            </div>
          )}

          {powers.length > 0 && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-mute">
                <Zap className="w-3 h-3 text-accent" /> Poderes
              </p>
              <ul className="space-y-1">
                {powers.slice(0, 5).map((power) => (
                  <li key={power} className="flex items-start gap-1.5 text-[11px] text-mute">
                    <Zap className="w-3 h-3 text-accent mt-0.5 shrink-0" />
                    <span>{power}</span>
                  </li>
                ))}
                {powers.length > 5 && (
                  <li className="text-[10px] text-faint pl-[18px]">
                    +{powers.length - 5} más...
                  </li>
                )}
              </ul>
            </div>
          )}

          {form.weapon && (
            <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2">
              <Swords className="w-4 h-4 text-accent shrink-0" />
              <span className="text-[11px] font-bold text-ink">{form.weapon}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Modal principal ───────────────────────────────────────────────────── */

export const CharactersAdminModal: React.FC<CharactersAdminModalProps> = ({
  isOpen,
  onClose,
  editTargetId = null,
}) => {
  const { characters, loading, addCharacter, updateCharacter, deleteCharacter } =
    useCharactersContext();
  const [isAdding, setIsAdding] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [form, setForm] = useState<CharacterFormState>(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const autoOpenedRef = useRef(false);

  const updateField = <K extends keyof CharacterFormState>(field: K, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setError(null);
    setIsAdding(false);
    setEditingCharacterId(null);
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
      species: character.species ?? '',
      universe: character.universe ?? '',
      originPlace: character.origin_place ?? '',
      creators: character.creators ?? '',
      weapon: character.weapon ?? '',
      aliases: character.aliases ?? '',
      enemies: character.enemies ?? '',
      powers: character.powers ?? '',
    });
    setError(null);
    setIsAdding(true);
  };

  // Apertura directa en modo edición (una sola vez por montaje): el botón
  // "Editar Personaje" de la ficha aterriza con el formulario ya cargado.
  useEffect(() => {
    if (autoOpenedRef.current || !editTargetId || loading) return;
    autoOpenedRef.current = true;
    const target = characters.find((item) => item.id === editTargetId);
    if (target) {
      handleEditCharacter(target);
    } else {
      setIsAdding(true);
    }
  }, [editTargetId, characters, loading]);

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
      species: form.species,
      universe: form.universe,
      origin_place: form.originPlace,
      creators: form.creators,
      weapon: form.weapon,
      aliases: form.aliases,
      enemies: form.enemies,
      powers: form.powers,
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
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <User className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-black text-ink">Gestionar Personajes</h2>
            <p className="text-xs text-mute">
              Crea fichas con mini-wiki: alias, especie, poderes, enemigos y más
            </p>
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

        {isAdding ? (
          /* ── FORMULARIO + PREVIEW ── */
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_20rem] gap-6 items-start">
            <div className="bg-bg/60 border border-accent/30 rounded-2xl p-6 space-y-5">
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <Plus className="w-5 h-5 text-accent" />
                {editingCharacterId ? 'Editar Personaje' : 'Agregar Nuevo Personaje'}
              </h3>

              {/* Sección: Identidad */}
              <div className="space-y-3">
                <SectionTitle icon={<User className="w-3.5 h-3.5" />} text="Identidad" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextInput
                    label="Nombre (Inglés)"
                    required
                    placeholder="ej: Knull"
                    value={form.name}
                    onChange={(value) => updateField('name', value)}
                  />
                  <TextInput
                    label="Nombre (Español)"
                    placeholder="ej: Señor del Abismo"
                    value={form.nameSpanish}
                    onChange={(value) => updateField('nameSpanish', value)}
                  />
                  <TextInput
                    label="Nombre real"
                    placeholder="ej: Peter Parker"
                    value={form.realName}
                    onChange={(value) => updateField('realName', value)}
                  />
                  <TextInput
                    label="Editorial"
                    placeholder="ej: Marvel"
                    value={form.publisher}
                    onChange={(value) => updateField('publisher', value)}
                  />
                </div>
              </div>

              {/* Sección: Ficha wiki */}
              <div className="space-y-3">
                <SectionTitle icon={<Dna className="w-3.5 h-3.5" />} text="Ficha wiki" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextInput
                    label="Especie"
                    placeholder="ej: Entidad cósmica primordial"
                    value={form.species}
                    onChange={(value) => updateField('species', value)}
                  />
                  <TextInput
                    label="Universo"
                    placeholder="ej: Tierra-616"
                    value={form.universe}
                    onChange={(value) => updateField('universe', value)}
                  />
                  <TextInput
                    label="Lugar de origen"
                    placeholder="ej: Vacío primordial"
                    value={form.originPlace}
                    onChange={(value) => updateField('originPlace', value)}
                  />
                  <TextInput
                    label="Creadores"
                    placeholder="ej: Donny Cates y Ryan Stegman"
                    value={form.creators}
                    onChange={(value) => updateField('creators', value)}
                  />
                  <TextInput
                    label="Primera aparición"
                    placeholder="ej: Venom #3 (2018)"
                    value={form.firstAppearance}
                    onChange={(value) => updateField('firstAppearance', value)}
                  />
                  <TextInput
                    label="Arma principal"
                    placeholder="ej: All-Black, la Necroespada"
                    value={form.weapon}
                    onChange={(value) => updateField('weapon', value)}
                  />
                </div>
              </div>

              {/* Sección: Listas */}
              <div className="space-y-3">
                <SectionTitle icon={<Zap className="w-3.5 h-3.5" />} text="Listas" />
                <TextArea
                  label="Alias"
                  hint="Uno por línea"
                  placeholder={'Rey de Negro\nDios de los Simbiontes\nSeñor del Abismo'}
                  value={form.aliases}
                  onChange={(value) => updateField('aliases', value)}
                  rows={3}
                />
                <TextArea
                  label="Enemigos principales"
                  hint="Uno por línea"
                  placeholder={'Venom\nThor\nSilver Surfer'}
                  value={form.enemies}
                  onChange={(value) => updateField('enemies', value)}
                  rows={3}
                />
                <TextArea
                  label="Poderes y habilidades"
                  hint="Un poder por línea"
                  placeholder={'Control y creación de simbiontes\nManipulación de la oscuridad\nFuerza y resistencia sobrehumanas'}
                  value={form.powers}
                  onChange={(value) => updateField('powers', value)}
                  rows={5}
                />
              </div>

              {/* Sección: Descripción + Foto */}
              <div className="space-y-3">
                <SectionTitle icon={<BookOpen className="w-3.5 h-3.5" />} text="Historia y apariencia" />
                <TextArea
                  label="Descripción / Biografía"
                  placeholder="Breve reseña del personaje..."
                  value={form.description}
                  onChange={(value) => updateField('description', value)}
                  rows={4}
                />
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <TextInput
                      label="URL de foto"
                      placeholder="https://..."
                      value={form.photoUrl}
                      onChange={(value) => updateField('photoUrl', value)}
                    />
                  </div>
                  {form.photoUrl ? (
                    <img
                      src={form.photoUrl}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover border border-line bg-bg"
                      onError={(event) => {
                        event.currentTarget.style.visibility = 'hidden';
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-raised border border-line flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-faint" />
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-3 pt-2 border-t border-line">
                <button
                  onClick={handleSaveCharacter}
                  disabled={!form.name.trim()}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent2 text-onaccent font-bold text-xs shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingCharacterId ? 'Guardar Cambios' : 'Guardar Personaje'}</span>
                </button>
                <button
                  onClick={resetForm}
                  className="mt-4 inline-flex items-center px-4 py-2.5 rounded-xl bg-raised hover:bg-line text-mute text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>

            {/* Preview en vivo */}
            <div className="xl:sticky xl:top-0">
              <WikiPreview form={form} />
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
                className="bg-surface/60 border border-line rounded-2xl p-4 space-y-3 hover:border-accent/40 transition-colors"
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
                    {character.species && (
                      <p className="text-[11px] text-faint truncate">{character.species}</p>
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
