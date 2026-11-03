import React, { useState } from 'react';
import type { Profile, ComicPublisher, Character } from '../types/comic';
import { X, ChevronRight, ChevronLeft, User, Sparkles, BookOpen, Zap, Check, Search } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEFAULT_AVATARS as AVATARS } from '../lib/avatarGallery';
import { AvatarPicker } from './ui/AvatarPicker';
import { showToast } from './ui/Toast';

interface OnboardingWizardProps {
  isOpen: boolean;
  profile: Profile | null;
  onComplete: (profile: Profile) => void;
  /** Cerrar/omitir el wizard (botón X): guarda bandera para no volver a mostrar. */
  onClose?: () => void;
}

const PUBLISHERS: ComicPublisher[] = [
  'Marvel',
  'DC Comics',
  'Image Comics',
  'Dynamite',
  'Dark Horse',
  'Vertigo',
  'Independiente'
];

export const READING_STYLES = [
  { id: 'digital', label: 'Digital', icon: Zap, description: 'Prefiero leer en pantalla' },
  { id: 'physical', label: 'Físico', icon: BookOpen, description: 'Colecciono cómics físicos' },
  { id: 'both', label: 'Ambos', icon: Sparkles, description: 'Disfruto ambos formatos' },
];

type WizardStep = 'username' | 'preferences' | 'reading-style' | 'complete';

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  profile,
  onComplete,
  onClose,
}) => {
  // Nota: todos los hooks van ANTES de cualquier return anticipado
  // (reglas de React; si no, el árbol de hooks cambia entre renders).
  const [currentStep, setCurrentStep] = useState<WizardStep>('username');
  const [username, setUsername] = useState(profile?.username || '');
  const [selectedAvatar, setSelectedAvatar] = useState(profile?.avatar_url || AVATARS[0]);
  const [selectedPublishers, setSelectedPublishers] = useState<string[]>(profile?.prefs?.favorite_publishers || []);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>(profile?.prefs?.favorite_characters || []);
  const [selectedReadingStyle, setSelectedReadingStyle] = useState(profile?.prefs?.reading_style || '');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [usernameError, setUsernameError] = useState('');
  const [saving, setSaving] = useState(false);
  // Buscador de personajes del paso de preferencias
  const [charSearch, setCharSearch] = useState('');

  React.useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      fetchCharacters();
    }
  }, []);

  const fetchCharacters = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .limit(12);
      if (error) throw error;
      setCharacters(data || []);
    } catch (err) {
      console.error('Error cargando personajes:', err);
    }
  };

  const validateUsername = async (name: string) => {
    if (!name.trim()) {
      setUsernameError('El username es requerido');
      return false;
    }
    if (name.length < 3) {
      setUsernameError('El username debe tener al menos 3 caracteres');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      setUsernameError('Solo letras, números y guiones bajos');
      return false;
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('username', name.trim())
          .single();

        if (data && data.id !== profile?.id) {
          setUsernameError('Este username ya está en uso');
          return false;
        }
      } catch {
        // Si no existe, está disponible
      }
    }

    setUsernameError('');
    return true;
  };

  // Return anticipado DESPUÉS de todas las declaraciones que usa el useEffect
  // (los efectos corren aunque el render devuelva null: si la const aún no se
  // ejecutó, salta "Cannot access before initialization").
  if (!isOpen) return null;

  const handleNext = async () => {
    if (currentStep === 'username') {
      const isValid = await validateUsername(username);
      if (isValid) {
        setCurrentStep('preferences');
      }
    } else if (currentStep === 'preferences') {
      setCurrentStep('reading-style');
    } else if (currentStep === 'reading-style') {
      setCurrentStep('complete');
    }
  };

  const handleBack = () => {
    if (currentStep === 'preferences') {
      setCurrentStep('username');
    } else if (currentStep === 'reading-style') {
      setCurrentStep('preferences');
    } else if (currentStep === 'complete') {
      setCurrentStep('reading-style');
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('profiles')
          .update({
            username: username.trim(),
            avatar_url: selectedAvatar,
            prefs: {
              onboarding_completed: true,
              favorite_publishers: selectedPublishers,
              favorite_characters: selectedCharacters,
              reading_style: selectedReadingStyle
            }
          })
          .eq('id', profile?.id);

        if (error) throw error;

        // Recordar localmente que este usuario ya completó el onboarding:
        // aunque la recarga tarde o la lectura de prefs falle, el wizard no
        // vuelve a molestar en la siguiente sesión.
        try {
          if (profile?.id) localStorage.setItem(`crow_onboarding_done_${profile.id}`, '1');
        } catch { /* localStorage lleno o bloqueado: no es crítico */ }

        // Refetch profile
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profile?.id)
          .single();

        if (updatedProfile) {
          onComplete(updatedProfile);
        }
      }
    } catch (err) {
      console.error('Error guardando perfil:', err);
      showToast(
        `No se pudo guardar el perfil: ${err instanceof Error ? err.message : 'error desconocido'}`,
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { id: 'username', label: 'Username', icon: User },
    { id: 'preferences', label: 'Preferencias', icon: Sparkles },
    { id: 'reading-style', label: 'Estilo', icon: BookOpen },
  ] as const;

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const renderStepContent = () => {
    switch (currentStep) {
      case 'username':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Elige tu Username</h3>
              <p className="text-sm text-zinc-400">Este será tu nombre en la comunidad</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  // Limpiar el error en cuanto el usuario corrige: un error
                  // viejo no debe dejar el botón "Siguiente" bloqueado.
                  if (usernameError) setUsernameError('');
                }}
                onBlur={() => validateUsername(username)}
                placeholder="tu_username"
                className={`w-full px-4 py-3 rounded-xl bg-zinc-950 border ${
                  usernameError ? 'border-rose-500' : 'border-zinc-800 focus:border-red-500'
                } text-sm text-zinc-100 outline-none transition-colors`}
              />
              {usernameError && (
                <p className="text-xs text-rose-400">{usernameError}</p>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-300">Elige tu Avatar</label>
              <AvatarPicker value={selectedAvatar} onChange={setSelectedAvatar} />
            </div>
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Tus Preferencias</h3>
              <p className="text-sm text-zinc-400">Selecciona tus editoriales y personajes favoritos</p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-300">Editoriales Favoritas</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {PUBLISHERS.map((publisher) => (
                  <button
                    key={publisher}
                    onClick={() => {
                      if (selectedPublishers.includes(publisher)) {
                        setSelectedPublishers(selectedPublishers.filter(p => p !== publisher));
                      } else {
                        setSelectedPublishers([...selectedPublishers, publisher]);
                      }
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      selectedPublishers.includes(publisher)
                        ? 'bg-red-500 text-zinc-950'
                        : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {publisher}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-semibold text-zinc-300">
                  Personajes Favoritos{selectedCharacters.length > 0 && (
                    <span className="ml-2 text-[10px] font-bold text-red-400">
                      {selectedCharacters.length} seleccionado{selectedCharacters.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </label>
                {/* Buscador de personajes */}
                <div className="relative w-48 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                  <input
                    type="text"
                    value={charSearch}
                    onChange={(e) => setCharSearch(e.target.value)}
                    placeholder="Buscar personaje..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-red-500 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Grid de personajes en círculos, con nombre, nombre alterno y
                  nombre real (cada línea solo si el personaje la tiene) */}
              {characters.length === 0 ? (
                <p className="text-xs text-zinc-500 py-6 text-center">
                  No hay personajes cargados en el catálogo todavía.
                </p>
              ) : (
                (() => {
                  const query = charSearch.trim().toLowerCase();
                  const filtered = query
                    ? characters.filter((c) =>
                        [c.name, c.name_spanish, c.real_name]
                          .filter(Boolean)
                          .some((field) => String(field).toLowerCase().includes(query)),
                      )
                    : characters;

                  if (filtered.length === 0) {
                    return (
                      <p className="text-xs text-zinc-500 py-6 text-center">
                        Sin resultados para "{charSearch}".
                      </p>
                    );
                  }

                  return (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-3 gap-y-4 max-h-72 overflow-y-auto pr-1">
                      {filtered.map((character) => {
                        const isSelected = selectedCharacters.includes(character.id);
                        const altName =
                          character.name_spanish && character.name_spanish !== character.name
                            ? character.name_spanish
                            : null;
                        return (
                          <button
                            key={character.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedCharacters(selectedCharacters.filter((c) => c !== character.id));
                              } else {
                                setSelectedCharacters([...selectedCharacters, character.id]);
                              }
                            }}
                            className="group flex flex-col items-center gap-1.5 text-center focus:outline-none"
                          >
                            {/* Círculo con la foto */}
                            <div
                              className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 transition-all ${
                                isSelected
                                  ? 'border-red-500 ring-2 ring-red-500/40'
                                  : 'border-zinc-700 group-hover:border-zinc-500'
                              }`}
                            >
                              {character.photo_url ? (
                                <img
                                  src={character.photo_url}
                                  alt={character.name}
                                  loading="lazy"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                  <User className="w-6 h-6 text-zinc-600" />
                                </div>
                              )}
                              {isSelected && (
                                <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                                  <Check className="w-5 h-5 text-white drop-shadow" />
                                </div>
                              )}
                            </div>

                            {/* Nombres (cada uno solo si existe) */}
                            <div className="w-full min-w-0 space-y-0.5">
                              <p className="text-[11px] font-bold text-white truncate leading-tight">
                                {character.name}
                              </p>
                              {altName && (
                                <p className="text-[10px] text-red-400/90 italic truncate leading-tight">
                                  {altName}
                                </p>
                              )}
                              {character.real_name && (
                                <p className="text-[10px] text-zinc-500 truncate leading-tight">
                                  {character.real_name}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        );

      case 'reading-style':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Estilo de Lectura</h3>
              <p className="text-sm text-zinc-400">¿Cómo prefieres leer cómics?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {READING_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedReadingStyle(style.id)}
                  className={`p-6 rounded-2xl border-2 transition-all ${
                    selectedReadingStyle === style.id
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900'
                  }`}
                >
                  <style.icon className={`w-8 h-8 mx-auto mb-3 ${
                    selectedReadingStyle === style.id ? 'text-red-400' : 'text-zinc-500'
                  }`} />
                  <h4 className="font-bold text-white text-sm mb-1">{style.label}</h4>
                  <p className="text-xs text-zinc-400">{style.description}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 text-red-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">¡Configuración Completada!</h3>
              <p className="text-sm text-zinc-400">Tu perfil está listo para usar</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-4">
                <img src={selectedAvatar} alt="Avatar" className="w-16 h-16 rounded-full" />
                <div className="text-left">
                  <p className="font-bold text-white">{username}</p>
                  <p className="text-xs text-zinc-400">
                    {selectedPublishers.length} editoriales • {selectedCharacters.length} personajes
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Configura tu Perfil</h2>
              <p className="text-xs text-zinc-400">Personaliza tu experiencia</p>
            </div>
          </div>
          {currentStep !== 'complete' && (
            <button
              onClick={() => {
                if (!saving && onClose) onClose();
              }}
              title="Omitir por ahora"
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Wizard Steps */}
        {currentStep !== 'complete' && (
          <div className="flex items-center justify-center gap-2 p-4 border-b border-zinc-800">
            {steps.map((step, index) => (
              <button
                key={step.id}
                disabled={index > currentStepIndex}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  currentStep === step.id
                    ? 'bg-red-500 text-zinc-950'
                    : index < currentStepIndex
                      ? 'bg-zinc-800 text-zinc-300'
                      : 'bg-zinc-950 text-zinc-600 cursor-not-allowed'
                }`}
              >
                <step.icon className="w-4 h-4" />
                <span>{step.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        {currentStep !== 'complete' && (
          <div className="flex items-center justify-between p-6 border-t border-zinc-800">
            <button
              onClick={handleBack}
              disabled={currentStepIndex === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <button
              onClick={currentStep === 'reading-style' ? handleComplete : handleNext}
              disabled={saving || (currentStep === 'username' && (!username.trim() || !!usernameError))}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-zinc-950 font-bold text-xs shadow-lg shadow-red-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{saving ? 'Guardando...' : currentStep === 'reading-style' ? 'Completar' : 'Siguiente'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
