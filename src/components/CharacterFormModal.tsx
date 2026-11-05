import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Save,
  Image as ImageIcon,
  User,
  AlertCircle,
  AtSign,
  BookOpen,
  Dna,
  Eye,
  Swords,
  Skull,
  Zap,
  IdCard,
  ChevronDown,
} from 'lucide-react';
import type { Character } from '../types/comic';
import { CHARACTER_ALIGNMENTS, PUBLISHERS, getAlignmentBadgeClass } from '../lib/constants';
import { characterNameMatches } from '../lib/comicUtils';
import { useCharactersContext } from '../context/CharactersContext';
import { Modal } from './ui/Modal';
import { showToast } from './ui/Toast';
import { EnemyPickerModal } from './EnemyPickerModal';

interface CharacterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** ID del personaje a editar; null = crear uno nuevo. */
  characterId?: string | null;
}

interface CharacterFormState {
  name: string;
  nameSpanish: string;
  realName: string;
  photoUrl: string;
  description: string;
  firstAppearance: string;
  publisher: string;
  alignment: string; // Rol: Héroe, Villano, Anti-héroe...
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
  alignment: '',
  species: '',
  universe: '',
  originPlace: '',
  creators: '',
  weapon: '',
  aliases: '',
  enemies: '',
  powers: '',
};

const toForm = (character: Character): CharacterFormState => ({
  name: character.name,
  nameSpanish: character.name_spanish ?? '',
  realName: character.real_name ?? '',
  photoUrl: character.photo_url ?? '',
  description: character.description ?? '',
  firstAppearance: character.first_appearance ?? '',
  publisher: character.publisher ?? '',
  alignment: character.alignment ?? '',
  species: character.species ?? '',
  universe: character.universe ?? '',
  originPlace: character.origin_place ?? '',
  creators: character.creators ?? '',
  weapon: character.weapon ?? '',
  aliases: character.aliases ?? '',
  enemies: character.enemies ?? '',
  powers: character.powers ?? '',
});

const splitLines = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/** Busca un personaje del wiki por nombre (inglés o español), sin fijarse en mayúsculas, acentos ni espacios. */
const findCharacterByName = (
  name: string,
  list: Character[],
  excludeId?: string | null,
): Character | undefined =>
  list.find((c) => c.id !== excludeId && characterNameMatches(c, name));

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-bg border border-line focus:border-accent text-sm text-ink outline-none transition-colors placeholder:text-faint';

/* ── Campos del formulario ─────────────────────────────────────────────── */

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
  <div className="flex items-center gap-2.5">
    <span className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center text-accent shrink-0">
      {icon}
    </span>
    <h4 className="text-xs font-black uppercase tracking-widest text-mute">{text}</h4>
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  emptyLabel?: string;
}> = ({ label, value, onChange, options, emptyLabel = '— Seleccionar —' }) => (
  <div className="space-y-1">
    <label className="text-xs font-semibold text-mute">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} appearance-none pr-9 cursor-pointer ${
          value ? 'text-ink' : 'text-faint'
        }`}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute pointer-events-none" />
    </div>
  </div>
);

/* ── Vista previa en vivo de la ficha ──────────────────────────────────── */

const WikiPreview: React.FC<{ form: CharacterFormState; characters: Character[] }> = ({
  form,
  characters,
}) => {
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
                className="w-16 h-16 rounded-full object-cover border-2 border-accent/30 bg-bg shrink-0"
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
              {form.nameSpanish && (
                <p className="text-xs text-accent font-semibold">{form.nameSpanish}</p>
              )}
              {form.realName && <p className="text-[11px] text-mute italic">({form.realName})</p>}
            </div>
          </div>

          {(form.publisher || form.alignment || form.species || form.universe || form.firstAppearance) && (
            <div className="flex flex-wrap gap-1.5">
              {form.alignment && (
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${getAlignmentBadgeClass(form.alignment)}`}>
                  {form.alignment}
                </span>
              )}
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
              {/* Mini círculos estilo reparto; los sin ficha quedan como chip */}
              <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {enemies.map((enemy) => {
                  const match = findCharacterByName(enemy, characters);
                  return (
                    <div key={enemy} className="shrink-0 flex flex-col items-center gap-0.5 w-12">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-line bg-bg">
                        {match?.photo_url ? (
                          <img src={match.photo_url} alt={enemy} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Skull className="w-4 h-4 text-faint" />
                          </div>
                        )}
                      </div>
                      <p className="w-full text-[9px] text-mute truncate text-center">{enemy}</p>
                    </div>
                  );
                })}
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
                  <li className="text-[10px] text-faint pl-[18px]">+{powers.length - 5} más...</li>
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

