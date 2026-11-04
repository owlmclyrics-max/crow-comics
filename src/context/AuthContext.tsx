import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '../types/comic';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isCollaborator: boolean;
  canManageContent: boolean;
  loading: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password?: string, asAdmin?: boolean) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; needsEmailConfirmation: boolean }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  enableDemoAdmin: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── SPRINT 4: ADMIN POR CUENTA DE GOOGLE ──
// Ser administrador ya NO depende de un segundo login con email/contraseña
// (eso reemplazaba la sesión de Google y causaba "doble sesión" rara).
// Si tu cuenta de Google está en esta lista, eres admin al iniciar sesión.
const ADMIN_EMAILS = [
  'owlmclyrics@gmail.com',
  // agrega más correos admin aquí (en minúsculas)
];

const COLLABORATOR_EMAILS = [
  'crow.comics.01@gmail.com',
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoAdmin, setIsDemoAdmin] = useState<boolean>(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // Obtener sesión activa al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        void ensureProfile(session.user);
      }
      setLoading(false);
    });

    // Suscripción a cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        void ensureProfile(session.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Garantiza que cada cuenta (Google incluida) tenga su fila en `profiles`.
   * Si la cuenta fue creada ANTES de que existiera la tabla/trigger, no tendrá
   * fila: la creamos al vuelo usando username y avatar de Google. Sin esto, la
   * navbar muestra iniciales del correo y el wizard de onboarding nunca carga.
   */
  const ensureProfile = async (userSession: User) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userSession.id)
        .single();

      if (!error && data) {
        setProfile(data);
        return;
      }

      // No existe fila (o la tabla falló por otra razón distinta a RLS):
      // creamos el perfil con nombre e imagen de Google si están disponibles.
      const meta = (userSession.user_metadata ?? {}) as Record<string, unknown>;
      const metaName = (meta.user_name || meta.name || userSession.email?.split('@')[0] || 'lector') as string;
      const safeName =
        metaName.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 24) || 'lector';
      const googleAvatar = (meta.avatar_url || meta.picture || null) as string | null;

      const { error: insertError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: userSession.id,
            username: safeName,
            avatar_url: googleAvatar,
          },
          { onConflict: 'id' },
        );
      if (insertError) throw insertError;
      await fetchProfile(userSession.id);
    } catch (err) {
      console.error('Error garantizando el perfil:', err);
    }
  };

  const fetchProfile = async (userId: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error cargando perfil:', err);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signIn = async (email: string, password?: string) => {
    if (!isSupabaseConfigured || !supabase) {
      // Modo local simulado para pruebas antes de poner credenciales
      if (email === 'admin@crowcomics.com' && password === 'admin123') {
        setIsDemoAdmin(true);
        return { error: null };
      }
      return { error: new Error('Credenciales demo inválidas. Usa: admin@crowcomics.com / admin123') };
    }

    if (!password) {
      return { error: new Error('La contraseña es requerida') };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('El registro requiere Supabase configurado. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'), needsEmailConfirmation: false };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    // Si la confirmación por email está activada, no hay sesión y el usuario
    // recibirá un correo de verificación ("needsEmailConfirmation" para el mensaje).
    const needsEmailConfirmation = !error && !data.session && data.user?.identities?.length === 0;

    return {
      error: error ? new Error(error.message) : null,
      needsEmailConfirmation: Boolean(needsEmailConfirmation || (!error && !data.session)),
    };
  };

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('El inicio con Google requiere Supabase configurado. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.') };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    return { error: error ? new Error(error.message) : null };
    // Nota: en OAuth el usuario es redirigido a Google; el retorno a la app
    // lo detecta supabase-js gracias a detectSessionInUrl: true (ya configurado).
  };

  const signOut = async () => {
    setIsDemoAdmin(false);
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
  };

  const enableDemoAdmin = () => {
    setIsDemoAdmin(true);
  };

  // ── Roles ──
  // ADMIN: la cuenta de Google está en ADMIN_EMAILS (sin segundo login).
  // Demo: sin Supabase configurado, consola demo.
  const isAdmin = isDemoAdmin || ADMIN_EMAILS.includes((user?.email ?? '').toLowerCase());
  const isCollaborator = !isAdmin && COLLABORATOR_EMAILS.includes((user?.email ?? '').toLowerCase());
  const canManageContent = isAdmin || isCollaborator;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isCollaborator,
        canManageContent,
        loading,
        isDemoMode: !isSupabaseConfigured,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        enableDemoAdmin,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
