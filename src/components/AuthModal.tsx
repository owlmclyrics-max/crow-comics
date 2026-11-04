import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, Sparkles, Terminal, Shield, CheckCircle, UserPlus, LogIn } from 'lucide-react';
import { Modal } from './ui/Modal';
import { GoogleIcon } from './ui/GoogleIcon';

type AuthTab = 'signin' | 'signup' | 'admin';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Vista inicial (por ejemplo 'admin' desde el atajo Ctrl+Shift+A). */
  initialTab?: AuthTab;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialTab = 'signin' }) => {
  const { signIn, signUp, signInWithGoogle, isDemoMode, enableDemoAdmin } = useAuth();
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Al reabrir el modal, restaurar la pestaña inicial
  React.useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, initialTab]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (tab === 'signup') {
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        setLoading(false);
        return;
      }
      const { error: signUpError, needsEmailConfirmation } = await signUp(email, password);
      setLoading(false);

      if (signUpError) {
        setError(signUpError.message);
      } else if (needsEmailConfirmation) {
        setSuccess('¡Cuenta creada! Revisa tu correo para confirmar la cuenta y luego inicia sesión.');
      } else {
        onClose();
      }
      return;
    }

    if (tab === 'admin') {
      const { error: signInError } = await signIn(email, password);
      setLoading(false);

      if (signInError) {
        setError(signInError.message);
      } else {
        onClose();
      }
      return;
    }

    const { error: signInError } = await signIn(email, password);
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
    } else {
      onClose();
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    setSuccess(null);
    const { error: googleError } = await signInWithGoogle();
    setGoogleLoading(false);

    if (googleError) {
      setError(googleError.message);
    }
    // Si es correcto, el navegador redirige a Google (no se cierra el modal).
  };

  const handleDemoAccess = () => {
    enableDemoAdmin();
    onClose();
  };

  // ======================= VISTA: CONSOLA ADMIN =======================
  if (tab === 'admin') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
        <div className="p-6 sm:p-8 space-y-6">
          {/* Cabecera Pro */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-bg border border-line text-accent mb-1 shadow-inner">
              <Terminal className="w-5 h-5 text-accent" />
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-accent">
              <Shield className="w-3.5 h-3.5" />
              <span>PORTAL RESTRINGIDO</span>
            </div>
            <h3 className="text-xl font-bold text-ink tracking-tight">Consola de Gestión</h3>
            <p className="text-xs text-mute">
              Ingreso exclusivo para editores y maquetadores con credenciales autorizadas.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/30 text-accent2 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-accent2" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-mute font-mono">USUARIO_EMAIL</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="editor@crowcomics.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg border border-line focus:border-accent focus:ring-1 focus:ring-accent text-sm text-ink placeholder:text-mute outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-mute font-mono">CLAVE_ACCESO</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg border border-line focus:border-accent focus:ring-1 focus:ring-accent text-sm text-ink placeholder:text-mute outline-none transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent2 text-onaccent font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-lg shadow-accent/20 active:scale-[0.98] disabled:opacity-50 font-mono"
            >
              {loading ? 'AUTENTICANDO...' : 'AUTORIZAR INGRESO'}
            </button>
          </form>

          {isDemoMode && (
            <div className="p-4 rounded-xl bg-bg border border-line space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-accent font-mono">
                <Sparkles className="w-4 h-4" />
                <span>Modo Demostración Activo</span>
              </div>
              <p className="text-[11px] text-mute leading-relaxed">
                Puedes probar la consola administrativa haciendo clic abajo:
              </p>
              <button
                type="button"
                onClick={handleDemoAccess}
                className="w-full py-2 px-3 rounded-lg bg-raised hover:bg-line text-accent text-xs font-semibold transition-colors border border-line"
              >
                Entrar en Modo Prueba
              </button>
            </div>
          )}

          <div className="flex justify-between items-center text-[11px] text-mute pt-2 border-t border-line">
            <span className="font-mono">Atajo: Ctrl + Shift + A</span>
            <button onClick={() => setTab('signin')} className="hover:text-ink transition-colors">
              Volver al acceso de usuarios
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // ======================= VISTA: USUARIOS NORMALES =======================
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <div className="p-6 sm:p-8 space-y-5">
        {/* Cabecera */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent2 text-onaccent shadow-lg shadow-accent/20">
            <LogIn className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h3 className="text-xl font-bold text-ink tracking-tight">
            {tab === 'signin' ? 'Bienvenido de nuevo' : 'Únete a Crow Comics'}
          </h3>
          <p className="text-xs text-mute">
            Guarda tus favoritos, crea listas y sincroniza tu progreso de lectura.
          </p>
        </div>

        {/* Pestañas Entrar / Crear Cuenta */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-bg border border-line">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setError(null);
              setSuccess(null);
            }}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${
              tab === 'signin'
                ? 'bg-accent text-onaccent shadow-md shadow-accent/20'
                : 'text-mute hover:text-ink'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setError(null);
              setSuccess(null);
            }}
            className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'signup'
                ? 'bg-accent text-onaccent shadow-md shadow-accent/20'
                : 'text-mute hover:text-ink'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Crear Cuenta
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/30 text-accent2 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-accent2" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 shrink-0 text-accent" />
            <span>{success}</span>
          </div>
        )}

        {/* Botón principal de Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm transition-all duration-200 shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {googleLoading ? (
            <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <GoogleIcon className="w-4.5 h-4.5" />
          )}
          {googleLoading ? 'Redirigiendo a Google...' : 'Continuar con Google'}
        </button>

        {/* Separador */}
        <div className="flex items-center gap-3">
          <span className="flex-1 h-px bg-line" />
          <span className="text-[10px] font-semibold text-faint uppercase tracking-wider">o con tu correo</span>
          <span className="flex-1 h-px bg-line" />
        </div>

        {/* Formulario Email/Contraseña */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-mute">Correo electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute" />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@correo.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg border border-line focus:border-accent focus:ring-1 focus:ring-accent text-sm text-ink placeholder:text-mute outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-mute">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg border border-line focus:border-accent focus:ring-1 focus:ring-accent text-sm text-ink placeholder:text-mute outline-none transition-all"
              />
            </div>
          </div>

          {tab === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-mute">Confirmar contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repite tu contraseña"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg border border-line focus:border-accent focus:ring-1 focus:ring-accent text-sm text-ink placeholder:text-mute outline-none transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent2 text-onaccent font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-lg shadow-accent/20 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Procesando...' : tab === 'signin' ? 'Entrar' : 'Crear mi cuenta'}
          </button>
        </form>

        <div className="flex justify-end items-center text-[11px] text-mute pt-2 border-t border-line">
          <button onClick={onClose} className="hover:text-ink transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