/* ── Modal dedicado a la ficha ─────────────────────────────────────────── */

export const CharacterFormModal: React.FC<CharacterFormModalProps> = ({
  isOpen,
  onClose,
  characterId = null,
}) => {
  const { characters, loading, addCharacter, updateCharacter } = useCharactersContext();
  const [form, setForm] = useState<CharacterFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEnemyPickerOpen, setIsEnemyPickerOpen] = useState(false);
  const prefilledRef = useRef(false);

  const isEdit = Boolean(characterId);

  // ── Enemigos: solo se eligen del wiki ──
  const enemyNames = splitLines(form.enemies);
  const addEnemy = (name: string) => {
    if (!name || enemyNames.some((enemy) => enemy.toLowerCase() === name.toLowerCase())) return;
    updateField('enemies', [...enemyNames, name].join('\n'));
  };
  const removeEnemy = (name: string) => {
    updateField(
      'enemies',
      enemyNames.filter((enemy) => enemy !== name).join('\n'),
    );
  };

  const updateField = <K extends keyof CharacterFormState>(field: K, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  // Precarga el personaje una sola vez por montaje (cuando termina de cargar)
  useEffect(() => {
    if (prefilledRef.current || loading) return;
    prefilledRef.current = true;
    if (characterId) {
      const target = characters.find((item) => item.id === characterId);
      setForm(target ? toForm(target) : EMPTY_FORM);
    }
  }, [characterId, characters, loading]);

  const handleSave = async () => {
    if (!form.name.trim() || isSaving) return;

    setError(null);
    setIsSaving(true);
    const input = {
      name: form.name,
      name_spanish: form.nameSpanish,
      real_name: form.realName,
      photo_url: form.photoUrl,
      description: form.description,
      first_appearance: form.firstAppearance,
      publisher: form.publisher,
      alignment: form.alignment,
      species: form.species,
      universe: form.universe,
      origin_place: form.originPlace,
      creators: form.creators,
      weapon: form.weapon,
      aliases: form.aliases,
      enemies: form.enemies,
      powers: form.powers,
    };

    const result = characterId
      ? await updateCharacter(characterId, input)
      : await addCharacter(input);
    setIsSaving(false);

    if (result.success) {
      showToast(
        characterId ? `Ficha de "${form.name}" actualizada` : `"${form.name}" se unió al universo`,
      );
      onClose();
    } else {
      setError(result.error ?? 'Error al guardar personaje');
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl">
      {/* ── Header con ambiente Crow ── */}
      <div className="relative shrink-0 border-b border-line overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/15 via-transparent to-transparent pointer-events-none" />
        <div className="crow-dots absolute inset-0 opacity-40 pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
        <div className="relative flex items-center justify-between gap-3 p-5 sm:p-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
              <IdCard className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-black text-ink truncate">
                {isEdit ? 'Editar Ficha de Personaje' : 'Nueva Ficha de Personaje'}
              </h2>
              <p className="text-xs text-mute">
                Mini-wiki: alias, especie, universo, poderes, enemigos y arma
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-raised hover:bg-line text-mute hover:text-ink transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Contenido: formulario + preview ── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_20rem] gap-6 items-start">
          <div className="space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/30 text-accent2 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-accent2" />
                <span>{error}</span>
              </div>
            )}

            {/* Sección: Identidad */}
            <div className="space-y-4">
              <SectionTitle icon={<User className="w-4 h-4" />} text="Identidad" />
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
                <SelectField
                  label="Editorial"
                  value={form.publisher}
                  onChange={(value) => updateField('publisher', value)}
                  options={
                    form.publisher && !(PUBLISHERS as readonly string[]).includes(form.publisher)
                      ? [form.publisher, ...PUBLISHERS]
                      : PUBLISHERS
                  }
                  emptyLabel="— Sin editorial —"
                />
              </div>
              <SelectField
                label="Rol en la historia"
                value={form.alignment}
                onChange={(value) => updateField('alignment', value)}
                options={CHARACTER_ALIGNMENTS}
                emptyLabel="— Sin clasificar —"
              />
            </div>

            {/* Sección: Ficha wiki */}
            <div className="space-y-4">
              <SectionTitle icon={<Dna className="w-4 h-4" />} text="Ficha wiki" />
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
            <div className="space-y-4">
              <SectionTitle icon={<Zap className="w-4 h-4" />} text="Listas" />
              <TextArea
                label="Alias"
                hint="Uno por línea"
                placeholder={'Rey de Negro\nDios de los Simbiontes\nSeñor del Abismo'}
                value={form.aliases}
                onChange={(value) => updateField('aliases', value)}
                rows={3}
              />
              {/* Enemigos: solo desde el wiki — círculos estilo reparto + modal de búsqueda */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-mute">Enemigos principales</label>
                  {enemyNames.length > 0 && (
                    <span className="text-[10px] text-faint">Toca un círculo para quitarlo</span>
                  )}
                </div>

                {/* Fila horizontal de círculos (como el reparto) */}
                {enemyNames.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {enemyNames.map((enemy) => {
                      const match = findCharacterByName(enemy, characters, characterId);
                      return (
                        <button
                          key={enemy}
                          type="button"
                          onClick={() => removeEnemy(enemy)}
                          title={`Quitar a ${enemy}`}
                          className="group/enemy relative shrink-0 flex flex-col items-center gap-1 cursor-pointer focus:outline-none"
                        >
                          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-line group-hover/enemy:border-red-400/80 bg-bg transition-colors">
                            {match?.photo_url ? (
                              <img
                                src={match.photo_url}
                                alt={enemy}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Skull className="w-5 h-5 text-faint" />
                              </div>
                            )}
                          </div>
                          {/* X de quitar, aparece al hover */}
                          <span className="absolute top-0 right-0 w-5 h-5 rounded-full bg-raised border border-line items-center justify-center hidden group-hover/enemy:flex">
                            <X className="w-3 h-3 text-red-400" />
                          </span>
                          <p className="w-14 text-[10px] text-mute truncate group-hover/enemy:text-red-400 transition-colors">
                            {enemy}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Elegir del wiki: abre el modal de búsqueda */}
                <button
                  type="button"
                  onClick={() => setIsEnemyPickerOpen(true)}
                  className={`${inputClass} flex items-center justify-between text-left cursor-pointer hover:border-accent/50`}
                >
                  <span className="text-faint">+ Elegir personaje del wiki...</span>
                  <ChevronDown className="w-4 h-4 text-mute" />
                </button>
              </div>
              <TextArea
                label="Poderes y habilidades"
                hint="Un poder por línea"
                placeholder={
                  'Control y creación de simbiontes\nManipulación de la oscuridad\nFuerza y resistencia sobrehumanas'
                }
                value={form.powers}
                onChange={(value) => updateField('powers', value)}
                rows={5}
              />
            </div>

            {/* Sección: Historia y apariencia */}
            <div className="space-y-4">
              <SectionTitle icon={<BookOpen className="w-4 h-4" />} text="Historia y apariencia" />
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
          </div>

          {/* Preview en vivo */}
          <div className="xl:sticky xl:top-0">
            <WikiPreview form={form} characters={characters} />
          </div>
        </div>
      </div>

      {/* ── Footer de acciones ── */}
      <div className="shrink-0 flex items-center justify-between gap-3 p-4 border-t border-line bg-raised/40">
        <p className="hidden sm:block text-[10px] text-faint">
          Los campos con <span className="text-accent">*</span> son obligatorios · el resto es la
          mini-wiki
        </p>
        <div className="flex items-center gap-2.5 ml-auto">
          <button
            onClick={onClose}
            className="inline-flex items-center px-4 py-2.5 rounded-xl bg-raised hover:bg-line text-mute text-xs font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim() || isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent2 text-onaccent font-bold text-xs shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Save className="w-4 h-4" />
            <span>
              {isSaving ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Personaje'}
            </span>
          </button>
        </div>
      </div>
      </Modal>

      {/* Selector de enemigos del wiki (modal sobre el formulario) */}
      <EnemyPickerModal
        isOpen={isEnemyPickerOpen}
        onClose={() => setIsEnemyPickerOpen(false)}
        characters={characters}
        excludeId={characterId}
        existingEnemies={enemyNames}
        onPick={addEnemy}
      />
    </>
  );
};
