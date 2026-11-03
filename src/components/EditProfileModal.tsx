import React, { useState } from 'react';
import type { Profile } from '../types/comic';
import { X, Save, User } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEFAULT_AVATARS as AVATARS } from '../lib/avatarGallery';
import { AvatarPicker } from './ui/AvatarPicker';

interface EditProfileModalProps {
  isOpen: boolean;
  profile: Profile | null;
  onClose: () => void;
  onSave: (profile: Profile) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  profile,
  onClose,
  onSave
}) => {
  // Hooks ANTES del return anticipado, con valores seguros si profile es null.
  const [username, setUsername] = useState(profile?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || AVATARS[0]);
  const [bio, setBio] = useState(profile?.bio || '');
  const [usernameError, setUsernameError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen || !profile) return null;

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

        if (data && data.id !== profile.id) {
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

  const handleSave = async () => {
    const isValid = await validateUsername(username);
    if (!isValid) return;

    setSaving(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('profiles')
          .update({
            username: username.trim(),
            avatar_url: avatarUrl,
            bio: bio.trim() || null
          })
          .eq('id', profile.id);

        if (error) throw error;

        // Refetch profile
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profile.id)
          .single();

        if (updatedProfile) {
          onSave(updatedProfile as Profile);
          onClose();
        }
      }
    } catch (err) {
      console.error('Error guardando perfil:', err);
      alert('Error al guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Editar Perfil</h2>
              <p className="text-xs text-zinc-400">Actualiza tu información</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Username */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                // Limpiar el error al escribir (evita el botón Guardar bloqueado)
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

          {/* Avatar: galería compartida + modo dev para administrarla */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-300">Avatar</label>
            <AvatarPicker value={avatarUrl} onChange={setAvatarUrl} />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Cuéntanos sobre ti..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-red-500 text-sm text-zinc-100 outline-none resize-none transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
          >
            <span>Cancelar</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !username.trim() || !!usernameError}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-zinc-950 font-bold text-xs shadow-lg shadow-red-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Guardar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
