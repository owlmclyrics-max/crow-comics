import React, { useEffect, useState } from 'react';
import { ArrowLeft, Heart, ShieldAlert } from 'lucide-react';
import type { Comic, Profile } from '../types/comic';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useComics } from '../context/ComicsContext';
import { ComicCard } from './ComicCard';
import { UserBadges } from './UserBadges';

interface PublicProfilePageProps {
  profileId: string;
  onBack: () => void;
  onSelectComic: (comic: Comic) => void;
}

/**
 * Perfil PÚBLICO de otro usuario (se abre desde el buscador de personas).
 * - La fila del perfil es pública por RLS.
 * - Los favoritos llegan desde la RPC get_public_favorites() que respeta
 *   los ajustes de privacidad del dueño (show_favorites).
 * - Vista de solo lectura: nada de edición ni ajustes.
 */
export const PublicProfilePage: React.FC<PublicProfilePageProps> = ({
  profileId,
  onBack,
  onSelectComic,
}) => {
  const { comics } = useComics();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setFavoriteIds(null);

    const run = async () => {
      try {
        if (!isSupabaseConfigured || !supabase) throw new Error('supabase');

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .single();
        if (profileError || !profileData) throw new Error('perfil no encontrado');
        if (cancelled) return;
        setProfile(profileData as Profile);

        // Favoritos del usuario, respetando sus ajustes de privacidad.
        const { data: favData } = await supabase.rpc('get_public_favorites', {
          p_user_id: profileId,
        });
        if (!cancelled) {
          // jsonb: '[]' con ids, o null si el usuario los ocultó.
          setFavoriteIds(Array.isArray(favData) ? (favData as string[]) : null);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [profileId]);

  const favoriteComics = (favoriteIds ?? [])
    .map((id) => comics.find((comic) => comic.id === id))
    .filter((comic): comic is Comic => Boolean(comic));

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-mute">Cargando perfil...</p>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="py-20 text-center rounded-3xl bg-surface/40 border border-line p-8 space-y-4">
        <ShieldAlert className="w-10 h-10 mx-auto text-faint" />
        <h3 className="text-base font-bold text-ink">Perfil no disponible</h3>
        <p className="text-xs text-mute max-w-sm mx-auto">
          Este perfil no existe o no es accesible en este momento.
        </p>
        <button
          onClick={onBack}
          className="text-xs text-accent font-semibold hover:underline"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Encabezado con identidad */}
      <div className="relative rounded-[2rem] border border-accent/25 bg-surface overflow-hidden shadow-2xl">
        <div className="px-5 sm:px-8 pt-8 pb-6 flex flex-col sm:flex-row items-center sm:items-end gap-4">
          <div className="relative shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-4 border-bg shadow-xl bg-raised">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-black text-ink bg-gradient-to-br from-accent to-accent2">
                  {profile.username.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0 text-center sm:text-left space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-black text-ink leading-tight">
              @{profile.username}
            </h2>
            {profile.bio?.trim() && (
              <p className="text-sm text-mute whitespace-pre-line max-w-2xl mx-auto sm:mx-0">
                {profile.bio}
              </p>
            )}
            <p className="text-[11px] text-faint font-semibold">
              Miembro de la comunidad Crow Comics
            </p>
          </div>
        </div>
        <div className="border-t border-line px-5 sm:px-8 py-4 overflow-x-auto">
          <UserBadges profile={profile} />
        </div>
      </div>

      {/* Favoritos públicos */}
      <section className="space-y-4">
        <h3 className="flex items-center gap-2.5 text-xl font-black text-ink">
          <Heart className="w-5 h-5 text-accent" />
          <span>Favoritos de {profile.username}</span>
        </h3>

        {favoriteIds === null ? (
          <div className="py-16 text-center rounded-3xl bg-surface/40 border border-line p-8">
            <ShieldAlert className="w-10 h-10 mx-auto text-faint mb-3" />
            <h4 className="text-base font-bold text-ink">Favoritos privados</h4>
            <p className="text-xs text-mute max-w-sm mx-auto mt-1">
              Este lector prefiere mantener sus favoritos en privado.
            </p>
          </div>
        ) : favoriteComics.length === 0 ? (
          <div className="py-16 text-center rounded-3xl bg-surface/40 border border-line p-8">
            <h4 className="text-base font-bold text-ink">Sin favoritos todavía</h4>
            <p className="text-xs text-mute max-w-sm mx-auto mt-1">
              Aún no marcó ningún cómic como favorito.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {favoriteComics.map((comic) => (
              <ComicCard key={comic.id} comic={comic} onClick={onSelectComic} />
            ))}
          </div>
        )}
      </section>

      {/* Volver al final también (comodidad móvil) */}
      <button
        onClick={onBack}
        className="md:hidden w-full inline-flex justify-center items-center gap-2 px-4 py-3 rounded-xl bg-surface hover:bg-raised text-mute hover:text-ink border border-line transition-colors text-xs font-semibold"
      >
        <ArrowLeft className="w-4 h-4 text-accent" />
        Volver al inicio
      </button>
    </div>
  );
};
