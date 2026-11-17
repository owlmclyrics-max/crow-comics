/**
 * AdminsModal (v0.10): gestión de admins y colaboradores.
 *
 * Solo lo ve el owner (rol 'owner' en app_admins). Permite agregar y
 * quitar admins/colaboradores SIN tocar SQL: los cambios valen para la
 * sesión del Navbar (roles), las políticas del bucket pages y el resto.
 * La seguridad real la hace RLS en la base (solo el owner escribe).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Crown, Plus, ShieldCheck, Trash2, UserCog, X } from 'lucide-react';
import { Modal } from './ui/Modal';
import { showToast } from './ui/Toast';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface AdminRow {
  email: string;
  role: 'owner' | 'admin' | 'colaborador';
  created_at: string;
}

const ROLE_LABEL: Record<AdminRow['role'], string> = {
  owner: 'Dueño',
  admin: 'Admin',
  colaborador: 'Colaborador',
};

const ROLE_HINT: Record<AdminRow['role'], string> = {
  owner: 'Gestiona admins y todo el panel',
  admin: 'Todos los poderes del panel',
  colaborador: 'Sube y edita contenido',
};

export const AdminsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'colaborador'>('admin');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
      const db = supabase;
      const { data, error: err } = await db
        .from('app_admins')
        .select('email,role,created_at')
        .order('created_at', { ascending: true });
      if (err) throw new Error(err.message);
      setRows((data ?? []) as AdminRow[]);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer la lista');
    }
  }, []);

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen, load]);

  const myEmail = (user?.email ?? '').toLowerCase();

  const handleAdd = async () => {
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      showToast('Ese email no parece válido', 'error');
      return;
    }
    if (rows?.some((r) => r.email === clean)) {
      showToast('Ese email ya está en la lista', 'error');
      return;
    }
    setBusy(true);
    try {
      if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
      const db = supabase;
      const { error: err } = await db
        .from('app_admins')
        .insert({ email: clean, role, added_by: user?.id ?? null });
      if (err) throw new Error(err.message);
      setEmail('');
      showToast(`${clean} agregado como ${ROLE_LABEL[role]} ✅`, 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo agregar', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (target: string) => {
    if (confirmDelete !== target) {
      setConfirmDelete(target);
      return;
    }
    setConfirmDelete(null);
    setBusy(true);
    try {
      if (!isSupabaseConfigured || !supabase) throw new Error('Supabase no está configurado');
      const db = supabase;
      const { error: err } = await db.from('app_admins').delete().eq('email', target);
      if (err) throw new Error(err.message);
      showToast(`${target} eliminado`, 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo eliminar', 'error');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      {/* Cabecera */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-line">
        <div>
          <h2 className="text-xl font-black text-ink flex items-center gap-2">
            <UserCog className="w-5 h-5 text-accent" />
            Gestión de admins
          </h2>
          <p className="text-xs text-faint mt-0.5">Quién puede subir y administrar la web</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-raised hover:bg-line text-mute hover:text-ink transition-colors"
          aria-label="Cerrar gestión de admins"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        {error && <p className="text-xs text-red-400">{error}</p>}

        {/* Alta */}
        <div className="rounded-xl border border-line bg-bg p-3.5 space-y-3">
          <label className="text-xs font-bold text-ink block" htmlFor="admin-email">
            Agregar por email de Google
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleAdd()}
              placeholder="persona@gmail.com"
              className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-surface border border-line focus:border-accent text-sm text-ink outline-none transition-colors"
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={busy || !email.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent2 text-onaccent text-xs font-bold transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </div>
          {/* Rol: botones segmentados, cero selects nativos */}
          <div className="grid grid-cols-2 gap-1.5">
            {(['admin', 'colaborador'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`px-3 py-2 rounded-xl text-[11px] font-bold text-left transition-colors ${
                  role === r
                    ? 'bg-accent text-onaccent'
                    : 'bg-surface border border-line text-mute hover:text-ink hover:bg-raised'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {r === 'admin' ? (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  ) : (
                    <Crown className="w-3.5 h-3.5 opacity-70" />
                  )}
                  {ROLE_LABEL[r]}
                </span>
                <span className="block text-[9px] font-semibold opacity-80 mt-0.5">
                  {ROLE_HINT[r]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        {rows === null ? (
          <div className="py-8 text-center">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => {
              const isSelf = row.email === myEmail;
              const isOwnerRow = row.role === 'owner';
              return (
                <div
                  key={row.email}
                  className="rounded-xl border border-line bg-bg px-3.5 py-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink truncate flex items-center gap-1.5">
                      {row.email}
                      {isSelf && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/30">
                          Vos
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-mute mt-0.5">
                      {isOwnerRow ? <Crown className="inline w-3 h-3 text-amber-400" /> : null}{' '}
                      {ROLE_HINT[row.role]}
                    </p>
                  </div>
                  {!isOwnerRow && !isSelf && (
                    <button
                      type="button"
                      onClick={() => void handleRemove(row.email)}
                      disabled={busy}
                      className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                        confirmDelete === row.email
                          ? 'bg-red-500 text-white'
                          : 'bg-raised hover:bg-line text-mute hover:text-red-400 border border-line'
                      }`}
                    >
                      <Trash2 className="w-3 h-3" />
                      {confirmDelete === row.email ? '¿Seguro?' : 'Quitar'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-faint leading-relaxed">
          Los cambios valen al instante para subir páginas y al refrescar para el panel. El
          dueño no puede quitarse a sí mismo (evita quedar afuera por accidente).
        </p>
      </div>
    </Modal>,
    document.body,
  );
};
